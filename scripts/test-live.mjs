import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { z } from 'zod';
import { checkServices, readConfig } from './check-services.mjs';

const uuid = z.string().uuid();
const draftSchema = z.object({ title: z.string().min(1).max(160), message: z.string().min(1).max(2000), steps: z.array(z.string().min(1).max(160)).min(1).max(5) });
function assert(condition, message) { if (!condition) throw new Error(message); }
function endpoint(value, allowLocal = false) {
  const url = new URL(value);
  assert(!url.username && !url.password && !url.search && !url.hash && url.pathname === '/', 'Use an API origin without credentials, paths, or query parameters.');
  assert(url.protocol === 'https:' || (allowLocal && url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)), 'Use HTTPS for remote services; HTTP is allowed only on loopback.');
  return url.origin;
}

/** Invoked explicitly; never runs as part of npm test or a build. */
export async function runLiveChecks(config, { fetcher = fetch, preflight = checkServices, report = console.log, origin = 'http://localhost:4173' } = {}) {
  const created = new Set();
  const results = [];
  let failure = '', admin, base, run, unconfirmedCreation = false;
  const at = Date.now();
  const pass = (name) => { results.push(name); report(`PASS ${name}`); };
  const command = (action) => ({ id: randomUUID(), at, action });
  async function request(url, { method = 'GET', headers = {}, body } = {}) {
    let response;
    try { response = await fetcher(url, { method, headers: { ...headers, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(30_000), cache: 'no-store' }); }
    catch { throw new Error('Network request failed or timed out. No response body or credential was logged.'); }
    let data = null;
    if (response.ok && response.status !== 204) { try { data = await response.json(); } catch { throw new Error('Service returned invalid JSON.'); } }
    return { response, data };
  }
  async function requireRequest(label, url, options) {
    const result = await request(url, options);
    assert(result.response.ok, `${label} failed (HTTP ${result.response.status}).`);
    return result;
  }
  try {
    const checks = await preflight(config, fetcher);
    const blocked = checks.filter((c) => c.status === 'blocked');
    assert(!blocked.length, `Setup incomplete: ${blocked.map((c) => c.name).join(', ')}. Run npm run check:services.`);
    base = endpoint(config.worker.SUPABASE_URL);
    assert(base === endpoint(config.frontend.VITE_SUPABASE_URL), 'Frontend and Worker Supabase projects differ.');
    const api = endpoint(config.frontend.VITE_API_URL, true);
    origin = endpoint(origin, true);
    const key = config.worker.SUPABASE_SERVICE_ROLE_KEY;
    assert(Boolean(key), 'Server credential is missing.');
    admin = { apikey: key, ...(key.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${key}` }) };
    const pub = { apikey: config.frontend.VITE_SUPABASE_ANON_KEY };
    const health = await requireRequest('Worker health', `${api}/health`, { headers: { Origin: origin } });
    assert(health.data?.protocol === 4 && health.data.cloud && health.data.ai, 'Worker is not configured for protocol 4, cloud, and AI.');
    assert(health.response.headers.get('Access-Control-Allow-Origin') === origin, 'Worker CORS does not match the application origin.');
    pass('Worker configuration and CORS');
    run = randomUUID();
    report(`RUN temporary account marker ${run}`);
    async function makeAccount(index) {
      const email = `growth-check-${run}-${index}@example.invalid`, password = randomBytes(32).toString('base64url');
      unconfirmedCreation = true;
      const result = await requireRequest('Create temporary account', `${base}/auth/v1/admin/users`, { method: 'POST', headers: admin, body: { email, password, email_confirm: true, app_metadata: { growth_verification: run } } });
      const id = uuid.parse(result.data?.id); created.add(id); unconfirmedCreation = false;
      const signIn = async () => {
        const login = await requireRequest('Test account sign-in', `${base}/auth/v1/token?grant_type=password`, { method: 'POST', headers: pub, body: { email, password } });
        assert(login.data?.user?.id === id && typeof login.data.access_token === 'string', 'Sign-in returned an unexpected account.');
        return login.data.access_token;
      };
      return { id, token: await signIn(), signIn };
    }
    const a = await makeAccount(1), b = await makeAccount(2);
    const secondToken = await a.signIn();
    pass('Two disposable accounts and independent sign-in sessions');
    const userHeaders = (token) => ({ ...pub, Authorization: `Bearer ${token}` });
    async function appRequest(token, path, body, method) {
      return requireRequest('Application request', `${api}${path}`, { method: method ?? (body === undefined ? 'GET' : 'POST'), headers: { Authorization: `Bearer ${token}`, Origin: origin }, body });
    }
    async function sync(token, commands = []) {
      const { data } = await appRequest(token, '/sync', { protocol: 4, commands });
      assert(data?.protocol === 4 && Array.isArray(data.accepted) && Array.isArray(data.rejected) && Array.isArray(data.state?.ledger), 'Sync response did not match protocol 4.');
      return data;
    }
    const onboard = command({ type: 'onboard', profile: { name: 'Integration check', companionName: 'Test sprout', companionType: 'seedling', timezone: 'UTC' }, goal: 'Complete test practice', habit: 'Test daily habit' });
    let result = await sync(a.token, [onboard]);
    assert(result.accepted.includes(onboard.id), 'Onboarding was not accepted.');
    const practiceId = randomUUID();
    const complete = command({ type: 'habit.complete', id: onboard.id });
    result = await sync(a.token, [complete, command({ type: 'goal.complete', id: onboard.id }), command({ type: 'exercise.add', id: practiceId, title: 'Test practice' }), command({ type: 'exercise.complete', id: practiceId })]);
    assert(result.rejected.length === 0, 'Test progress was rejected.');
    await sync(secondToken, [complete, command(complete.action)]);
    const [first, second] = await Promise.all([sync(a.token), sync(secondToken)]);
    const sum = (state, field) => state.ledger.reduce((n, row) => n + row[field], 0);
    assert(sum(first.state, 'coins') === 30 && sum(first.state, 'xp') === 105, 'Rewards were missing or duplicated.');
    assert(JSON.stringify(first.state) === JSON.stringify(second.state), 'Independent sessions did not converge.');
    pass('Shared-account synchronization and duplicate reward protection');
    await Promise.all([sync(a.token, [command({ type: 'wallet.buy', item: 'fern' })]), sync(secondToken, [command({ type: 'wallet.buy', item: 'fern' })])]);
    result = await sync(a.token);
    assert(sum(result.state, 'coins') === 0 && result.state.inventory.filter((id) => id === 'fern').length === 1, 'Concurrent purchase duplicated inventory or spending.');
    pass('Concurrent wallet purchase');
    const foreign = await requireRequest('Cross-account read', `${base}/rest/v1/growth_documents?owner_id=eq.${a.id}&select=owner_id`, { headers: userHeaders(b.token) });
    assert(Array.isArray(foreign.data) && foreign.data.length === 0, 'Another account could read the test document.');
    const own = await requireRequest('Owner read', `${base}/rest/v1/growth_documents?owner_id=eq.${a.id}&select=owner_id`, { headers: userHeaders(a.token) });
    assert(own.data?.length === 1 && own.data[0].owner_id === a.id, 'Owner cannot read their document.');
    const write = await request(`${base}/rest/v1/growth_documents?owner_id=eq.${a.id}`, { method: 'PATCH', headers: userHeaders(b.token), body: { revision: 999 } });
    assert([401, 403].includes(write.response.status), 'Direct document writes were not denied.');
    const rpc = await request(`${base}/rest/v1/rpc/commit_growth_document`, { method: 'POST', headers: userHeaders(b.token), body: { p_owner: a.id, p_expected_revision: 999, p_state: {} } });
    assert([401, 403].includes(rpc.response.status), 'Privileged commit RPC was accessible to an ordinary user.');
    assert((await sync(b.token)).state.profile === null, 'The second account inherited another account’s state.');
    pass('Account isolation and restricted direct writes');
    const resourceId = randomUUID();
    await sync(a.token, [command({ type: 'resource.add', id: resourceId, title: 'Test resource', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }), command({ type: 'resource.notes', id: resourceId, revision: 0, notes: 'First test draft' })]);
    const conflicting = command({ type: 'resource.notes', id: resourceId, revision: 0, notes: 'Concurrent test draft' });
    result = await sync(secondToken, [conflicting]);
    assert(result.rejected.some((r) => r.id === conflicting.id) && result.state.resources.find((r) => r.id === resourceId)?.notes === 'First test draft', 'A stale notes edit overwrote the accepted draft.');
    pass('Concurrent notes conflict');
    const ai = await appRequest(a.token, '/assistant', { topic: 'Practice drawing a simple circle on paper', minutes: 5, mode: 'next-step' });
    const draft = draftSchema.parse(ai.data);
    assert(!/https?:\/\/|www\./i.test(JSON.stringify(draft)), 'AI returned unverified links.');
    pass('Genuine structured AI draft through the authenticated Worker');
    if (config.worker.YOUTUBE_API_KEY) {
      const search = await appRequest(a.token, '/youtube/search', { query: 'beginner pencil drawing' });
      assert(Array.isArray(search.data?.results) && search.data.results.length > 0 && search.data.results.length <= 5, 'Search returned no verifiable results.');
      assert(search.data.results.every((r) => /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(r.url)), 'Search returned an unexpected resource URL.');
      pass('Authenticated YouTube discovery');
    } else report('SKIP YouTube discovery: optional key absent.');
    const after = await sync(a.token);
    assert(sum(after.state, 'coins') === 0 && sum(after.state, 'xp') === 105, 'AI or video discovery changed rewards.');
    await appRequest(a.token, '/account', undefined, 'DELETE');
    const deletion = await request(`${base}/auth/v1/admin/users/${a.id}`, { headers: admin });
    assert(deletion.response.status === 404, 'Account deletion could not be verified.');
    created.delete(a.id);
    const retained = await requireRequest('Cascaded data deletion', `${base}/rest/v1/growth_documents?owner_id=eq.${a.id}&select=owner_id`, { headers: admin });
    assert(Array.isArray(retained.data) && retained.data.length === 0, 'Deleted account retained its cloud document.');
    pass('Account deletion and cascading data removal');
  } catch (error) {
    // Errors from validators or third-party responses are intentionally not printed.
    failure = error instanceof z.ZodError ? 'Live response failed validation.' : error instanceof Error && !/https?:\/\/|Bearer|sb_secret_|eyJ/.test(error.message) ? error.message : 'Live verification failed.';
    report(`FAIL ${failure}`);
  } finally {
    for (const id of created) {
      try {
        const result = await request(`${base}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: admin });
        assert(result.response.ok || result.response.status === 404, 'Cleanup failed.');
        created.delete(id);
      } catch { report(`CLEANUP REQUIRED: temporary test account ${id}. Delete only this test account in Supabase Auth.`); }
    }
  }
  if (unconfirmedCreation) report(`CHECK CREATION: a creation response was not confirmed. Inspect only accounts tagged with growth_verification ${run}.`);
  if (created.size) failure ||= 'Some temporary test accounts could not be removed.';
  if (!created.size && results.length > 1) report('Temporary accounts with confirmed IDs were removed. Global quota counters may remain until normal expiry.');
  return { ok: !failure, results, failure, cleanupIds: [...created], unconfirmedCreation };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const config = await readConfig(fileURLToPath(new URL('..', import.meta.url)));
    const result = await runLiveChecks(config, { origin: process.env.LIVE_APP_ORIGIN || 'http://localhost:4173' });
    process.exitCode = result.ok ? 0 : 1;
  } catch { console.error('Live checks could not start. Inspect configuration; no secret values were logged.'); process.exitCode = 1; }
}
