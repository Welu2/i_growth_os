import { afterEach, describe, expect, it, vi } from 'vitest';
import { runLiveChecks } from '../scripts/test-live.mjs';
import worker, { type Env } from '../worker/index';
import type { GrowthState } from '../src/domain/model';
const config = { frontend: { VITE_SUPABASE_URL: 'https://project.supabase.co', VITE_SUPABASE_ANON_KEY: 'sb_publishable_fixture', VITE_API_URL: 'http://localhost:8787' }, worker: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_fixture', GEMINI_API_KEY: 'private-gemini', GEMINI_MODEL: 'test-model', YOUTUBE_API_KEY: 'private-youtube' } };
afterEach(() => vi.unstubAllGlobals());
function fixture({ aiFailure = false, leak = false, cleanupFailure = false, ambiguousCreate = false } = {}) {
  const users = new Map<string, { id: string; email: string; password: string }>();
  const tokens = new Map<string, string>();
  const documents = new Map<string, { state: GrowthState; revision: number }>();
  let aiCalls = 0, searches = 0;
  const env: Env = { ...config.worker, ALLOWED_ORIGIN: 'http://localhost:4173' };
  const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = new URL(String(input));
    if (url.origin === 'http://localhost:8787') return worker.fetch(new Request(url, init), env);
    const headers = new Headers(init?.headers);
    const privileged = headers.get('apikey') === config.worker.SUPABASE_SERVICE_ROLE_KEY && !headers.has('Authorization');
    const owner = tokens.get((headers.get('authorization') ?? '').replace('Bearer ', ''));
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const method = init?.method ?? 'GET';
    if (url.pathname === '/auth/v1/admin/users' && method === 'POST') {
      expect(privileged).toBe(true); expect(body.email_confirm).toBe(true); expect(body.email).toMatch(/@example.invalid$/);
      const id = crypto.randomUUID(); users.set(id, { ...body, id });
      if (ambiguousCreate) throw new Error('Connection lost with sensitive credentials');
      return Response.json({ id });
    }
    if (url.pathname.startsWith('/auth/v1/admin/users/')) {
      expect(privileged).toBe(true); const id = url.pathname.split('/').at(-1)!;
      if (method === 'DELETE') {
        if (cleanupFailure) return Response.json({}, { status: 503 });
        users.delete(id); documents.delete(id); return Response.json({});
      }
      return users.has(id) ? Response.json({ id }) : Response.json({}, { status: 404 });
    }
    if (url.pathname === '/auth/v1/token') {
      const user = [...users.values()].find((u) => u.email === body.email && u.password === body.password);
      if (!user) return Response.json({}, { status: 400 });
      const token = 'session-' + crypto.randomUUID(); tokens.set(token, user.id); return Response.json({ user: { id: user.id }, access_token: token });
    }
    if (url.pathname === '/auth/v1/user') return owner && users.has(owner) ? Response.json({ id: owner }) : Response.json({}, { status: 401 });
    if (url.pathname === '/rest/v1/growth_documents') {
      const id = url.searchParams.get('owner_id')?.replace('eq.', '') ?? '';
      if (method === 'PATCH') return Response.json({}, { status: 403 });
      const doc = documents.get(id);
      if (!doc || (!privileged && owner !== id && !leak)) return Response.json([]);
      return Response.json(url.searchParams.get('select') === 'owner_id' ? [{ owner_id: id }] : [doc]);
    }
    if (url.pathname.endsWith('/commit_growth_document')) {
      if (!privileged) return Response.json({}, { status: 403 });
      const current = documents.get(body.p_owner);
      if ((current?.revision ?? 0) !== body.p_expected_revision) return Response.json(false);
      documents.set(body.p_owner, { revision: body.p_expected_revision + 1, state: body.p_state }); return Response.json(true);
    }
    if (/reserve_growth_budget|claim_growth_ai_slot|release_growth_ai_slot/.test(url.pathname)) { expect(privileged).toBe(true); return Response.json(true); }
    if (url.hostname === 'generativelanguage.googleapis.com') {
      aiCalls++;
      return aiFailure ? Response.json({}, { status: 503 }) : Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ title: 'Practice', message: 'Make a small sketch.', steps: ['Draw a circle.'] }) }] } }] });
    }
    if (url.hostname === 'www.googleapis.com') { searches++; return Response.json({ items: [{ id: { videoId: 'dQw4w9WgXcQ' }, snippet: { title: 'Test resource', channelTitle: 'Test creator' } }] }); }
    throw new Error('Unexpected fixture request');
  });
  vi.stubGlobal('fetch', fetcher);
  return { fetcher, users, documents, stats: () => ({ aiCalls, searches }) };
}
const ready = async () => [];
describe('live verification orchestration (simulated external services)', () => {
  it('creates nothing when setup is blocked', async () => {
    const fetcher = vi.fn();
    const result = await runLiveChecks(config, { fetcher, preflight: async () => [{ name: 'Server credential', status: 'blocked' }], report: vi.fn() });
    expect(result.ok).toBe(false); expect(fetcher).not.toHaveBeenCalled();
  });
  it('exercises the real Worker and cleans up only the generated accounts', async () => {
    const f = fixture(); const report = vi.fn();
    const existing = crypto.randomUUID(); f.users.set(existing, { id: existing, email: 'existing@example.invalid', password: 'existing' });
    const result = await runLiveChecks(config, { fetcher: f.fetcher, preflight: ready, report });
    expect(result.ok, result.failure).toBe(true); expect(result.results).toHaveLength(9);
    expect([...f.users.keys()]).toEqual([existing]); expect(f.documents.size).toBe(0);
    expect(f.stats()).toEqual({ aiCalls: 1, searches: 1 });
    expect(JSON.stringify(report.mock.calls)).not.toMatch(/sb_secret_fixture|private-gemini|private-youtube|session-/);
  });
  it('removes temporary accounts after an AI failure without retrying generation', async () => {
    const f = fixture({ aiFailure: true });
    const result = await runLiveChecks(config, { fetcher: f.fetcher, preflight: ready, report: vi.fn() });
    expect(result.ok).toBe(false); expect(f.users.size).toBe(0); expect(f.documents.size).toBe(0); expect(f.stats().aiCalls).toBe(1);
  });
  it('stops before provider calls if another account can read private data', async () => {
    const f = fixture({ leak: true });
    const result = await runLiveChecks(config, { fetcher: f.fetcher, preflight: ready, report: vi.fn() });
    expect(result.failure).toContain('Another account'); expect(f.users.size).toBe(0); expect(f.stats().aiCalls).toBe(0);
  });
  it('reports cleanup failure as incomplete verification', async () => {
    const f = fixture({ aiFailure: true, cleanupFailure: true }); const report = vi.fn();
    const result = await runLiveChecks(config, { fetcher: f.fetcher, preflight: ready, report });
    expect(result.ok).toBe(false); expect(result.cleanupIds).toHaveLength(2);
    expect(report.mock.calls.some(([line]) => line.startsWith('CLEANUP REQUIRED'))).toBe(true);
  });
  it('identifies an ambiguous account creation without leaking credentials', async () => {
    const f = fixture({ ambiguousCreate: true }); const report = vi.fn();
    const result = await runLiveChecks(config, { fetcher: f.fetcher, preflight: ready, report });
    expect(result.ok).toBe(false); expect(result.unconfirmedCreation).toBe(true);
    expect(report.mock.calls.some(([line]) => line.startsWith('CHECK CREATION'))).toBe(true);
    expect(JSON.stringify(report.mock.calls)).not.toMatch(/sensitive credentials|sb_secret_fixture/);
  });
});
