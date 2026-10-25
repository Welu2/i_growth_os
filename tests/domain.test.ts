import { describe, expect, it } from 'vitest';
import { applyCommand, balance, initialState, level, localDay, parseVideo, sessionElapsed, totalXp, unionDuration, type Action, type GrowthState } from '../src/domain/model';
import { parseActivity } from '../src/services/imports';
import { offlineDraft } from '../src/services/assistant';
import { draftSchema } from '../src/domain/model';
const now = Date.parse('2026-10-13T09:00:00Z');
const command = (action: Action, at = now) => ({ id: crypto.randomUUID(), at, action });
function onboard(): GrowthState { return applyCommand(initialState(), command({ type: 'onboard', profile: { name: 'Ada', companionName: 'Babu', companionType: 'panda', timezone: 'Africa/Addis_Ababa' }, goal: 'Learn drawing', habit: 'Draw a circle' })); }
describe('progress and virtual economy', () => {
  it('awards one habit occurrence despite repeated commands and retries', () => {
    let s = onboard(); const h = s.habits[0]; const c = command({ type: 'habit.complete', id: h.id });
    s = applyCommand(s, c); s = applyCommand(s, c); s = applyCommand(s, command(c.action));
    expect(totalXp(s)).toBe(25); expect(balance(s)).toBe(0); expect(s.ledger).toHaveLength(1);
    s = applyCommand(s, command(c.action, now + 86_400_000)); expect(totalXp(s)).toBe(50);
  });
  it('uses timezone boundaries for daily occurrences', () => {
    expect(localDay(Date.parse('2026-10-13T22:00:00Z'), 'Africa/Addis_Ababa')).toBe('2026-10-14');
  });
  it('does not reward an archived or unscheduled habit', () => {
    let s = onboard(); const id = crypto.randomUUID(); s = applyCommand(s, command({ type: 'habit.add', id, title: 'Monday walk', days: [1] }));
    expect(() => applyCommand(s, command({ type: 'habit.complete', id }))).toThrow('not scheduled');
    s = applyCommand(s, command({ type: 'habit.archive', id: s.habits[0].id }));
    expect(() => applyCommand(s, command({ type: 'habit.complete', id: s.habits[0].id }))).toThrow();
  });
  it('never partially spends or double grants inventory', () => {
    let s = onboard(); const before = structuredClone(s);
    expect(() => applyCommand(s, command({ type: 'wallet.buy', item: 'fern' }))).toThrow('more Growth Coins'); expect(s).toEqual(before);
    s = applyCommand(s, command({ type: 'goal.complete', id: s.goals[0].id }));
    const id = crypto.randomUUID(); s = applyCommand(s, command({ type: 'exercise.add', id, title: 'Sketch a cup' }));
    s = applyCommand(s, command({ type: 'exercise.complete', id }));
    expect(balance(s)).toBe(30);
    s = applyCommand(s, command({ type: 'wallet.buy', item: 'fern' })); s = applyCommand(s, command({ type: 'wallet.buy', item: 'fern' }));
    expect(balance(s)).toBe(0); expect(s.inventory).toEqual(['fern']); expect(s.equipped).toBe('fern');
    expect(s.ledger.filter((r) => r.coins < 0)).toHaveLength(1);
  });
  it('crosses multiple level thresholds and never grants XP for playing a video', () => {
    let s = onboard();
    for (let i = 0; i < 10; i++) { const id = crypto.randomUUID(); s = applyCommand(s, command({ type: 'exercise.add', id, title: `Practice ${i}` })); s = applyCommand(s, command({ type: 'exercise.complete', id })); }
    expect(level(s)).toBe(3); const xp = totalXp(s);
    s = applyCommand(s, command({ type: 'resource.add', id: crypto.randomUUID(), title: 'Resource', url: 'https://youtu.be/dQw4w9WgXcQ' })); expect(totalXp(s)).toBe(xp);
  });
  it('preserves conflicting notes and prevents resurrection of deleted resources', () => {
    let s = onboard(); const id = crypto.randomUUID();
    s = applyCommand(s, command({ type: 'resource.add', id, title: 'Drawing', url: 'https://youtu.be/dQw4w9WgXcQ' }));
    s = applyCommand(s, command({ type: 'resource.notes', id, revision: 0, notes: 'Device one notes' }));
    expect(() => applyCommand(s, command({ type: 'resource.notes', id, revision: 0, notes: 'Device two notes' }))).toThrow('changed');
    expect(s.resources[0].notes).toBe('Device one notes');
    s = applyCommand(s, command({ type: 'resource.delete', id }));
    s = applyCommand(s, command({ type: 'resource.add', id, title: 'Old retry', url: 'https://youtu.be/dQw4w9WgXcQ' }));
    expect(s.resources[0].deleted).toBe(true);
  });
});
describe('focus and activity', () => {
  it('restores elapsed time, excludes pauses, caps long sleep and rewards once', () => {
    let s = onboard(); const id = crypto.randomUUID();
    s = applyCommand(s, command({ type: 'focus.start', id, title: 'Drawing', minutes: 5 }));
    expect(() => applyCommand(s, command({ type: 'focus.finish', id }, now + 1000))).toThrow('planned duration');
    s = applyCommand(s, command({ type: 'focus.pause', id }, now + 60_000));
    expect(sessionElapsed(s.sessions[0], now + 600_000)).toBe(60_000);
    s = applyCommand(s, command({ type: 'focus.resume', id }, now + 600_000));
    s = applyCommand(s, command({ type: 'focus.finish', id }, now + 3_600_000));
    s = applyCommand(s, command({ type: 'focus.finish', id }, now + 3_600_000));
    expect(s.sessions[0].elapsedMs).toBe(300_000); expect(balance(s)).toBe(5);
  });
  it('prevents overlapping sessions and protects against a backwards clock', () => {
    let s = onboard(); const id = crypto.randomUUID(); s = applyCommand(s, command({ type: 'focus.start', id, title: 'Focus', minutes: 5 }));
    expect(() => applyCommand(s, command({ type: 'focus.start', id: crypto.randomUUID(), title: 'Other', minutes: 5 }))).toThrow('current session');
    expect(() => applyCommand(s, command({ type: 'focus.pause', id }, now - 1000))).toThrow('clock');
    s = applyCommand(s, command({ type: 'focus.cancel', id }, now + 60_000)); expect(balance(s)).toBe(0);
  });
  it('deduplicates visible minutes across tabs and respects opt out', () => {
    let s = onboard(); const action: Action = { type: 'visible.minute', minute: Math.floor(now / 60_000) };
    s = applyCommand(s, command(action)); expect(s.visibleMinutes).toEqual({});
    s = applyCommand(s, command({ type: 'preferences', preferences: { ...s.preferences, tracking: true } }));
    s = applyCommand(s, command(action)); s = applyCommand(s, command(action));
    expect(Object.values(s.visibleMinutes)).toEqual([1]);
  });
  it('merges overlapping intervals without double counting', () => { expect(unionDuration([{ start: 100, end: 200 }, { start: 150, end: 300 }, { start: 500, end: 550 }])).toBe(250); });
  it('strips window titles and ignores malformed or oversized activity', () => {
    const input = { buckets: { desktop: { type: 'currentwindow', hostname: 'Laptop', events: [{ timestamp: '2026-10-13T08:00:00Z', duration: 60, data: { app: 'Editor', title: 'PRIVATE FILE' } }] } } };
    const rows = parseActivity(JSON.stringify(input), now); expect(rows[0].app).toBe('Editor'); expect(JSON.stringify(rows)).not.toContain('PRIVATE');
    expect(() => parseActivity('x'.repeat(2_000_001), now)).toThrow('2 MB');
  });
});
describe('untrusted resources and AI', () => {
  it('only allows provider video URLs with valid identifiers', () => {
    expect(parseVideo('https://youtu.be/dQw4w9WgXcQ').provider).toBe('YouTube');
    expect(parseVideo('https://www.tiktok.com/@creator/video/6718335390845095173').provider).toBe('TikTok');
    for (const url of ['javascript:alert(1)', 'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ', 'http://youtube.com/watch?v=dQw4w9WgXcQ', 'https://name:secret@youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtube.com:444/watch?v=dQw4w9WgXcQ']) expect(() => parseVideo(url)).toThrow();
  });
  it('validates bounded AI drafts and provides an explicit local fallback', () => {
    expect(draftSchema.safeParse({ title: 'x', message: 'x', steps: [] }).success).toBe(false);
    expect(draftSchema.safeParse(offlineDraft({ topic: 'Learning to sketch', minutes: 15, mode: 'learning-plan' })).success).toBe(true);
  });
});

describe('habit schedule recovery', () => {
  it('restores and reschedules the same identity without duplicating earned rewards', () => {
    let s = onboard(); const id = s.habits[0].id;
    s = applyCommand(s, command({ type: 'habit.complete', id }));
    s = applyCommand(s, command({ type: 'habit.archive', id }));
    s = applyCommand(s, command({ type: 'habit.restore', id }));
    s = applyCommand(s, command({ type: 'habit.schedule', id, days: [2, 2, 4] }));
    s = applyCommand(s, command({ type: 'habit.complete', id }));
    expect(s.habits[0].days).toEqual([2, 4]); expect(totalXp(s)).toBe(25);
    expect(() => applyCommand(s, command({ type: 'habit.schedule', id, days: [] }))).toThrow();
    expect(() => applyCommand(s, command({ type: 'habit.complete', id }, now + 86_400_000))).toThrow('not scheduled');
  });
  it('enforces import date limits in shared domain validation too', () => {
    expect(() => applyCommand(onboard(), command({ type: 'activity.import', rows: [{ id: 'future', app: 'Editor', device: 'Laptop', start: now + 400_000, end: now + 500_000, category: 'focus', source: 'imported' }] }))).toThrow('future');
  });
});
