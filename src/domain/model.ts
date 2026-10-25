import { z } from 'zod';
import { reconcileStory } from './story';
import { ACTIVITY_CONTEXTS, emptyActivity } from './activity';

export const id = z.string().uuid();
const title = z.string().trim().min(1).max(160);
const time = z.number().int().nonnegative().max(8_640_000_000_000_000);
export const companionType = z.enum(['panda', 'dog', 'seedling', 'fox']);
const timezone = z.string().max(80).refine((value) => {
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
}, 'Choose a valid timezone.');
export const profileSchema = z.object({ name: title, companionName: title, companionType, timezone });
const habit = z.object({ id, title, days: z.array(z.number().int().min(0).max(6)).min(1).max(7), archived: z.boolean() });
const goal = z.object({ id, title, completed: z.boolean() });
export const assignmentDetails = z.object({ resourceId: id.nullable(), objective: title, instructions: z.string().trim().min(1).max(2000), minutes: z.number().int().min(1).max(120), criteria: title, basis: z.enum(['topic', 'resource-title', 'selected-notes']), source: z.enum(['AI response', 'Offline template']), reflection: z.string().max(2000).default('') });
const exercise = z.object({ id, title, completed: z.boolean(), details: assignmentDetails.optional() });
const resource = z.object({ id, title, url: z.string().max(500).refine((value) => { try { parseVideo(value); return true; } catch { return false; } }, 'Invalid video URL'), notes: z.string().max(5000), revision: z.number().int().nonnegative(), deleted: z.boolean() });
const session = z.object({ id, title, targetMinutes: z.number().int().min(1).max(120), startedAt: time, runningSince: time.nullable(), elapsedMs: time, endedAt: time.nullable(), cancelled: z.boolean(), segments: z.array(z.object({ start: time, end: time }).refine((r) => r.end >= r.start)).max(2000).optional() });
const ledger = z.object({ id: z.string().max(200), coins: z.number().int(), xp: z.number().int().nonnegative(), reason: title, at: time });
export const activitySchema = z.object({ id: z.string().min(1).max(160), device: title, app: title, start: time, end: time, category: z.enum(['focus', 'learning', 'other']), source: z.literal('imported') }).refine((row) => row.end > row.start && row.end - row.start <= 86_400_000, 'Activity intervals must be between zero and 24 hours.');
export const stateSchema = z.object({
  schemaVersion: z.literal(4), profile: profileSchema.nullable(),
  story: z.array(z.object({ id: z.enum(['begin', 'rhythm', 'practice', 'focus', 'goal']), version: z.union([z.literal(1), z.literal(2)]), eventId: z.string().max(200), at: time })).max(5),
  playback: z.array(z.object({ id, resourceId: id, start: time, end: time }).refine((r) => r.end > r.start && r.end - r.start <= 60_000)).max(5000),
  activityImportedAt: time.nullable(),
  activityMinutes: z.record(z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.object({ today: z.number().int().nonnegative(), learn: z.number().int().nonnegative(), progress: z.number().int().nonnegative(), settings: z.number().int().nonnegative(), assistant: z.number().int().nonnegative() })),
  habits: z.array(habit).max(100), goals: z.array(goal).max(100), exercises: z.array(exercise).max(1000),
  resources: z.array(resource).max(500), sessions: z.array(session).max(2000), ledger: z.array(ledger).max(10000),
  inventory: z.array(z.string().max(40)).max(20), equipped: z.string().max(40).nullable(),
  completions: z.array(z.string().max(160)).max(10000), applied: z.array(id).max(20000),
  activity: z.array(activitySchema).max(2000), visibleMinutes: z.record(z.string().max(10), z.number().nonnegative()),
  preferences: z.object({ activityExclusions: z.array(z.enum(ACTIVITY_CONTEXTS)).max(5), tracking: z.boolean(), reducedMotion: z.boolean(), largeText: z.boolean(), lifestyle: z.boolean(), fastingPreference: z.enum(['unspecified', 'plant-based', 'personal']), theme: z.enum(['dark', 'light']) }),
  meals: z.array(z.object({ id, name: title, note: z.string().max(500), at: time })).max(500),
});
export type GrowthState = z.infer<typeof stateSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type CompanionType = z.infer<typeof companionType>;
/** Upgrade known storage versions; future schemas fail closed. */
export const persistedStateSchema = z.preprocess((raw) => {
  if (raw && typeof raw === 'object' && 'schemaVersion' in raw && raw.schemaVersion === 1) {
    const prefs = 'preferences' in raw && raw.preferences && typeof raw.preferences === 'object' ? raw.preferences : {};
    return { ...raw, schemaVersion: 4, story: [], playback: [], activityImportedAt: null, activityMinutes: {}, preferences: { ...prefs, fastingPreference: 'unspecified', largeText: false, activityExclusions: ['settings'] } };
  }
  if (raw && typeof raw === 'object' && 'schemaVersion' in raw && raw.schemaVersion === 2) {
    const prefs = 'preferences' in raw && raw.preferences && typeof raw.preferences === 'object' ? raw.preferences : {};
    return { ...raw, schemaVersion: 4, activityMinutes: {}, preferences: { ...prefs, fastingPreference: 'unspecified', activityExclusions: ['settings'] } };
  }
  if (raw && typeof raw === 'object' && 'schemaVersion' in raw && raw.schemaVersion === 3) {
    const prefs = 'preferences' in raw && raw.preferences && typeof raw.preferences === 'object' ? raw.preferences : {};
    return { ...raw, schemaVersion: 4, preferences: { ...prefs, fastingPreference: 'unspecified' } };
  }
  return raw;
}, stateSchema).transform(reconcileStory);
export const commandSchema = z.object({
  id, at: time,
  action: z.discriminatedUnion('type', [
    z.object({ type: z.literal('onboard'), profile: profileSchema, goal: title, habit: title }),
    z.object({ type: z.literal('profile'), profile: profileSchema }),
    z.object({ type: z.literal('habit.add'), id, title, days: habit.shape.days }),
    z.object({ type: z.literal('habit.archive'), id }),
    z.object({ type: z.literal('habit.restore'), id }),
    z.object({ type: z.literal('habit.schedule'), id, days: habit.shape.days }),
    z.object({ type: z.literal('habit.complete'), id }),
    z.object({ type: z.literal('goal.add'), id, title }),
    z.object({ type: z.literal('goal.complete'), id }),
    z.object({ type: z.literal('exercise.add'), id, title }),
    z.object({ type: z.literal('exercise.complete'), id }),
    z.object({ type: z.literal('plan.save'), tasks: z.array(z.object({ id, title, details: assignmentDetails })).min(1).max(5) }),
    z.object({ type: z.literal('exercise.reflect'), id, reflection: z.string().max(2000) }),
    z.object({ type: z.literal('focus.start'), id, title, minutes: z.number().int().min(1).max(120) }),
    z.object({ type: z.literal('focus.pause'), id }),
    z.object({ type: z.literal('focus.resume'), id }),
    z.object({ type: z.literal('focus.finish'), id }),
    z.object({ type: z.literal('focus.cancel'), id }),
    z.object({ type: z.literal('wallet.buy'), item: z.string().max(40) }),
    z.object({ type: z.literal('wallet.equip'), item: z.string().max(40).nullable() }),
    z.object({ type: z.literal('resource.add'), id, title, url: z.string().max(500) }),
    z.object({ type: z.literal('resource.notes'), id, notes: z.string().max(5000), revision: z.number().int().nonnegative() }),
    z.object({ type: z.literal('resource.delete'), id }),
    z.object({ type: z.literal('preferences'), preferences: stateSchema.shape.preferences.partial() }),
    z.object({ type: z.literal('activity.import'), rows: z.array(activitySchema).min(1).max(2000) }),
    z.object({ type: z.literal('activity.clear') }),
    z.object({ type: z.literal('visible.minute'), minute: z.number().int().nonnegative(), context: z.enum(ACTIVITY_CONTEXTS).optional() }),
    z.object({ type: z.literal('playback.record'), id, resourceId: id, start: time, end: time }),
    z.object({ type: z.literal('meal.add'), id, name: title, note: z.string().max(500) }),
    z.object({ type: z.literal('meal.delete'), id }),
  ]),
});
export type Command = z.infer<typeof commandSchema>;
export type Action = Command['action'];
export const draftSchema = z.object({ title, message: z.string().trim().min(1).max(2000), steps: z.array(title).min(1).max(5) });
export type AssistantDraft = z.infer<typeof draftSchema>;
export const assistantRequest = z.object({ topic: z.string().trim().min(3).max(500), minutes: z.number().int().min(5).max(120), mode: z.enum(['next-step', 'learning-plan', 'encouragement']), resourceId: id.optional(), excerpt: z.string().trim().max(2000).optional() });
export type AssistantRequest = z.infer<typeof assistantRequest>;

