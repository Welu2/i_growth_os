import Dexie, { type Table } from 'dexie';
import { applyCommand, commandSchema, initialState, persistedStateSchema as stateSchema, type Command, type GrowthState } from '../domain/model';
import { z } from 'zod';

export interface Document { owner: string; state: GrowthState; revision: number; lastSynced: number | null; }
export interface Pending { id: string; owner: string; command: Command; error?: string; }
export class GrowthDatabase extends Dexie {
  documents!: Table<Document, string>;
  outbox!: Table<Pending, string>;
  constructor(name = 'i-growth-os') {
    super(name);
    this.version(1).stores({ documents: 'owner', outbox: 'id, owner' });
    this.version(4).stores({ documents: 'owner', outbox: 'id, owner' }).upgrade(async (tx) => { await tx.table('documents').toCollection().modify((doc) => { doc.state = stateSchema.parse(doc.state); }); });
    this.version(3).stores({ documents: 'owner', outbox: 'id, owner' }).upgrade(async (tx) => { await tx.table('documents').toCollection().modify((doc) => { doc.state = stateSchema.parse(doc.state); }); });
    this.version(2).stores({ documents: 'owner', outbox: 'id, owner' }).upgrade(async (tx) => { await tx.table('documents').toCollection().modify((doc) => { doc.state = stateSchema.parse(doc.state); }); });
  }
}
export const db = new GrowthDatabase();
export async function getDocument(owner: string): Promise<Document> {
  return db.transaction('rw', db.documents, async () => {
    const existing = await db.documents.get(owner);
    if (existing) { const doc = { ...existing, state: stateSchema.parse(existing.state) }; await db.documents.put(doc); return doc; }
    const doc = { owner, state: initialState(), revision: 0, lastSynced: null };
    await db.documents.put(doc); return doc;
  });
}
export async function execute(owner: string, raw: Command): Promise<void> {
  const command = commandSchema.parse(raw);
  await db.transaction('rw', db.documents, db.outbox, async () => {
    const doc = await db.documents.get(owner) ?? { owner, state: initialState(), revision: 0, lastSynced: null };
    if (owner !== 'guest' && command.action.type === 'wallet.buy') throw new Error('Account purchases must be confirmed online.');
    const state = applyCommand(doc.state, command);
    await db.documents.put({ ...doc, state });
    if (owner !== 'guest') await db.outbox.put({ id: command.id, owner, command });
  });
}
export async function reconcile(owner: string, remote: Document, acknowledged: string[], rejected: { id: string; error: string }[] = []): Promise<void> {
  await db.transaction('rw', db.documents, db.outbox, async () => {
    const current = await db.documents.get(owner);
    if (!current || current.revision > remote.revision) return;
    if (remote.owner !== owner) throw new Error('Account mismatch during synchronization.');
    const owned = await db.outbox.where('owner').equals(owner).toArray();
    await db.outbox.bulkDelete(owned.filter((p) => acknowledged.includes(p.id)).map((p) => p.id));
    for (const row of rejected) if (owned.some((p) => p.id === row.id)) await db.outbox.update(row.id, { error: row.error });
    let state = stateSchema.parse(remote.state);
    const pending = await db.outbox.where('owner').equals(owner).toArray();
    pending.sort((a, b) => a.command.at - b.command.at);
    for (const item of pending) {
      if (item.error || item.command.action.type === 'wallet.buy') continue;
      try { state = applyCommand(state, item.command); await db.outbox.update(item.id, { error: undefined }); }
      catch (error) { await db.outbox.update(item.id, { error: error instanceof Error ? error.message : 'Review this change.' }); }
    }
    await db.documents.put({ ...remote, owner, state, lastSynced: Date.now() });
  });
}
const backupSchema = z.object({ format: z.literal('i-growth-os-backup'), version: z.literal(1), state: stateSchema });
export function validateBackup(text: string): GrowthState {
  if (text.length > 2_000_000) throw new Error('Backup exceeds the 2 MB limit.');
  const state = backupSchema.parse(JSON.parse(text)).state;
  for (const r of state.resources) { if (r.url) new URL(r.url); }
  const coins = state.ledger.reduce((sum, entry) => sum + entry.coins, 0);
  if (coins < 0 || new Set(state.ledger.map((entry) => entry.id)).size !== state.ledger.length) throw new Error('Invalid wallet history.');
  return state;
}
export async function restoreGuest(text: string) {
  const state = validateBackup(text);
  await db.documents.put({ owner: 'guest', state, revision: 0, lastSynced: null });
}
export async function clearOwner(owner: string) {
  await db.transaction('rw', db.documents, db.outbox, async () => { await db.documents.delete(owner); await db.outbox.where('owner').equals(owner).delete(); });
}
