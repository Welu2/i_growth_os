import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearOwner, db, execute, getDocument, reconcile } from '../src/data/database';
import { initialState, type Command } from '../src/domain/model';
const fixture = vi.hoisted(() => ({ owner: 'user-a' as string | null }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getSession: async () => ({ data: { session: fixture.owner ? { user: { id: fixture.owner }, access_token: 'test-token' } : null } }) } }) }));
let cloud: typeof import('../src/services/cloud');
beforeEach(async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://auth.example'); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-test-key'); vi.stubEnv('VITE_API_URL', 'https://api.example');
  vi.stubGlobal('navigator', { onLine: true }); fixture.owner = 'user-a';
  cloud = await import('../src/services/cloud');
  await db.documents.clear(); await db.outbox.clear();
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const command = (): Command => ({ id: crypto.randomUUID(), at: Date.now(), action: { type: 'goal.add', id: crypto.randomUUID(), title: 'Private goal' } });
describe('account sync boundaries', () => {
  it('never sends one account’s pending commands with another account’s token', async () => {
    await execute('user-a', command()); fixture.owner = 'user-b';
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(cloud.syncAccount('user-a')).rejects.toThrow('account changed');
    expect(fetch).not.toHaveBeenCalled(); expect(await db.outbox.count()).toBe(1);
  });
  it('does not send private assistant context after switching accounts', async () => {
    fixture.owner = 'user-b'; const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const { requestAssistant } = await import('../src/services/assistant');
    await expect(requestAssistant({ topic: 'Private draft', minutes: 15, mode: 'next-step' }, new AbortController().signal, 'user-a')).rejects.toThrow('account changed');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not recreate a cleared account when a sync response arrives late', async () => {
    const c = command(); await execute('user-a', c);
    vi.stubGlobal('fetch', vi.fn(async () => { await clearOwner('user-a'); return Response.json({ protocol: 4, state: initialState(), revision: 1, accepted: [c.id], rejected: [] }); }));
    await cloud.syncAccount('user-a');
    expect(await db.documents.get('user-a')).toBeUndefined(); expect(await db.outbox.count()).toBe(0);
  });
  it('does not acknowledge or reject another account’s outbox rows', async () => {
    const a = command(), b = command(); await execute('user-a', a); await execute('user-b', b);
    const doc = await getDocument('user-a');
    await reconcile('user-a', { ...doc, revision: 1 }, [b.id], [{ id: b.id, error: 'foreign rejection' }]);
    expect((await db.outbox.get(b.id))?.error).toBeUndefined(); expect(await db.outbox.get(b.id)).toBeDefined();
    await expect(reconcile('user-a', { ...doc, owner: 'user-b', revision: 2 }, [])).rejects.toThrow('mismatch');
  });
  it('rejects obsolete protocol responses without acknowledging pending work', async () => {
    const c = command(); await execute('user-a', c);
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ protocol: 3, state: initialState(), revision: 1, accepted: [c.id], rejected: [] })));
    await expect(cloud.syncAccount('user-a')).rejects.toThrow(); expect(await db.outbox.get(c.id)).toBeDefined();
  });
  it('checks the owner before queueing a purchase', async () => {
    await getDocument('user-a'); fixture.owner = 'user-b';
    await expect(cloud.purchaseOnline('user-a', { id: crypto.randomUUID(), at: Date.now(), action: { type: 'wallet.buy', item: 'fern' } })).rejects.toThrow('account changed');
    expect(await db.outbox.count()).toBe(0);
  });
});
