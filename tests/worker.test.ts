import { afterEach, describe, expect, it, vi } from 'vitest';
import worker, { type Env } from '../worker/index';
import { initialState, type Command } from '../src/domain/model';
const user = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env: Env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'server-secret', ALLOWED_ORIGIN: 'https://growth.example', GEMINI_API_KEY: 'provider-secret', GEMINI_MODEL: 'test-model' };
const request = (path: string, body?: unknown, headers: Record<string, string> = {}) => new Request(`https://api.example${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { Origin: env.ALLOWED_ORIGIN, Authorization: 'Bearer user-token', 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(path === '/sync' ? { protocol: 4, ...(body as object) } : body) });
afterEach(() => vi.unstubAllGlobals());
function mockServices({ quota = true, draft = { title: 'Start small', message: 'Choose a simple exercise.', steps: ['Draw a circle.'] } }: { quota?: boolean; draft?: unknown } = {}) {
  let state = initialState(), revision = 0;
  const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: user });
    if (url.includes('claim_growth_ai_slot')) return Response.json(true);
    if (url.includes('release_growth_ai_slot')) return Response.json(null);
    if (url.includes('reserve_growth_budget')) return Response.json(quota);
    if (url.includes('/growth_documents?')) return Response.json(revision ? [{ state, revision }] : []);
    if (url.includes('commit_growth_document')) { const body = JSON.parse(String(init?.body)); if (body.p_expected_revision !== revision) return Response.json(false); state = body.p_state; revision++; return Response.json(true); }
    if (url.includes('generativelanguage.googleapis.com')) return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(draft) }] }, finishReason: 'STOP' }] });
    throw new Error(`Unexpected test URL: ${url}`);
  });
  vi.stubGlobal('fetch', fetcher); return fetcher;
}
describe('backend boundaries', () => {
  it('rejects wrong origins and missing authorization before provider calls', async () => {
    const fetcher = mockServices();
    expect((await worker.fetch(request('/assistant', {}, { Origin: 'https://evil.example' }), env)).status).toBe(403);
    expect((await worker.fetch(request('/assistant', {}, { Authorization: '' }), env)).status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('validates request size and schema', async () => {
    mockServices();
    expect((await worker.fetch(request('/assistant', { topic: 'x'.repeat(1_000_001) }), env)).status).toBe(413);
    expect((await worker.fetch(request('/assistant', { topic: 'x', minutes: -1, mode: 'bad' }), env)).status).toBe(400);
  });
  it('returns valid AI drafts without exposing secrets and reserves quota before calling the provider', async () => {
    const fetcher = mockServices();
    const result = await worker.fetch(request('/assistant', { topic: 'Drawing', minutes: 15, mode: 'learning-plan' }), env);
    expect(result.status).toBe(200); const text = await result.text(); expect(text).toContain('Draw a circle'); expect(text).not.toContain('secret');
    const urls = fetcher.mock.calls.map((args) => String(args[0])); expect(urls.findIndex((u) => u.includes('reserve_growth_budget'))).toBeLessThan(urls.findIndex((u) => u.includes('generativelanguage')));
  });
  it('never calls AI when the application budget is exhausted', async () => {
    const fetcher = mockServices({ quota: false });
    expect((await worker.fetch(request('/assistant', { topic: 'Drawing', minutes: 15, mode: 'next-step' }), env)).status).toBe(429);
    expect(fetcher.mock.calls.some((args) => String(args[0]).includes('generativelanguage'))).toBe(false);
  });
  it('rejects malformed AI drafts and invented links', async () => {
    mockServices({ draft: { title: 'Oops', message: 'Oops', steps: [] } });
    expect((await worker.fetch(request('/assistant', { topic: 'Drawing', minutes: 15, mode: 'next-step' }), env)).status).not.toBe(200);
    mockServices({ draft: { title: 'Oops', message: 'Visit https://evil.example', steps: ['Go there'] } });
    expect((await worker.fetch(request('/assistant', { topic: 'Drawing', minutes: 15, mode: 'next-step' }), env)).status).toBe(502);
  });
  it('replays accepted commands once and rejects unknown or future operations', async () => {
    mockServices();
    const command: Command = { id: crypto.randomUUID(), at: Date.now(), action: { type: 'onboard', profile: { name: 'Ada', companionName: 'Babu', companionType: 'panda', timezone: 'UTC' }, goal: 'Draw', habit: 'Sketch' } };
    let result = await worker.fetch(request('/sync', { commands: [command] }), env); expect(result.status).toBe(200);
    result = await worker.fetch(request('/sync', { commands: [command] }), env); const body = await result.json() as { state: { goals: unknown[] } }; expect(body.state.goals).toHaveLength(1);
    const future = { ...command, id: crypto.randomUUID(), at: Date.now() + 86_400_000 };
    const invalid = await (await worker.fetch(request('/sync', { commands: [future] }), env)).json() as { rejected: unknown[] }; expect(invalid.rejected).toHaveLength(1);
    expect((await worker.fetch(request('/sync', { commands: [{ ...command, action: { type: 'wallet.credit', amount: 10000 } }] }), env)).status).toBe(400);
  });
});

describe('resource ownership and protocol compatibility', () => {
  it.each([1, 2, 3])('rejects a protocol-%s client without consuming sync quota or mutating state', async (protocol) => {
    const fetcher = mockServices();
    const result = await worker.fetch(request('/sync', { protocol, commands: [] }), env);
    expect(result.status).toBe(426);
    expect(fetcher.mock.calls.some(([url]) => String(url).includes('commit_growth') || String(url).includes('reserve_growth'))).toBe(false);
  });
  it('rejects missing or other-account resources before any AI request', async () => {
    const fetcher = mockServices();
    const result = await worker.fetch(request('/assistant', { topic: 'Draw', minutes: 15, mode: 'learning-plan', resourceId: crypto.randomUUID() }), env);
    expect(result.status).toBe(400);
    expect(fetcher.mock.calls.some(([url]) => String(url).includes('generativelanguage'))).toBe(false);
    expect(fetcher.mock.calls.some(([url]) => String(url).includes('owner_id=eq.' + user))).toBe(true);
  });
  it('sends only selected context, never automatically saved private notes', async () => {
    const fetcher = mockServices();
    const resourceId = crypto.randomUUID();
    const command: Command = { id: crypto.randomUUID(), at: Date.now(), action: { type: 'resource.add', id: resourceId, title: 'A public lesson', url: 'https://youtu.be/dQw4w9WgXcQ' } };
    await worker.fetch(request('/sync', { commands: [command, { id: crypto.randomUUID(), at: Date.now(), action: { type: 'resource.notes', id: resourceId, notes: 'PRIVATE NOT FOR AI', revision: 0 } }] }), env);
    const result = await worker.fetch(request('/assistant', { topic: 'Draw', minutes: 15, mode: 'learning-plan', resourceId }), env);
    expect(result.status).toBe(200);
    const call = fetcher.mock.calls.find(([url]) => String(url).includes('generativelanguage'));
    expect(call?.[1]?.body).toContain('A public lesson');
    expect(call?.[1]?.body).not.toContain('PRIVATE NOT FOR AI');
  });
});
