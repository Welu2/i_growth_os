import { z } from 'zod';
import { activitySchema, type GrowthState } from '../domain/model';
const bucket = z.object({ id: z.string().min(1).max(160).optional(), type: z.string(), hostname: z.string().min(1).max(160).optional(), events: z.array(z.unknown()).max(2000) });
const buckets = z.record(z.string().min(1).max(160), bucket);
const eventBase = z.object({ timestamp: z.string().datetime({ offset: true }), duration: z.number().nonnegative().max(86400) });
const windowEvent = eventBase.extend({ data: z.object({ app: z.string().trim().min(1).max(160) }) });
const afkEvent = eventBase.extend({ data: z.object({ status: z.enum(['afk', 'not-afk']) }) });
type Interval = { start: number; end: number };
function merge(rows: Interval[]): Interval[] {
  const result: Interval[] = [];
  for (const row of [...rows].sort((a, b) => a.start - b.start)) {
    const last = result.at(-1);
    if (last && row.start <= last.end) last.end = Math.max(last.end, row.end);
    else result.push({ ...row });
  }
  return result;
}
function activeSegments(row: Interval, active: Interval[], idle: Interval[]) {
  let parts = active.map((a) => ({ start: Math.max(row.start, a.start), end: Math.min(row.end, a.end) })).filter((p) => p.end > p.start);
  for (const gap of idle) parts = parts.flatMap((p) => gap.end <= p.start || gap.start >= p.end ? [p] : [{ start: p.start, end: Math.min(p.end, gap.start) }, { start: Math.max(p.start, gap.end), end: p.end }].filter((r) => r.end > r.start));
  return merge(parts);
}
/** Strict bounded CSV, including quoted commas/newlines and escaped double quotes. */
function csvRows(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false, closed = false;
  const finishCell = () => { row.push(cell); cell = ''; closed = false; if (row.length > 8) throw new Error('CSV has too many columns.'); };
  const finishRow = () => { finishCell(); if (row.some((v) => v.trim())) rows.push(row); row = []; if (rows.length > 2001) throw new Error('Import at most 2,000 CSV intervals.'); };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; closed = true; } } else cell += ch; }
    else if (ch === ',') finishCell();
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; finishRow(); }
    else if (ch === '"' && !cell && !closed) quoted = true;
    else { if (closed || ch === '"') throw new Error('Invalid CSV quoting.'); cell += ch; }
    if (cell.length > 2000) throw new Error('CSV field exceeds its size limit.');
  }
  if (quoted) throw new Error('Unclosed CSV quote.');
  if (cell || row.length || closed) finishRow();
  return rows;
}
function parseCsv(text: string): GrowthState['activity'] {
  const [header, ...records] = csvRows(text);
  const required = ['id', 'device', 'app', 'start', 'end', 'category'];
  if (!header || new Set(header).size !== header.length || required.some((key) => !header.includes(key)) || header.some((key) => ![...required, 'source'].includes(key))) throw new Error('CSV needs id,device,app,start,end,category headers and optional source.');
  return records.map((values) => {
    if (values.length !== header.length) throw new Error('Each CSV row must match the header.');
    const row = Object.fromEntries(header.map((key, i) => [key, values[i]]));
    const timestamp = (value: string) => /^\d+$/.test(value) ? Number(value) : Date.parse(z.string().datetime({ offset: true }).parse(value));
    return activitySchema.parse({ ...row, start: timestamp(row.start), end: timestamp(row.end), source: row.source || 'imported' });
  });
}
export function parseActivity(text: string, now = Date.now()): GrowthState['activity'] {
  if (text.length > 2_000_000) throw new Error('Activity file exceeds 2 MB. Export a smaller date range.');
  text = text.replace(/^\uFEFF/, '').trim();
  let rows: GrowthState['activity'];
  if (!text.startsWith('{') && !text.startsWith('[')) rows = parseCsv(text);
  else {
    const raw: unknown = JSON.parse(text);
    const direct = z.array(activitySchema).max(2000).safeParse(raw);
    if (direct.success) rows = direct.data;
    else {
      const single = bucket.extend({ id: z.string().min(1).max(160) }).safeParse(raw);
      const wrapped = z.object({ buckets }).safeParse(raw);
      const data = single.success ? { [single.data.id]: single.data } : wrapped.success ? wrapped.data.buckets : buckets.parse(raw);
      const all = Object.entries(data);
      if (all.reduce((n, [, b]) => n + b.events.length, 0) > 10_000) throw new Error('Export a smaller date range (at most 10,000 source events).');
      rows = [];
      for (const [bucketId, item] of all.filter(([, b]) => b.type === 'currentwindow')) {
        // Only explicit matching hostnames establish which computer supplied AFK data.
        const afk = item.hostname ? all.filter(([, b]) => b.type === 'afkstatus' && b.hostname === item.hostname) : [];
        const intervals = afk.flatMap(([, b]) => b.events.map((rawEvent) => { const e = afkEvent.parse(rawEvent); return { start: Date.parse(e.timestamp), end: Date.parse(e.timestamp) + Math.round(e.duration * 1000), status: e.data.status }; }));
        const active = merge(intervals.filter((e) => e.status === 'not-afk'));
        const idle = merge(intervals.filter((e) => e.status === 'afk'));
        for (const rawEvent of item.events) {
          const event = windowEvent.parse(rawEvent);
          const start = Date.parse(event.timestamp), end = start + Math.round(event.duration * 1000);
          const parts = afk.length ? activeSegments({ start, end }, active, idle) : [{ start, end }];
          for (const part of parts.filter((p) => p.end > p.start)) {
            const key = `${bucketId}:${part.start}:${part.end}`;
            if (key.length > 160) throw new Error('The exported bucket name is too long. Use the interval format with a stable, shorter ID.');
            rows.push(activitySchema.parse({ id: key, device: item.hostname ?? 'Imported desktop', app: event.data.app, ...part, category: 'other', source: 'imported' }));
            if (rows.length > 2000) throw new Error('Import 1–2,000 activity intervals at a time.');
          }
        }
      }
    }
  }
  if (!rows.length || rows.length > 2000) throw new Error('No eligible intervals. Import 1–2,000 intervals; AFK filtering keeps only observed active periods.');
  if (rows.some((r) => r.end > now + 300_000 || r.start < now - 366 * 86_400_000)) throw new Error('Activity must be within the last year and not in the future.');
  const unique = new Map<string, GrowthState['activity'][number]>();
  for (const row of rows) { const prior = unique.get(row.id); if (prior && JSON.stringify(prior) !== JSON.stringify(row)) throw new Error('Two different intervals share an ID. Give each interval a stable unique ID.'); unique.set(row.id, row); }
  return [...unique.values()];
}
