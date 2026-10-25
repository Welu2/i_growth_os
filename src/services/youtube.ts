import { z } from 'zod';
import { parseVideo } from '../domain/model';
export const youtubeResults = z.object({ results: z.array(z.object({
  title: z.string().min(1).max(160), creator: z.string().max(300),
  url: z.string().max(500).refine((url) => { try { return parseVideo(url).provider === 'YouTube'; } catch { return false; } }, 'Expected a YouTube video.'),
  durationSeconds: z.number().int().positive().max(239).optional(),
})).max(5) });
export type YouTubeResult = z.infer<typeof youtubeResults>['results'][number];
export function runtime(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
