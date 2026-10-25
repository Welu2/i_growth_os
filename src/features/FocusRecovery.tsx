import { useEffect, useState } from 'react';
import type { GrowthController } from '../app/useGrowth';
import { sessionElapsed } from '../domain/model';
export function FocusRecovery({ app }: { app: GrowthController }) {
  const session = app.state!.sessions.find((s) => s.endedAt === null);
  const [now, setNow] = useState(Date.now);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!session) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [session]);
  if (!session) return null;
  const elapsed = sessionElapsed(session, now);
  const remaining = Math.ceil(Math.max(0, session.targetMinutes * 60_000 - elapsed) / 1000);
  const act = (type: 'focus.pause' | 'focus.resume' | 'focus.finish' | 'focus.cancel') => { setBusy(true); void app.dispatch({ type, id: session.id }).finally(() => setBusy(false)); };
  return <section className="panel stack"><h2>Your saved focus session</h2><strong>{session.title}</strong><p>{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')} remaining · {session.runningSince === null ? 'Paused' : 'Running'}</p><p className="fine-print">This timer was started earlier. Elapsed time is self-reported, separate from observed in-app activity. Finish only when you have completed the session.</p><div className="button-row"><button className="secondary-button" disabled={busy || !remaining} onClick={() => act(session.runningSince === null ? 'focus.resume' : 'focus.pause')}>{session.runningSince === null ? 'Resume saved timer' : 'Pause saved timer'}</button><button className="primary-button" disabled={busy || remaining > 0} onClick={() => act('focus.finish')}>Finish saved session</button><button className="subtle-button" disabled={busy} onClick={() => { if (window.confirm('Cancel this saved session without earning a reward?')) act('focus.cancel'); }}>Cancel saved session</button></div></section>;
}
