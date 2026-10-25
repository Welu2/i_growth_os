import { describe, expect, it } from 'vitest';
import { ActivityMeter } from '../src/domain/activity';
import { applyCommand, initialState, persistedStateSchema, totalXp, balance, type Action } from '../src/domain/model';
const at = Date.parse('2026-10-15T20:59:00Z');
const cmd = (action: Action, time = at) => ({ id: crypto.randomUUID(), at: time, action });
const setup = () => applyCommand(applyCommand(initialState(), cmd({ type: 'onboard', profile: { name: 'Ada', companionName: 'Babu', companionType: 'panda', timezone: 'Africa/Addis_Ababa' }, goal: 'Learn', habit: 'Practice' })), cmd({ type: 'preferences', preferences: { tracking: true } }));
describe('automatic observation', () => {
  it('requires a full observed minute and assigns the most observed screen', () => {
    const meter = new ActivityMeter();
    for (let second = 0; second < 60; second++) expect(meter.sample(at + second * 1000, true, second < 45 ? 'learn' : 'today')).toBeNull();
    expect(meter.sample(at + 60_000, true, 'today')).toEqual({ minute: Math.floor(at / 60_000), context: 'learn' });
  });
  it('discards hidden, excluded, idle, suspended, and backwards-clock gaps without catch-up', () => {
    for (const gap of ['ineligible', 'sleep', 'backwards']) {
      const meter = new ActivityMeter();
      for (let second = 0; second < 45; second++) meter.sample(at + second * 1000, true, 'today');
      if (gap === 'ineligible') meter.sample(at + 45_000, false, 'today');
      const next = gap === 'backwards' ? at - 60_000 : at + 600_000;
      expect(meter.sample(next, true, 'today')).toBeNull();
      for (let second = 1; second < 60; second++) expect(meter.sample(next + second * 1000, true, 'today')).toBeNull();
      expect(meter.sample(next + 60_000, true, 'today')).not.toBeNull();
    }
  });
  it('deduplicates competing screens and devices, honors exclusions and midnight, and never rewards observation', () => {
    let s = setup();
    const minute = Math.floor(at / 60_000);
    s = applyCommand(s, cmd({ type: 'visible.minute', minute, context: 'learn' }, at + 60_000));
    s = applyCommand(s, cmd({ type: 'visible.minute', minute, context: 'today' }, at + 60_000));
    expect(s.visibleMinutes['2026-10-15']).toBe(1);
    expect(s.activityMinutes['2026-10-15'].learn).toBe(1);
    expect(s.activityMinutes['2026-10-15'].today).toBe(0);
    s = applyCommand(s, cmd({ type: 'visible.minute', minute: minute + 1, context: 'settings' }, at + 120_000));
    expect(Object.keys(s.visibleMinutes)).toHaveLength(1);
    s = applyCommand(s, cmd({ type: 'preferences', preferences: { tracking: false } }));
    s = applyCommand(s, cmd({ type: 'visible.minute', minute: minute + 1, context: 'today' }, at + 120_000));
    expect(Object.keys(s.visibleMinutes)).toHaveLength(1);
    expect(totalXp(s)).toBe(0); expect(balance(s)).toBe(0); expect(s.story).toEqual([]);
    s = applyCommand(s, cmd({ type: 'activity.clear' }));
    expect(s.activityMinutes).toEqual({}); expect(s.visibleMinutes).toEqual({});
  });
  it('migrates earlier measured minutes without inventing screen history or replacing preferences', () => {
    const s = setup(); s.visibleMinutes['2026-10-15'] = 14;
    const old: Record<string, unknown> = { ...s, schemaVersion: 2 };
    delete old.activityMinutes;
    old.preferences = { tracking: true, reducedMotion: true, largeText: true, lifestyle: false, theme: 'light' };
    const next = persistedStateSchema.parse(old);
    expect(next.schemaVersion).toBe(4); expect(next.visibleMinutes).toEqual(s.visibleMinutes);
    expect(next.activityMinutes).toEqual({}); expect(next.preferences.activityExclusions).toEqual(['settings']);
    expect(next.preferences.largeText).toBe(true); expect(next.ledger).toEqual(s.ledger);
  });
  it('opens the lamp milestone after three distinct practices, without a timer or bonus rewards', () => {
    let s = setup();
    for (let i = 0; i < 3; i++) {
      const id = crypto.randomUUID();
      s = applyCommand(s, cmd({ type: 'exercise.add', id, title: 'Practice ' + i }));
      s = applyCommand(s, cmd({ type: 'exercise.complete', id }, at + i * 1000));
      s = applyCommand(s, cmd({ type: 'exercise.complete', id }, at + i * 1000));
    }
    expect(s.story.map((m) => m.id)).toEqual(['practice', 'focus']);
    expect(s.story[1].version).toBe(2); expect(balance(s)).toBe(30); expect(totalXp(s)).toBe(90);
    const old = structuredClone(s); old.story[1].version = 1;
    expect(persistedStateSchema.parse(old).story[1]).toEqual(old.story[1]);
  });
});
