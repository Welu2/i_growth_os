import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearOwner, db, execute, getDocument, reconcile, restoreGuest, validateBackup } from '../src/data/database';
import { balance, initialState, type Command } from '../src/domain/model';
beforeEach(async () => { await db.documents.clear(); await db.outbox.clear(); });
const now = Date.now();
const setup = (): Command => ({ id: crypto.randomUUID(), at: now, action: { type: 'onboard', profile: { name: 'Ada', companionName: 'Babu', companionType: 'panda', timezone: 'UTC' }, goal: 'Draw', habit: 'Sketch' } });
describe('transactional persistence', () => {
  it('serializes concurrent tabs and survives reopening', async () => {
    const c = setup(); await execute('guest', c);
    const actions: Command[] = Array.from({ length: 8 }, () => ({ id: crypto.randomUUID(), at: now, action: { type: 'goal.complete', id: c.id } }));
    await Promise.all(actions.map((a) => execute('guest', a)));
    db.close(); await db.open(); const doc = await getDocument('guest'); expect(balance(doc.state)).toBe(20); expect(doc.state.ledger).toHaveLength(1);
  });
  it('never mixes two accounts or a guest outbox', async () => {
    await execute('guest', setup()); await execute('user-a', setup()); await execute('user-b', setup());
    expect(await db.outbox.where('owner').equals('guest').count()).toBe(0);
    expect(await db.outbox.where('owner').equals('user-a').count()).toBe(1);
    await clearOwner('user-a'); expect(await db.documents.get('user-a')).toBeUndefined(); expect(await db.documents.get('user-b')).toBeDefined();
  });
  it('counts competing tab observations once across the daily breakdown and total', async () => {
    await execute('guest', setup());
    await execute('guest', { id: crypto.randomUUID(), at: now, action: { type: 'preferences', preferences: { tracking: true } } });
    await Promise.all((['today', 'learn', 'progress', 'today'] as const).map((context) => execute('guest', { id: crypto.randomUUID(), at: now, action: { type: 'visible.minute', minute: Math.floor(now / 60_000), context } })));
    const state = (await getDocument('guest')).state;
    expect(Object.values(state.visibleMinutes).reduce((sum, n) => sum + n, 0)).toBe(1);
    expect(Object.values(state.activityMinutes).flatMap(Object.values).reduce((sum, n) => sum + n, 0)).toBe(1);
    expect(state.ledger).toHaveLength(0);
  });
  it('rejects offline synchronized spending', async () => { await expect(execute('user-a', { id: crypto.randomUUID(), at: now, action: { type: 'wallet.buy', item: 'fern' } })).rejects.toThrow('online'); });
  it('replays changes made during sync and preserves a conflicting draft', async () => {
    const first = setup(); await execute('user-a', first); const base = (await getDocument('user-a')).state;
    const second: Command = { id: crypto.randomUUID(), at: now + 1, action: { type: 'goal.add', id: crypto.randomUUID(), title: 'New goal' } };
    await execute('user-a', second);
    await reconcile('user-a', { owner: 'user-a', state: base, revision: 1, lastSynced: now }, [first.id]);
    const doc = await getDocument('user-a'); expect(doc.state.goals).toHaveLength(2); expect(await db.outbox.count()).toBe(1);
  });
  it('validates backup schema and leaves existing data on invalid import', async () => {
    await execute('guest', setup());
    const backup = JSON.stringify({ format: 'i-growth-os-backup', version: 1, state: (await getDocument('guest')).state });
    await clearOwner('guest'); await restoreGuest(backup); expect((await getDocument('guest')).state.profile?.name).toBe('Ada');
    await expect(restoreGuest('{"format":"wrong"}')).rejects.toThrow(); expect((await getDocument('guest')).state.profile?.name).toBe('Ada');
    expect(() => validateBackup(JSON.stringify({ format: 'i-growth-os-backup', version: 9, state: initialState() }))).toThrow();
  });
});

describe('storage migration', () => {
  it.each([1, 2, 3])('upgrades an existing v%s IndexedDB document without changing its rewards', async (version) => {
    const { default: Dexie } = await import('dexie');
    const { GrowthDatabase } = await import('../src/data/database');
    const name = 'migration-' + crypto.randomUUID();
    const old = new Dexie(name); old.version(version).stores({ documents: 'owner', outbox: 'id, owner' });
    const legacy = { ...initialState(), schemaVersion: version } as Record<string, unknown>;
    if (version === 1) { delete legacy.story; delete legacy.playback; delete legacy.activityImportedAt; }
    if (version < 3) delete legacy.activityMinutes;
    legacy.preferences = { tracking: false, reducedMotion: false, lifestyle: false, theme: 'dark', ...(version >= 2 ? { largeText: false } : {}), ...(version >= 3 ? { activityExclusions: ['settings'] } : {}) };
    await old.table('documents').put({ owner: 'guest', state: legacy, revision: 7, lastSynced: null }); old.close();
    const next = new GrowthDatabase(name);
    try { const doc = await next.documents.get('guest'); expect(doc?.state.schemaVersion).toBe(4); expect(doc?.state.story).toEqual([]); expect(doc?.state.preferences.largeText).toBe(false); expect(doc?.revision).toBe(7); expect(doc?.state.preferences.fastingPreference).toBe('unspecified'); }
    finally { next.close(); await Dexie.delete(name); }
  });
  it('reconciles pending milestones once and keeps another account isolated', async () => {
    const first = setup(); await execute('user-a', first); await execute('user-b', setup());
    const base = await getDocument('user-a');
    const complete: Command = { id: crypto.randomUUID(), at: now + 1, action: { type: 'habit.complete', id: first.id } };
    await execute('user-a', complete);
    await reconcile('user-a', { ...base, revision: 1 }, [first.id]);
    const replayed = await getDocument('user-a'); expect(replayed.state.story).toHaveLength(1);
    await reconcile('user-a', { ...replayed, revision: 2 }, [complete.id]);
    expect((await getDocument('user-a')).state.story).toHaveLength(1);
    expect((await getDocument('user-b')).state.story).toHaveLength(0);
  });
  it('retains larger text when only tracking changes', async () => {
    await execute('guest', setup());
    await execute('guest', { id: crypto.randomUUID(), at: now, action: { type: 'preferences', preferences: { largeText: true } } });
    await execute('guest', { id: crypto.randomUUID(), at: now, action: { type: 'preferences', preferences: { tracking: true } } });
    expect((await getDocument('guest')).state.preferences.largeText).toBe(true);
  });
});

 it('keeps the personal fasting preference when other preferences change', async () => {
    await execute('guest', setup());
    await execute('guest', { id: crypto.randomUUID(), at: now, action: { type: 'preferences', preferences: { fastingPreference: 'personal' } } });
    await execute('guest', { id: crypto.randomUUID(), at: now, action: { type: 'preferences', preferences: { tracking: true } } });
    expect((await getDocument('guest')).state.preferences.fastingPreference).toBe('personal');
  });
