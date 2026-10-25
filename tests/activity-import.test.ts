import { describe, expect, it } from 'vitest';
import { parseActivity } from '../src/services/imports';
const now = Date.parse('2026-10-15T15:00:00Z');
const windowBucket = { id: 'aw-watcher-window_laptop', type: 'currentwindow', hostname: 'laptop', events: [
  { timestamp: '2026-10-15T14:00:00Z', duration: 60, data: { app: 'Editor', title: 'PRIVATE', url: 'https://private.example' } },
  { timestamp: '2026-10-15T14:01:00Z', duration: 0, data: { app: 'Browser' } },
] };
describe('desktop setup import formats', () => {
  it.each([windowBucket, { [windowBucket.id]: windowBucket }, { buckets: { [windowBucket.id]: windowBucket, afk: { type: 'afkstatus', events: [{ data: { status: 'afk' } }] } } }])('accepts window exports, drops private fields and zero-length heartbeats', (data) => {
    const rows = parseActivity(JSON.stringify(data), now);
    expect(rows).toHaveLength(1); expect(rows[0].app).toBe('Editor');
    expect(rows[0].end - rows[0].start).toBe(60_000);
    expect(JSON.stringify(rows)).not.toMatch(/PRIVATE|private.example|title|url/);
    expect(parseActivity(JSON.stringify(data), now)).toEqual(rows);
  });
  it('rejects oversized, invalid and future intervals without returning partial data', () => {
    for (const duration of [-1, 86401]) expect(() => parseActivity(JSON.stringify({ ...windowBucket, events: [{ ...windowBucket.events[0], duration }] }), now)).toThrow();
    expect(() => parseActivity(JSON.stringify(windowBucket), now - 86_400_000)).toThrow('future');
  });
});

describe('CSV and idle filtering', () => {
  it('accepts quoted CSV and timestamps, strips no required data, and stays deterministic', () => {
    const csv = 'id,device,app,start,end,category\r\na,Laptop,"Editor, notes",2026-10-15T14:00:00Z,2026-10-15T14:01:00Z,learning';
    const rows = parseActivity(csv, now);
    expect(rows[0].app).toBe('Editor, notes'); expect(rows[0].source).toBe('imported'); expect(rows[0].category).toBe('learning');
    expect(parseActivity(csv, now)).toEqual(rows);
    for (const bad of ['id,id', csv.replace('"Editor, notes"', '"unclosed'), csv.replace(',learning', ',invalid'), csv.replace('14:01:00', '13:59:00')]) expect(() => parseActivity(bad, now)).toThrow();
  });
  it('joins active periods only for the same host and subtracts conflicting idle events', () => {
    const event = (minute: string, duration: number, status: string) => ({ timestamp: `2026-10-15T14:${minute}:00Z`, duration, data: { status } });
    const data = { buckets: {
      window: { ...windowBucket, events: [{ ...windowBucket.events[0], duration: 600 }] },
      afk: { type: 'afkstatus', hostname: 'laptop', events: [event('00', 300, 'not-afk'), event('05', 300, 'afk'), event('02', 60, 'afk')] },
      other: { type: 'afkstatus', hostname: 'another-computer', events: [event('00', 600, 'not-afk')] },
    } };
    const rows = parseActivity(JSON.stringify(data), now);
    expect(rows).toHaveLength(2); expect(rows.reduce((n, r) => n + r.end - r.start, 0)).toBe(240_000);
    expect(new Set(rows.map((r) => r.id)).size).toBe(2);
    expect(JSON.stringify(rows)).not.toContain('PRIVATE');
    expect(parseActivity(JSON.stringify(data), now)).toEqual(rows);
  });
  it('does not guess activity in gaps or import malformed matching AFK data', () => {
    const afk = { type: 'afkstatus', hostname: 'laptop', events: [] as unknown[] };
    const data = { buckets: { window: windowBucket, afk } };
    expect(() => parseActivity(JSON.stringify(data), now)).toThrow('No eligible');
    afk.events.push({ data: { status: 'not-afk' } });
    expect(() => parseActivity(JSON.stringify(data), now)).toThrow();
  });
  it('deduplicates identical IDs and rejects conflicting interval identities', () => {
    const row = parseActivity(JSON.stringify(windowBucket), now)[0];
    expect(parseActivity(JSON.stringify([row, row]), now)).toHaveLength(1);
    expect(() => parseActivity(JSON.stringify([row, { ...row, app: 'Other' }]), now)).toThrow('share an ID');
  });
});
