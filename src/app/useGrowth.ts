import { useCallback, useEffect, useRef, useState } from 'react';
import { liveQuery } from 'dexie';
import { auth, purchaseOnline, syncAccount } from '../services/cloud';
import { clearOwner, db, execute, getDocument, type Document, type Pending } from '../data/database';
import { type Action, type Command } from '../domain/model';
import type { ActivityContext } from '../domain/activity';
import { useAutomaticActivity } from './useAutomaticActivity';

export function useGrowth(context: ActivityContext) {
  const [owner, setOwner] = useState('guest');
  const activeOwner = useRef('guest');
  const [recovery, setRecovery] = useState(() => new URLSearchParams(location.search).get('recovery') === '1');
  const [document, setDocument] = useState<Document>();
  const [pending, setPending] = useState<Pending[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  useEffect(() => {
    const onOnline = () => setOnline(navigator.onLine);
    window.addEventListener('online', onOnline); window.addEventListener('offline', onOnline);
    const subscription = auth?.auth.onAuthStateChange((event, session) => {
      const next = session?.user.id ?? 'guest';
      const previous = activeOwner.current;
      activeOwner.current = next;
      if (previous !== next) { setError(''); setNotice(''); setSyncing(false); }
      setOwner(next);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT' && previous !== 'guest') {
        setRecovery(false);
        void clearOwner(previous).catch(() => setError('Could not clear the signed-out workspace. Close this browser before sharing the device.'));
      }
    });
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOnline); subscription?.data.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    void getDocument(owner).then(() => {
      if (cancelled) return;
      const subscription = liveQuery(async () => ({ doc: await db.documents.get(owner), pending: await db.outbox.where('owner').equals(owner).toArray() })).subscribe({
        next: ({ doc, pending }) => { if (!cancelled && activeOwner.current === owner) { setDocument(doc); setPending(pending); } }, error: () => setError('Local storage is unavailable or incompatible. Export existing data before clearing browser storage.'),
      });
      unsubscribe = () => subscription.unsubscribe();
    }).catch(() => setError('Your saved data could not be opened. Try allowing browser storage; do not clear it if you need to recover progress.'));
    return () => { cancelled = true; unsubscribe?.(); };
  }, [owner]);
  const sync = useCallback(async () => {
    if (owner === 'guest' || !navigator.onLine) return;
    setSyncing(true);
    try { await syncAccount(owner); } catch (e) { if (activeOwner.current === owner) setError(e instanceof Error ? e.message : 'Sync failed. Changes remain saved on this device.'); }
    finally { if (activeOwner.current === owner) setSyncing(false); }
  }, [owner]);
  useEffect(() => {
    if (owner === 'guest' || !online) return;
    const timer = window.setTimeout(() => { void sync(); }, 1000);
    const refresh = window.setInterval(() => { if (documentVisible()) void sync(); }, 60_000);
    return () => { clearTimeout(timer); clearInterval(refresh); };
  }, [owner, online, pending.length, sync]);
  const dispatch = useCallback(async (action: Action, success?: string) => {
    if (activeOwner.current !== owner) return false;
    const command: Command = { id: crypto.randomUUID(), at: Date.now(), action };
    try {
      if (action.type === 'wallet.buy' && owner !== 'guest') await purchaseOnline(owner, command);
      else await execute(owner, command);
      if (success && activeOwner.current === owner) setNotice(success);
      return true;
    } catch (e) { if (activeOwner.current === owner) setError(e instanceof Error ? e.message : 'Could not save this change.'); return false; }
  }, [owner]);
  const activityStatus = useAutomaticActivity(owner, Boolean(document?.owner === owner && document?.state.profile && document?.state.preferences.tracking), context, document?.state.preferences.activityExclusions ?? [], dispatch);
  return { recovery, setRecovery, activityStatus, owner, state: document?.owner === owner ? document.state : undefined, lastSynced: document?.owner === owner ? document.lastSynced : undefined, pending: pending.filter((p) => p.owner === owner), error, notice, online, syncing, dispatch, sync, setError, setNotice };
}
function documentVisible() { return globalThis.document.visibilityState === 'visible'; }
export type GrowthController = ReturnType<typeof useGrowth>;
