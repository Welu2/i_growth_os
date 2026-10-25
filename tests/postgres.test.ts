import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initialState } from '../src/domain/model';
const pg = new PGlite();
const userA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const userB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
beforeAll(async () => {
  await pg.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, service_role;
    insert into auth.users values ('${userA}'), ('${userB}');`);
  await pg.exec(await readFile('supabase/migrations/202610130001_growth.sql', 'utf8'));
}, 30000);
afterAll(async () => { await pg.close(); });
describe('PostgreSQL account isolation and transactional operations', () => {
  it('serializes updates with compare-and-swap', async () => {
    const result = await pg.query<{ committed: boolean }>('select public.commit_growth_document($1, 0, $2) as committed', [userA, JSON.stringify(initialState())]);
    expect(result.rows[0].committed).toBe(true);
    const first = await pg.query<{ committed: boolean }>('select public.commit_growth_document($1, 1, $2) as committed', [userA, JSON.stringify(initialState())]);
    const stale = await pg.query<{ committed: boolean }>('select public.commit_growth_document($1, 1, $2) as committed', [userA, JSON.stringify(initialState())]);
    expect(first.rows[0].committed).toBe(true); expect(stale.rows[0].committed).toBe(false);
  });
  it('prevents authenticated users from reading or modifying another account', async () => {
    await pg.query('select public.commit_growth_document($1, 0, $2)', [userB, JSON.stringify(initialState())]);
    await pg.exec(`set role authenticated; set request.jwt.claim.sub = '${userA}';`);
    try {
      const result = await pg.query<{ owner_id: string }>('select owner_id from public.growth_documents');
      expect(result.rows.map((r) => r.owner_id)).toEqual([userA]);
      await expect(pg.query('update public.growth_documents set revision = 999')).rejects.toThrow('permission denied');
      await expect(pg.query('select public.commit_growth_document($1, 2, $2)', [userB, JSON.stringify(initialState())])).rejects.toThrow('permission denied');
      await expect(pg.query('select * from public.growth_budgets')).rejects.toThrow('permission denied');
    } finally { await pg.exec('reset role;'); }
  });
  it('enforces both user and global AI budgets', async () => {
    const reserve = async (user: string) => (await pg.query<{ ok: boolean }>("select public.reserve_growth_budget($1, 'ai', 2, 3) as ok", [user])).rows[0].ok;
    expect(await reserve(userA)).toBe(true); expect(await reserve(userA)).toBe(true); expect(await reserve(userA)).toBe(false);
    expect(await reserve(userB)).toBe(true); expect(await reserve(userB)).toBe(false);
  });
  it('limits simultaneous AI calls and releases an expiring slot', async () => {
    const one = crypto.randomUUID(), two = crypto.randomUUID();
    const claim = async (requestId: string) => (await pg.query<{ ok: boolean }>('select public.claim_growth_ai_slot($1, $2) as ok', [userA, requestId])).rows[0].ok;
    expect(await claim(one)).toBe(true); expect(await claim(two)).toBe(false);
    await pg.query('select public.release_growth_ai_slot($1, $2)', [userA, one]); expect(await claim(two)).toBe(true);
  });
  it('deletes stored account progress when the auth user is removed', async () => {
    await pg.query('delete from auth.users where id = $1', [userB]);
    expect((await pg.query('select * from public.growth_documents where owner_id = $1', [userB])).rows).toHaveLength(0);
  });
});
