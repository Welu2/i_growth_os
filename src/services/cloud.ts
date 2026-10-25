import { createClient } from '@supabase/supabase-js';
import { db, reconcile, type Document } from '../data/database';
import { persistedStateSchema as stateSchema, type Command } from '../domain/model';
import { z } from 'zod';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const auth = url && key ? createClient(url, key) : null;
export const apiUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
export const cloudConfigured = Boolean(auth && apiUrl);
export async function api(path: string, body?: unknown, signal?: AbortSignal, method?: string, expectedOwner?: string): Promise<unknown> {
  if (!auth || !apiUrl) throw new Error('Cloud services are not configured. Local features remain available.');
  const { data } = await auth.auth.getSession();
  if (!data.session) throw new Error('Sign in to use this connected feature.');
  if (expectedOwner && data.session.user.id !== expectedOwner) throw new Error('The active account changed. Retry from its own workspace.');
  const response = await fetch(`${apiUrl}${path}`, {
    method: method ?? (body === undefined ? 'GET' : 'POST'), signal: signal ?? AbortSignal.timeout(25_000),
    headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store',
  });
  const json = await response.json() as { error?: string };
  if (!response.ok) throw new Error(json.error ?? 'The connected service is unavailable. Please try again.');
  return json;
}
const syncResult = z.object({ protocol: z.literal(4), state: stateSchema, revision: z.number().int(), accepted: z.array(z.string()), rejected: z.array(z.object({ id: z.string(), error: z.string() })) });
const running = new Map<string, Promise<void>>();
export function syncAccount(owner: string): Promise<void> {
  if (owner === 'guest') return Promise.resolve();
  const existing = running.get(owner);
  if (existing) return existing;
  const run = async () => {
    const pending = await db.outbox.where('owner').equals(owner).toArray();
    const commands = pending.filter((p) => !p.error).sort((a, b) => a.command.at - b.command.at).slice(0, 50).map((p) => p.command);
    const result = syncResult.parse(await api('/sync', { protocol: 4, commands }, undefined, undefined, owner));
    // A sign-out can happen during the request. Do not recreate a cleared account cache.
    const { data } = await auth!.auth.getSession();
    if (data.session?.user.id !== owner) return;
    const remote: Document = { owner, state: result.state, revision: result.revision, lastSynced: Date.now() };
    await reconcile(owner, remote, result.accepted, result.rejected);
  };
  const task = typeof navigator !== 'undefined' && navigator.locks ? navigator.locks.request(`growth-sync:${owner}`, run) : run();
  const completion = task.finally(() => { running.delete(owner); });
  running.set(owner, completion);
  return completion;
}
export async function purchaseOnline(owner: string, command: Command) {
  if (!navigator.onLine) throw new Error('Reconnect to confirm an account purchase.');
  const { data } = await auth!.auth.getSession();
  if (data.session?.user.id !== owner) throw new Error('The active account changed. Reopen your workspace before purchasing.');
  await db.transaction('rw', db.documents, db.outbox, async () => {
    if (!await db.documents.get(owner)) throw new Error('This workspace was closed. Sign in again.');
    await db.outbox.put({ id: command.id, owner, command });
  });
  await syncAccount(owner);
  const pending = await db.outbox.get(command.id);
  if (pending) throw new Error(pending.error ?? 'Purchase is pending. Use Sync now to retry safely.');
}
