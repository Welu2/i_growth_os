import { describe, expect, it, vi } from 'vitest';
import { adminHeaders } from '../worker/supabase';
import { checkServices } from '../scripts/check-services.mjs';
import worker, { type Env } from '../worker/index';
const config = { frontend: { VITE_SUPABASE_URL: 'https://project.supabase.co', VITE_SUPABASE_ANON_KEY: 'sb_publishable_public-fixture' }, worker: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_private-fixture' } };
describe('server key compatibility', () => {
  it('uses a secret key only as apikey and keeps legacy JWT authorization', () => {
    expect(adminHeaders('sb_secret_fixture')).toEqual({ apikey: 'sb_secret_fixture', 'Content-Type': 'application/json' });
    expect(adminHeaders('legacy-jwt').Authorization).toBe('Bearer legacy-jwt');
  });
  it('keeps user authentication separate from elevated database requests', async () => {
    const user = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get('apikey')).toBe(config.worker.SUPABASE_SERVICE_ROLE_KEY);
      if (url.endsWith('/auth/v1/user')) { expect(headers.get('authorization')).toBe('Bearer user-session'); return Response.json({ id: user }); }
      expect(headers.has('authorization')).toBe(false);
      if (url.includes('reserve_growth_budget')) return Response.json(true);
      if (url.includes('growth_documents')) return Response.json([]);
      throw new Error('Unexpected request');
    });
    vi.stubGlobal('fetch', fetcher);
    try {
      const env: Env = { ...config.worker, ALLOWED_ORIGIN: 'https://growth.example' };
      const response = await worker.fetch(new Request('https://api.example/sync', { method: 'POST', headers: { Authorization: 'Bearer user-session', 'Content-Type': 'application/json', Origin: env.ALLOWED_ORIGIN }, body: JSON.stringify({ protocol: 4, commands: [] }) }), env);
      expect(response.status).toBe(200); expect(fetcher).toHaveBeenCalledTimes(3);
    } finally { vi.unstubAllGlobals(); }
  });
});
describe('read-only service diagnostics', () => {
  it('reports a missing key without sending database requests or exposing config', async () => {
    const fetcher = vi.fn(async () => Response.json({}));
    const results = await checkServices({ ...config, worker: { ...config.worker, SUPABASE_SERVICE_ROLE_KEY: '' } }, fetcher);
    expect(results.some((c: { name: string; status: string }) => c.name === 'Server credential' && c.status === 'blocked')).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1); expect(JSON.stringify(results)).not.toContain(config.frontend.VITE_SUPABASE_ANON_KEY);
  });
  it('distinguishes a missing migration and permissions from accepted metadata', async () => {
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      expect(init?.method).toBeUndefined(); expect(init?.redirect).toBe('error');
      if (url.includes('growth_documents')) return Response.json({}, { status: 404 });
      if (url.includes('growth_budgets')) return Response.json({}, { status: 403 });
      if (url.endsWith('/rest/v1/')) return Response.json({ paths: { '/rpc/commit_growth_document': {} } });
      return Response.json([]);
    });
    const results = await checkServices(config, fetcher);
    expect(results.find((c: { name: string }) => c.name === 'growth_documents')?.detail).toContain('Apply');
    expect(results.find((c: { name: string }) => c.name === 'growth_budgets')?.detail).toContain('rejected');
    expect(results.find((c: { name: string }) => c.name === 'commit_growth_document')?.status).toBe('pass');
    expect(results.find((c: { name: string }) => c.name === 'reserve_growth_budget')?.status).toBe('blocked');
    expect(JSON.stringify(results)).not.toContain(config.worker.SUPABASE_SERVICE_ROLE_KEY);
  });
  it('does not report a provider failure as a working generation connection', async () => {
    const fetcher = vi.fn(async (url: string) => { if (url.includes('generativelanguage')) throw new Error('sensitive URL and key'); return Response.json({}); });
    const results = await checkServices({ ...config, worker: { ...config.worker, GEMINI_API_KEY: 'private-ai-key', GEMINI_MODEL: 'test-model' } }, fetcher);
    expect(results.find((c: { name: string }) => c.name === 'Gemini model metadata')?.status).toBe('blocked');
    expect(JSON.stringify(results)).not.toMatch(/private-ai-key|sensitive URL/);
  });
});