export function initialState(): GrowthState {
  return { schemaVersion: 4, activityMinutes: {}, story: [], playback: [], activityImportedAt: null, profile: null, habits: [], goals: [], exercises: [], resources: [], sessions: [], ledger: [], inventory: [], equipped: null, completions: [], applied: [], activity: [], visibleMinutes: {}, preferences: { activityExclusions: ['settings'], tracking: false, reducedMotion: false, largeText: false, lifestyle: false, fastingPreference: 'unspecified', theme: 'dark' }, meals: [] };
}

export const SHOP = [
  { id: 'fern', title: 'Forest garden', price: 30, icon: '🌿', description: 'A little green space for your companion.' },
  { id: 'stars', title: 'Starlight sky', price: 60, icon: '✨', description: 'A quiet sky for your next big idea.' },
  { id: 'sunrise', title: 'Golden sunrise', price: 90, icon: '🌅', description: 'A warm start, every time you return.' },
] as const;
export const REWARDS = { habit: { xp: 25, coins: 0 }, exercise: { xp: 30, coins: 10 }, goal: { xp: 50, coins: 20 }, focus: { xp: 20, coins: 5 } };
export const balance = (s: GrowthState) => s.ledger.reduce((n, row) => n + row.coins, 0);
export const totalXp = (s: GrowthState) => s.ledger.reduce((n, row) => n + row.xp, 0);
export const level = (s: GrowthState) => Math.floor(totalXp(s) / 150) + 1;
export function localDay(at: number, zone: string): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at);
  return ['year', 'month', 'day'].map((type) => parts.find((p) => p.type === type)!.value).join('-');
}
export function weekday(at: number, zone: string): number {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(new Intl.DateTimeFormat('en', { timeZone: zone, weekday: 'short' }).format(at));
}
export const sessionElapsed = (s: GrowthState['sessions'][number], now: number) => Math.min(s.targetMinutes * 60_000, s.elapsedMs + (s.runningSince === null ? 0 : Math.max(0, now - s.runningSince)));

