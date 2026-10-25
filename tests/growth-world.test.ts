import { describe, expect, it } from 'vitest';
import { applyCommand, initialState, persistedStateSchema, totalXp, balance, type Action, type GrowthState } from '../src/domain/model';
import { dayStart, timeReport } from '../src/domain/insights';
import { playbackInterval, type PlaybackSample } from '../src/domain/playback';
const at = Date.parse('2026-10-15T20:59:00Z');
const command = (action: Action, time = at) => ({ id: crypto.randomUUID(), at: time, action });
function setup() { return applyCommand(initialState(), command({ type: 'onboard', profile: { name: 'Ada', companionName: 'Sprout', companionType: 'seedling', timezone: 'Africa/Addis_Ababa' }, goal: 'Learn', habit: 'Practice' })); }
describe('persistent companion world', () => {
  it('unlocks each milestone once across repeats and nonconsecutive days without extra coins', () => {
    let s = setup();
    for (const day of [0, 0, 2, 8]) s = applyCommand(s, command({ type: 'habit.complete', id: s.habits[0].id }, at + day * 86_400_000));
    expect(s.story.map((m) => m.id)).toEqual(['begin', 'rhythm']);
    expect(totalXp(s)).toBe(75); expect(balance(s)).toBe(0);
    const snapshot = structuredClone(s);
    s = applyCommand(s, command({ type: 'preferences', preferences: { theme: 'light' } }, at + 100 * 86_400_000));
    expect(s.story).toEqual(snapshot.story);
  });
  it('migrates v1 evidence without minting rewards, resetting inventory, or inventing chapters', () => {
    let s = setup();
    s = applyCommand(s, command({ type: 'habit.complete', id: s.habits[0].id }));
    const legacy: Record<string, unknown> = { ...s, schemaVersion: 1 };
    delete legacy.story; delete legacy.playback; delete legacy.activityImportedAt;
    const next = persistedStateSchema.parse(legacy);
    expect(next.schemaVersion).toBe(4); expect(next.story[0].eventId).toBe(s.ledger[0].id);
    expect(next.ledger).toEqual(s.ledger); expect(next.profile).toEqual(s.profile); expect(next.inventory).toEqual(s.inventory);
    expect(persistedStateSchema.parse(next)).toEqual(next);
    expect(() => persistedStateSchema.parse({ ...next, schemaVersion: 99 })).toThrow();
  });
  it('cancelled focus never unlocks a story reward', () => {
    let s = setup(); const id = crypto.randomUUID();
    s = applyCommand(s, command({ type: 'focus.start', id, title: 'Try', minutes: 5 }));
    s = applyCommand(s, command({ type: 'focus.cancel', id }, at + 60_000));
    expect(s.story).toHaveLength(0); expect(totalXp(s)).toBe(0);
  });
});
describe('atomic linked assignments', () => {
  const details = (resourceId: string | null) => ({ resourceId, objective: 'Draw from observation', instructions: 'Sketch an object', minutes: 5, criteria: 'Make one sketch', source: 'Offline template' as const, basis: 'topic' as const, reflection: '' });
  it('saves a whole plan once, preserves links after resource deletion, and rewards only completion', () => {
    let s = setup(); const resourceId = crypto.randomUUID(), id = crypto.randomUUID();
    s = applyCommand(s, command({ type: 'resource.add', id: resourceId, title: 'Drawing', url: 'https://youtu.be/dQw4w9WgXcQ' }));
    const save = command({ type: 'plan.save', tasks: [{ id, title: 'Sketch', details: details(resourceId) }] });
    s = applyCommand(s, save); s = applyCommand(s, save); s = applyCommand(s, command(save.action));
    expect(s.exercises).toHaveLength(1); expect(totalXp(s)).toBe(0);
    s = applyCommand(s, command({ type: 'resource.delete', id: resourceId }));
    s = applyCommand(s, command({ type: 'exercise.complete', id }));
    s = applyCommand(s, command({ type: 'exercise.complete', id }));
    expect(balance(s)).toBe(10); expect(s.story.map((r) => r.id)).toEqual(['practice']);
    expect(s.exercises[0].details?.resourceId).toBe(resourceId);
  });
  it('rolls back all tasks when one references an unavailable resource', () => {
    const s = setup(), before = structuredClone(s);
    expect(() => applyCommand(s, command({ type: 'plan.save', tasks: [
      { id: crypto.randomUUID(), title: 'Valid', details: details(null) },
      { id: crypto.randomUUID(), title: 'Missing', details: details(crypto.randomUUID()) },
    ] }))).toThrow('no longer available');
    expect(s).toEqual(before);
  });
});
describe('time sources and boundaries', () => {
  it('splits focus across local midnight and excludes a long pause', () => {
    let s = setup(); const id = crypto.randomUUID();
    s = applyCommand(s, command({ type: 'focus.start', id, title: 'Focus', minutes: 5 }));
    s = applyCommand(s, command({ type: 'focus.pause', id }, at + 120_000));
    s = applyCommand(s, command({ type: 'focus.resume', id }, at + 600_000));
    s = applyCommand(s, command({ type: 'focus.finish', id }, at + 780_000));
    const report = timeReport(s, 2, at + 800_000);
    expect(report.map((r) => r.focus)).toEqual([60_000, 240_000]);
    expect(report.map((r) => r.visible)).toEqual([null, null]);
    expect(s.story.map((m) => m.id)).toEqual(['focus']);
  });
  it('uses the actual daylight-saving boundary rather than assuming 24 hours', () => {
    expect(dayStart('2026-03-09', 'America/New_York') - dayStart('2026-03-08', 'America/New_York')).toBe(23 * 3_600_000);
    expect(dayStart('2026-11-02', 'America/New_York') - dayStart('2026-11-01', 'America/New_York')).toBe(25 * 3_600_000);
  });
  it('deduplicates playback overlaps, respects opt out, and never awards XP', () => {
    let s = setup(); const resourceId = crypto.randomUUID();
    s = applyCommand(s, command({ type: 'resource.add', id: resourceId, title: 'Example', url: 'https://youtu.be/dQw4w9WgXcQ' }));
    const record = () => command({ type: 'playback.record', id: crypto.randomUUID(), resourceId, start: at, end: at + 30_000 }, at + 30_000);
    s = applyCommand(s, record()); expect(s.playback).toHaveLength(0);
    s = applyCommand(s, command({ type: 'preferences', preferences: { tracking: true } }));
    const c = record(); s = applyCommand(s, c); s = applyCommand(s, c); s = applyCommand(s, record());
    expect(timeReport(s, 1, at + 40_000)[0].playback).toBe(30_000);
    expect(totalXp(s)).toBe(0);
    s = applyCommand(s, command({ type: 'activity.clear' })); expect(s.playback).toHaveLength(0);
  });
  it('labels legacy sessions by completion day without fabricated intervals', () => {
    const s: GrowthState = setup();
    s.sessions.push({ id: crypto.randomUUID(), title: 'Legacy', startedAt: at, endedAt: at + 120_000, targetMinutes: 1, elapsedMs: 60_000, runningSince: null, cancelled: false });
    const r = timeReport(s, 2, at + 180_000); expect(r[0].focus).toBe(0); expect(r[1].legacy).toBe(60_000);
  });
});
describe('player estimates', () => {
  const previous: PlaybackSample = { wall: 10_000, position: 5, playing: true, visible: true, rate: 1 };
  it('counts wall time at normal and double speed without counting seek distance', () => {
    expect(playbackInterval(previous, { ...previous, wall: 11_000, position: 6 })).toEqual({ start: 10_000, end: 11_000 });
    expect(playbackInterval({ ...previous, rate: 2 }, { ...previous, rate: 2, wall: 11_000, position: 7 })).toEqual({ start: 10_000, end: 11_000 });
    for (const change of [{ position: 40 }, { position: 0 }, { playing: false }, { visible: false }, { wall: 20_000 }, { position: NaN }]) expect(playbackInterval(previous, { ...previous, wall: 11_000, position: 6, ...change })).toBeNull();
    expect(playbackInterval({ ...previous, visible: false }, { ...previous, wall: 11_000, position: 6 })).toBeNull();
  });
});
