import { localDay, sessionElapsed, unionDuration, type GrowthState } from './model';
export function shiftDay(day: string, days: number) { return new Date(Date.parse(day + 'T12:00:00Z') + days * 86_400_000).toISOString().slice(0, 10); }
/** Local day boundary, including daylight-saving days. */
const boundaries = new Map<string, number>();
export function dayStart(day: string, zone: string) {
  const key = day + ':' + zone;
  const cached = boundaries.get(key); if (cached !== undefined) return cached;
  const noon = Date.parse(day + 'T12:00:00Z');
  let low = noon - 36 * 3_600_000, high = noon + 36 * 3_600_000;
  while (high - low > 1) { const mid = Math.floor((low + high) / 2); if (localDay(mid, zone) < day) low = mid; else high = mid; }
  if (boundaries.size > 180) boundaries.clear(); boundaries.set(key, high);
  return high;
}
type Interval = { start: number; end: number };
export function clippedDuration(rows: Interval[], start: number, end: number) { return unionDuration(rows.map((r) => ({ start: Math.max(start, r.start), end: Math.min(end, r.end) })).filter((r) => r.end > r.start)); }
export function sessionIntervals(s: GrowthState['sessions'][number], now: number): Interval[] {
  if (!s.segments) return [];
  const elapsed = s.runningSince !== null ? sessionElapsed(s, now) - s.elapsedMs : 0;
  return [...s.segments, ...(s.runningSince !== null && elapsed > 0 ? [{ start: s.runningSince, end: s.runningSince + elapsed }] : [])];
}
export function timeReport(state: GrowthState, count: number, now: number) {
  const zone = state.profile?.timezone ?? 'UTC', today = localDay(now, zone);
  const days = Array.from({ length: count }, (_, i) => shiftDay(today, i - count + 1));
  const focus = state.sessions.flatMap((s) => sessionIntervals(s, now));
  const bounds = [...days, shiftDay(today, 1)].map((day) => dayStart(day, zone));
  return days.map((day, i) => {
    const start = bounds[i], end = Math.min(now, bounds[i + 1]);
    const legacy = state.sessions.filter((s) => !s.segments && s.endedAt !== null && localDay(s.endedAt, zone) === day).reduce((n, s) => n + s.elapsedMs, 0);
    return { day, start, end, focus: clippedDuration(focus, start, end) + legacy, legacy, visible: state.visibleMinutes[day] ?? null, playback: clippedDuration(state.playback, start, end), imported: clippedDuration(state.activity, start, end) };
  });
}
export function formatDuration(ms: number) { if (ms > 0 && ms < 60_000) return '<1 min'; const minutes = Math.floor(ms / 60_000); return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes} min`; }