export function parseVideo(input: string): { provider: 'YouTube' | 'TikTok'; url: string; embed: string } {
  let url: URL;
  try { url = new URL(input); } catch { throw new Error('Paste a full YouTube or TikTok video link.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Use a public HTTPS video link.');
  const host = url.hostname.toLowerCase();
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) {
    const videoId = host === 'youtu.be' ? url.pathname.slice(1) : url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(shorts|embed)\/([^/]+)$/.exec(url.pathname)?.[2];
    if (videoId && /^[\w-]{11}$/.test(videoId)) return { provider: 'YouTube', url: `https://www.youtube.com/watch?v=${videoId}`, embed: `https://www.youtube-nocookie.com/embed/${videoId}` };
  }
  if (['tiktok.com', 'www.tiktok.com'].includes(host)) {
    const match = /^\/@[\w.-]+\/video\/(\d{15,25})\/?$/.exec(url.pathname);
    if (match) return { provider: 'TikTok', url: `https://www.tiktok.com${url.pathname}`, embed: `https://www.tiktok.com/player/v1/${match[1]}` };
  }
  throw new Error('Use a full YouTube video link or tiktok.com/@creator/video/… link. Short TikTok links must be opened first.');
}

/** All reward and wallet changes pass through this deterministic command handler. */
export function applyCommand(previous: GrowthState, raw: Command): GrowthState {
  const command = commandSchema.parse(raw);
  const s = persistedStateSchema.parse(previous);
  if (s.applied.includes(command.id)) return s;
  const a = command.action;
  const day = localDay(command.at, s.profile?.timezone ?? 'UTC');
  const award = (key: string, kind: keyof typeof REWARDS, reason: string) => {
    if (s.ledger.some((row) => row.id === key)) return;
    // Limits prevent accidental runaway earning; rewards remain self-reported, not proof of attention.
    const today = s.ledger.filter((row) => row.id.startsWith(`${kind}:`) && localDay(row.at, s.profile?.timezone ?? 'UTC') === day);
    if (today.length >= ({ habit: 20, exercise: 10, goal: 5, focus: 8 }[kind])) return;
    s.ledger.push({ id: key, ...REWARDS[kind], reason, at: command.at });
  };
  const requireRecord = <T>(value: T | undefined): T => { if (!value) throw new Error('This item is no longer available.'); return value; };
  switch (a.type) {
    case 'onboard':
      if (s.profile) throw new Error('Your profile already exists.');
      s.profile = a.profile;
      s.goals.push({ id: command.id, title: a.goal, completed: false });
      s.habits.push({ id: command.id, title: a.habit, days: [0, 1, 2, 3, 4, 5, 6], archived: false });
      break;
    case 'profile':
      if (s.profile && s.profile.timezone !== a.profile.timezone) throw new Error('Timezone changes are not supported for an existing profile.');
      s.profile = a.profile; break;
    case 'habit.add': if (!s.habits.some((h) => h.id === a.id)) s.habits.push({ ...a, archived: false }); break;
    case 'habit.archive': requireRecord(s.habits.find((h) => h.id === a.id)).archived = true; break;
    case 'habit.restore': requireRecord(s.habits.find((h) => h.id === a.id)).archived = false; break;
    case 'habit.schedule': requireRecord(s.habits.find((h) => h.id === a.id)).days = [...new Set(a.days)]; break;
    case 'habit.complete': {
      const h = requireRecord(s.habits.find((h) => h.id === a.id && !h.archived));
      if (!h.days.includes(weekday(command.at, s.profile?.timezone ?? 'UTC'))) throw new Error('This habit is not scheduled today.');
      const key = `habit:${a.id}:${day}`;
      if (!s.completions.includes(key)) s.completions.push(key);
      award(key, 'habit', h.title);
      break;
    }
    case 'goal.add': if (!s.goals.some((g) => g.id === a.id)) s.goals.push({ id: a.id, title: a.title, completed: false }); break;
    case 'exercise.add': if (!s.exercises.some((e) => e.id === a.id)) s.exercises.push({ id: a.id, title: a.title, completed: false }); break;
    case 'plan.save': {
      if (new Set(a.tasks.map((t) => t.id)).size !== a.tasks.length) throw new Error('Each assignment needs its own identity.');
      for (const task of a.tasks) {
        if (s.exercises.some((e) => e.id === task.id)) continue;
        if (task.details.resourceId) requireRecord(s.resources.find((r) => r.id === task.details.resourceId && !r.deleted));
        s.exercises.push({ ...task, completed: false });
      }
      break;
    }
    case 'exercise.reflect': {
      const item = requireRecord(s.exercises.find((e) => e.id === a.id));
      if (!item.details) throw new Error('This task has no assignment details.');
      item.details.reflection = a.reflection; break;
    }
    case 'goal.complete': case 'exercise.complete': {
      const kind = a.type === 'goal.complete' ? 'goal' : 'exercise';
      const item = requireRecord((kind === 'goal' ? s.goals : s.exercises).find((item) => item.id === a.id));
      item.completed = true;
      award(`${kind}:${a.id}`, kind, item.title);
      break;
    }
    case 'focus.start':
      if (s.sessions.some((session) => session.endedAt === null)) throw new Error('Finish or cancel your current session first.');
      if (!s.sessions.some((session) => session.id === a.id)) s.sessions.push({ id: a.id, title: a.title, targetMinutes: a.minutes, startedAt: command.at, runningSince: command.at, elapsedMs: 0, endedAt: null, cancelled: false, segments: [] });
      break;
    case 'focus.pause': case 'focus.resume': case 'focus.finish': case 'focus.cancel': {
      const session = requireRecord(s.sessions.find((session) => session.id === a.id));
      if (session.endedAt !== null) break;
      if (command.at < session.startedAt || (session.runningSince !== null && command.at < session.runningSince)) throw new Error('Your clock changed. Restore the correct time before continuing.');
      if (a.type === 'focus.resume') { if (session.runningSince === null) session.runningSince = command.at; break; }
      const elapsed = sessionElapsed(session, command.at);
      if (session.runningSince !== null && session.segments && elapsed > session.elapsedMs) session.segments.push({ start: session.runningSince, end: session.runningSince + elapsed - session.elapsedMs });
      session.elapsedMs = elapsed;
      session.runningSince = null;
      if (a.type !== 'focus.pause') {
        if (a.type === 'focus.finish' && session.elapsedMs < session.targetMinutes * 60_000) throw new Error('Your session has not reached its planned duration.');
        session.endedAt = command.at;
        session.cancelled = a.type === 'focus.cancel';
        if (!session.cancelled) award(`focus:${session.id}`, 'focus', session.title);
      }
      break;
    }
    case 'wallet.buy': {
      const item = requireRecord(SHOP.find((item) => item.id === a.item));
      if (s.inventory.includes(item.id)) break;
      if (balance(s) < item.price) throw new Error('You need more Growth Coins for this item.');
      s.ledger.push({ id: `purchase:${item.id}`, coins: -item.price, xp: 0, reason: item.title, at: command.at });
      s.inventory.push(item.id); s.equipped = item.id;
      break;
    }
    case 'wallet.equip': if (a.item !== null && !s.inventory.includes(a.item)) throw new Error('You do not own this item.'); else s.equipped = a.item; break;
    case 'resource.add':
      if (!s.resources.some((r) => r.id === a.id)) s.resources.push({ id: a.id, title: a.title, url: parseVideo(a.url).url, notes: '', revision: 0, deleted: false });
      break;
    case 'resource.notes': {
      const r = requireRecord(s.resources.find((r) => r.id === a.id && !r.deleted));
      if (a.revision !== r.revision) throw new Error('These notes changed on another device. Copy your draft, refresh, and merge the changes.');
      r.notes = a.notes; r.revision += 1; break;
    }
    case 'resource.delete': requireRecord(s.resources.find((r) => r.id === a.id)).deleted = true; break;
    case 'preferences': s.preferences = { ...s.preferences, ...a.preferences }; break;
    case 'activity.import':
      if (a.rows.some((r) => r.end > command.at + 300_000 || r.start < command.at - 366 * 86_400_000)) throw new Error('Activity must be within the last year and not in the future.');
      for (const row of a.rows) if (!s.activity.some((existing) => existing.id === row.id)) s.activity.push(row);
      s.activityImportedAt = command.at;
      break;
    case 'activity.clear': s.activity = []; s.visibleMinutes = {}; s.activityMinutes = {}; s.playback = []; s.activityImportedAt = null; break;
    case 'playback.record': {
      if (!s.preferences.tracking || s.preferences.activityExclusions.includes('learn')) break;
      requireRecord(s.resources.find((r) => r.id === a.resourceId && !r.deleted));
      if (a.end <= a.start || a.end - a.start > 60_000 || a.end > command.at || command.at - a.end > 60_000) throw new Error('Invalid playback interval.');
      if (!s.playback.some((r) => r.id === a.id)) s.playback.push({ id: a.id, resourceId: a.resourceId, start: a.start, end: a.end });
      break;
    }
    case 'visible.minute': {
      if (!s.preferences.tracking || (a.context && s.preferences.activityExclusions.includes(a.context)) || Math.abs(a.minute * 60_000 - command.at) > 60_000) break;
      // One visible minute per account across tabs, distinct from elapsed focus time.
      const key = `visible:${a.minute}`;
      if (!s.completions.includes(key)) {
        const observedDay = localDay(a.minute * 60_000, s.profile?.timezone ?? 'UTC');
        s.completions.push(key); s.visibleMinutes[observedDay] = (s.visibleMinutes[observedDay] ?? 0) + 1;
        if (a.context) { const counts = s.activityMinutes[observedDay] ?? emptyActivity(); counts[a.context] += 1; s.activityMinutes[observedDay] = counts; }
      }
      break;
    }
    case 'meal.add': if (!s.meals.some((m) => m.id === a.id)) s.meals.push({ id: a.id, name: a.name, note: a.note, at: command.at }); break;
    case 'meal.delete': s.meals = s.meals.filter((m) => m.id !== a.id); break;
  }
  s.applied.push(command.id);
  return stateSchema.parse(reconcileStory(s));
}

export function unionDuration(rows: { start: number; end: number }[]): number {
  const intervals = [...rows].sort((a, b) => a.start - b.start);
  let total = 0, end = 0;
  for (const row of intervals) { total += Math.max(0, row.end - Math.max(end, row.start)); end = Math.max(end, row.end); }
  return total;
}
