import { z } from 'zod';
export const searchInput = z.object({ query: z.string().trim().min(3).max(100), maxSeconds: z.number().int().min(60).max(239).optional() });
/** Bounded ISO 8601 durations from YouTube; unknown formats are not short lessons. */
export function durationSeconds(value: string): number | null {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
  if (!match || !match.slice(1).some(Boolean)) return null;
  const seconds = Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
  return Number.isSafeInteger(seconds) && seconds > 0 ? seconds : null;
}
export async function searchYoutube(key: string, query: string, maxSeconds?: number, signal?: AbortSignal) {
  const cache = (globalThis.caches as CacheStorage & { default?: Cache } | undefined)?.default;
  const cacheKey = new Request(`https://growth-youtube-cache.invalid/search-v2?q=${encodeURIComponent(query.toLowerCase())}&max=${maxSeconds ?? 'any'}`);
  const cached = await cache?.match(cacheKey);
  if (cached) return cached.json();
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  for (const [name, value] of Object.entries({ part: 'snippet', type: 'video', videoEmbeddable: 'true', maxResults: '5', q: query, key })) url.searchParams.set(name, value);
  if (maxSeconds !== undefined) url.searchParams.set('videoDuration', 'short');
  const requestSignal = () => signal ? AbortSignal.any([signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000);
  const response = await fetch(url, { signal: requestSignal() });
  if (!response.ok) throw new Error('YouTube search is unavailable or its quota is exhausted. Paste a video link instead.');
  const data = z.object({ items: z.array(z.object({ id: z.object({ videoId: z.string().regex(/^[\w-]{11}$/) }), snippet: z.object({ title: z.string().max(300), channelTitle: z.string().max(300), liveBroadcastContent: z.string().optional() }) })).max(5) }).parse(await response.json());
  let results: { title: string; creator: string; url: string; durationSeconds?: number }[] = data.items.filter((item) => maxSeconds === undefined || !['live', 'upcoming'].includes(item.snippet.liveBroadcastContent ?? '')).map((item) => ({ title: item.snippet.title.slice(0, 160), creator: item.snippet.channelTitle, url: `https://www.youtube.com/watch?v=${item.id.videoId}` }));
  if (maxSeconds !== undefined && results.length) {
    const detailUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    for (const [name, value] of Object.entries({ part: 'contentDetails,status', id: results.map((item) => new URL(item.url).searchParams.get('v')).join(','), key })) detailUrl.searchParams.set(name, value);
    const detailResponse = await fetch(detailUrl, { signal: requestSignal() });
    if (!detailResponse.ok) throw new Error('Video lengths could not be verified. Try again or practice without a video.');
    const details = z.object({ items: z.array(z.object({ id: z.string(), contentDetails: z.object({ duration: z.string() }), status: z.object({ embeddable: z.boolean(), privacyStatus: z.string(), uploadStatus: z.string() }) })).max(5) }).parse(await detailResponse.json());
    results = results.flatMap((item) => {
      const video = details.items.find((row) => row.id === new URL(item.url).searchParams.get('v'));
      const seconds = video ? durationSeconds(video.contentDetails.duration) : null;
      return video?.status.embeddable && video.status.privacyStatus === 'public' && video.status.uploadStatus === 'processed' && seconds !== null && seconds <= maxSeconds && seconds < 240 ? [{ ...item, durationSeconds: seconds }] : [];
    });
  }
  const payload = { results };
  if (cache) await cache.put(cacheKey, Response.json(payload, { headers: { 'Cache-Control': 'public, max-age=86400' } }));
  return payload;
}
