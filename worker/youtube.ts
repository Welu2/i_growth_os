import { z } from 'zod';
export const searchInput = z.object({ query: z.string().trim().min(3).max(100) });
export async function searchYoutube(key: string, query: string) {
  const cache = (globalThis.caches as CacheStorage & { default?: Cache } | undefined)?.default;
  const cacheKey = new Request(`https://growth-youtube-cache.invalid/search?q=${encodeURIComponent(query.toLowerCase())}`);
  const cached = await cache?.match(cacheKey);
  if (cached) return cached.json();
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  for (const [name, value] of Object.entries({ part: 'snippet', type: 'video', videoEmbeddable: 'true', maxResults: '5', q: query, key })) url.searchParams.set(name, value);
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error('YouTube search is unavailable or its quota is exhausted. Paste a video link instead.');
  const data = z.object({ items: z.array(z.object({ id: z.object({ videoId: z.string().regex(/^[\w-]{11}$/) }), snippet: z.object({ title: z.string().max(300), channelTitle: z.string().max(300) }) })).max(5) }).parse(await response.json());
  const results = data.items.map((item) => ({ title: item.snippet.title.slice(0, 160), creator: item.snippet.channelTitle, url: `https://www.youtube.com/watch?v=${item.id.videoId}` }));
  const payload = { results };
  if (cache) await cache.put(cacheKey, Response.json(payload, { headers: { 'Cache-Control': 'public, max-age=86400' } }));
  return payload;
}
