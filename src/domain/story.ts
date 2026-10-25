import type { GrowthState } from './model';

export const STORY = [
  { id: 'begin', title: 'A place to begin', next: 'Complete a daily habit', animal: 'A home of your own', plant: 'The first new leaf', text: 'That first small action made a place for something new. There is room here to try, to rest, and to begin again.', after: 'The first step is behind you. Your little corner is starting to feel like home.' },
  { id: 'rhythm', title: 'Finding a rhythm', next: 'Complete habits on three different days', animal: 'A cozy corner', plant: 'A path through the garden', text: 'You returned on three different days. Between those visits, a little path appeared. It does not matter how long the spaces between your steps were.', after: 'The path stays here even when you take a break. Come back whenever you are ready.' },
  { id: 'practice', title: 'Room to learn', next: 'Complete an independent practice task', animal: 'A desk for new ideas', plant: 'A garden reading nook', text: 'An idea became something you tried for yourself. A book opens in your little world, with plenty of blank pages for what comes next.', after: 'Some attempts will be messy. There is a place for those pages here, too.' },
  { id: 'focus', title: 'A flourishing home', next: 'Complete three independent practice tasks', animal: 'A warm reading lamp', plant: 'A garden lantern', text: 'The time you made for your own growth has brought a warm light into this little world. It is a memory of making room, not a measure of perfect attention.', after: 'The light is yours to keep. Rest belongs in a growing life as much as practice does.' },
  { id: 'goal', title: 'A wider world', next: 'Complete a goal', animal: 'A window to new places', plant: 'A flowering garden', text: 'Something you worked toward is complete. The view opens a little wider, and your world makes room for another possibility.', after: 'There is no final version of you to hurry toward. Choose a new direction when it feels right.' },
] as const;
export type StoryId = typeof STORY[number]['id'];

/** Versioned milestones from saved reward evidence. No new rewards are issued. */
export function reconcileStory(state: GrowthState): GrowthState {
  const rows = [...state.ledger].filter((r) => r.xp > 0).sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  const days = new Set<string>();
  const practices = new Set<string>();
  for (const row of rows) {
    const kind = row.id.split(':')[0];
    const milestones: StoryId[] = [];
    if (kind === 'habit') {
      milestones.push('begin');
      const day = row.id.split(':').at(-1)!;
      if (/^\d{4}-\d{2}-\d{2}$/.test(day)) days.add(day);
      if (days.size >= 3) milestones.push('rhythm');
    }
    if (kind === 'exercise') { milestones.push('practice'); practices.add(row.id); if (practices.size >= 3) milestones.push('focus'); }
    if (kind === 'focus') milestones.push('focus');
    if (kind === 'goal') milestones.push('goal');
    for (const id of milestones) if (!state.story.some((s) => s.id === id)) state.story.push({ id, version: id === 'focus' && kind === 'exercise' ? 2 : 1, eventId: row.id, at: row.at });
  }
  return state;
}
