-- Pilot storage: one bounded, versioned document per user. The Worker validates
-- commands using the shared domain handler; CAS serializes concurrent devices.
create table public.growth_documents (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 1 check (revision > 0),
  state jsonb not null check (jsonb_typeof(state) = 'object' and octet_length(state::text) <= 2000000),
  updated_at timestamptz not null default now()
);
alter table public.growth_documents enable row level security;
revoke all on public.growth_documents from anon, authenticated;
grant select on public.growth_documents to authenticated;
grant all on public.growth_documents to service_role;
create policy "Owners can read their document" on public.growth_documents for select to authenticated using ((select auth.uid()) = owner_id);

create table public.growth_budgets (
  day date not null,
  bucket text not null,
  count integer not null check (count >= 0),
  primary key (day, bucket)
);
alter table public.growth_budgets enable row level security;
revoke all on public.growth_budgets from anon, authenticated;
grant all on public.growth_budgets to service_role;

create or replace function public.commit_growth_document(p_owner uuid, p_expected_revision bigint, p_state jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare changed integer;
begin
  if p_expected_revision = 0 then
    insert into public.growth_documents(owner_id, revision, state) values (p_owner, 1, p_state)
      on conflict (owner_id) do nothing;
  else
    update public.growth_documents set revision = revision + 1, state = p_state, updated_at = now()
      where owner_id = p_owner and revision = p_expected_revision;
  end if;
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;
revoke all on function public.commit_growth_document(uuid, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.commit_growth_document(uuid, bigint, jsonb) to service_role;

create or replace function public.reserve_growth_budget(p_user uuid, p_kind text, p_user_limit integer, p_global_limit integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  today date := (now() at time zone 'UTC')::date;
  user_bucket text := p_kind || ':user:' || p_user::text;
  global_bucket text := p_kind || ':global';
  user_count integer; global_count integer;
begin
  if p_kind not in ('ai', 'sync', 'youtube') or p_user_limit < 1 or p_global_limit < 1 then
    raise exception 'Invalid budget configuration';
  end if;
  -- One transaction lock per capability serializes global + individual reservation.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('growth-budget:' || p_kind, 0));
  delete from public.growth_budgets where day < today - 2;
  insert into public.growth_budgets(day, bucket, count) values (today, user_bucket, 0), (today, global_bucket, 0) on conflict do nothing;
  select count into user_count from public.growth_budgets where day = today and bucket = user_bucket;
  select count into global_count from public.growth_budgets where day = today and bucket = global_bucket;
  if user_count >= p_user_limit or global_count >= p_global_limit then return false; end if;
  update public.growth_budgets set count = count + 1 where day = today and bucket in (user_bucket, global_bucket);
  return true;
end;
$$;
revoke all on function public.reserve_growth_budget(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_growth_budget(uuid, text, integer, integer) to service_role;


create table public.growth_ai_slots (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  request_id uuid not null,
  expires_at timestamptz not null
);
alter table public.growth_ai_slots enable row level security;
revoke all on public.growth_ai_slots from anon, authenticated;
grant all on public.growth_ai_slots to service_role;

create or replace function public.claim_growth_ai_slot(p_owner uuid, p_request uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('growth-ai-slots', 0));
  delete from public.growth_ai_slots where expires_at < now();
  if exists(select 1 from public.growth_ai_slots where owner_id = p_owner)
     or (select count(*) from public.growth_ai_slots) >= 4 then return false; end if;
  insert into public.growth_ai_slots values(p_owner, p_request, now() + interval '30 seconds');
  return true;
end;
$$;
revoke all on function public.claim_growth_ai_slot(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_growth_ai_slot(uuid, uuid) to service_role;

create or replace function public.release_growth_ai_slot(p_owner uuid, p_request uuid)
returns void language sql security invoker set search_path = '' as $$
  delete from public.growth_ai_slots where owner_id = p_owner and request_id = p_request;
$$;
revoke all on function public.release_growth_ai_slot(uuid, uuid) from public, anon, authenticated;
grant execute on function public.release_growth_ai_slot(uuid, uuid) to service_role;
