import { afterEach, describe, expect, it, vi } from 'vitest';
import { durationSeconds, searchInput, searchYoutube } from '../worker/youtube';
import worker, { type Env } from '../worker/index';
afterEach(() => vi.unstubAllGlobals());
const ids = ['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc', 'ddddddddddd', 'eeeeeeeeeee'];
const searchItems = ids.map((id) => ({ id: { videoId: id }, snippet: { title: 'Chess lesson', channelTitle: 'Teacher', liveBroadcastContent: 'none' } }));
const detail = (id: string, duration: string, extra = {}) => ({ id, contentDetails: { duration }, status: { embeddable: true, privacyStatus: 'public', uploadStatus: 'processed', ...extra } });
function mockProvider(details = [detail(ids[0], 'PT1M30S')]) {
  const fetcher = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes('/auth/v1/user')) return Response.json({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' });
    if (url.includes('reserve_growth_budget')) return Response.json(true);
    if (url.includes('/youtube/v3/search')) return Response.json({ items: searchItems });
    if (url.includes('/youtube/v3/videos')) return Response.json({ items: details });
    throw new Error('Unexpected test request');
  });
  vi.stubGlobal('fetch', fetcher); return fetcher;
}
describe('short YouTube lessons', () => {
  it('validates duration requests and rejects unknown or empty duration formats', () => {
    expect(durationSeconds('PT1H2M3S')).toBe(3723);
    expect(durationSeconds('PT90S')).toBe(90);
    for (const value of ['PT', 'PT0S', 'P1D', '90', 'PT-1S', 'PT999999999999999999999999H']) expect(durationSeconds(value)).toBeNull();
    for (const maxSeconds of [-1, 0, 240, 1000, 90.5]) expect(searchInput.safeParse({ query: 'chess', maxSeconds }).success).toBe(false);
  });
  it('requests short videos and verifies runtime and embedding instead of trusting search results', async () => {
    const fetcher = mockProvider([detail(ids[0], 'PT1M30S'), detail(ids[1], 'PT3M'), detail(ids[2], 'PT0S'), detail(ids[3], 'PT1M', { embeddable: false }), detail(ids[4], 'PT1M', { privacyStatus: 'private' })]);
    const result = await searchYoutube('test-key', 'chess rook', 120) as { results: { durationSeconds: number }[] };
    expect(result.results).toHaveLength(1); expect(result.results[0].durationSeconds).toBe(90);
    const url = new URL(String(fetcher.mock.calls[0][0]));
    expect(url.searchParams.get('videoDuration')).toBe('short');
    expect(url.searchParams.get('eventType')).toBeNull();
    expect(fetcher.mock.calls).toHaveLength(2);
    expect(new URL(String(fetcher.mock.calls[1][0])).searchParams.get('part')).toBe('contentDetails,status');
  });
  it('keeps ordinary search backward compatible without the metadata request', async () => {
    const fetcher = mockProvider();
    const result = await searchYoutube('test-key', 'chess') as { results: unknown[] };
    expect(result.results).toHaveLength(5); expect(fetcher).toHaveBeenCalledTimes(1);
    expect(new URL(String(fetcher.mock.calls[0][0])).searchParams.has('videoDuration')).toBe(false);
  });
  it('separates cached results by length budget and never caches keys', async () => {
    const stored = new Map<string, Response>();
    vi.stubGlobal('caches', { default: { match: async (req: Request) => stored.get(req.url)?.clone(), put: async (req: Request, res: Response) => { stored.set(req.url, res.clone()); } } });
    const fetcher = mockProvider([detail(ids[0], 'PT3M')]);
    await searchYoutube('secret-key', 'chess', 239);
    const result = await searchYoutube('secret-key', 'chess', 120) as { results: unknown[] };
    expect(result.results).toHaveLength(0);
    await searchYoutube('secret-key', 'chess', 120);
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect([...stored.keys()].some((key) => key.includes('secret-key'))).toBe(false);
  });
  it('fails explicitly when duration metadata fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => String(input).includes('/videos?') ? new Response('', { status: 503 }) : Response.json({ items: searchItems })));
    await expect(searchYoutube('key', 'chess', 120)).rejects.toThrow('lengths could not be verified');
  });
  it('keeps authentication and budget checks in front of short-video provider calls', async () => {
    const env: Env = { SUPABASE_URL: 'https://account.example', SUPABASE_SERVICE_ROLE_KEY: 'test-server', ALLOWED_ORIGIN: 'https://growth.example', YOUTUBE_API_KEY: 'test-key' };
    const req = (authorization = 'Bearer user-token') => new Request('https://api.example/youtube/search', { method: 'POST', headers: { Origin: env.ALLOWED_ORIGIN, Authorization: authorization, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'chess rook', maxSeconds: 120 }) });
    const fetcher = mockProvider();
    expect((await worker.fetch(req(''), env)).status).toBe(401); expect(fetcher).not.toHaveBeenCalled();
    const response = await worker.fetch(req(), env); expect(response.status).toBe(200);
    const calls = fetcher.mock.calls.map(([url]) => String(url));
    expect(calls.findIndex((url) => url.includes('reserve_growth_budget'))).toBeLessThan(calls.findIndex((url) => url.includes('/youtube/v3/search')));
    expect(await response.json()).toMatchObject({ results: [{ durationSeconds: 90 }] });
    fetcher.mockImplementation(async (input) => String(input).includes('/auth/v1/user') ? Response.json({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }) : Response.json(false));
    fetcher.mockClear();
    expect((await worker.fetch(req(), env)).status).toBe(429);
    expect(fetcher.mock.calls.some(([url]) => String(url).includes('googleapis'))).toBe(false);
  });
});
