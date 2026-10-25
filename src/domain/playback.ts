export type PlaybackSample = { wall: number; position: number; playing: boolean; visible: boolean; rate: number };
/** Conservative wall-clock estimate: gaps, seeks, pauses and hidden samples earn no time. */
export function playbackInterval(previous: PlaybackSample | null, current: PlaybackSample) {
  if (!previous || !previous.playing || !current.playing || !previous.visible || !current.visible) return null;
  const wall = current.wall - previous.wall, media = current.position - previous.position;
  if (![wall, media, current.rate, previous.rate].every(Number.isFinite) || wall < 100 || wall > 2500 || media <= 0 || current.rate !== previous.rate || current.rate <= 0 || current.rate > 4) return null;
  if (Math.abs(media - wall / 1000 * current.rate) > .5) return null;
  return { start: previous.wall, end: current.wall };
}
