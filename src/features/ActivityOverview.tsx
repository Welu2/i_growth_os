import { Activity, ArrowUpRight, Pause } from 'lucide-react';
import type { GrowthController } from '../app/useGrowth';
import { formatDuration } from '../domain/insights';
import { localDay } from '../domain/model';
import { useEffect, useState } from 'react';

export function ActivityOverview({ app, openProgress }: { app: GrowthController; openProgress: () => void }) {
  const state = app.state!;
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const minutes = state.visibleMinutes[localDay(now, state.profile?.timezone ?? 'UTC')];
  const status = { paused: 'Tracking paused', excluded: 'This screen is excluded', idle: 'Resting while you’re away', observing: 'Observing activity in this app' }[app.activityStatus];
  return <section className="activity-overview" aria-label="Automatic activity">
    <span className="activity-symbol"><Activity size={22} /></span><div className="activity-copy"><h2>Your day, in perspective.</h2><p>Optional activity estimates · In-app only</p></div>
    <div className="activity-total"><strong>{minutes === undefined ? 'Not measured yet' : formatDuration(minutes * 60_000)}</strong><span className="small">{status}</span></div>
    <div className="button-row"><button className="secondary-button" onClick={() => void app.dispatch({ type: 'preferences', preferences: { tracking: !state.preferences.tracking } })}>{state.preferences.tracking ? <><Pause size={16} /> Pause tracking</> : 'Enable automatic tracking'}</button><button className="icon-button" aria-label="View activity details" onClick={openProgress}><ArrowUpRight size={20} /></button></div>
    <details className="activity-explanation"><summary>What does this measure?</summary><p>Only activity inside this app, while it’s visible, focused, and you’re active. The first full active minute appears here. It doesn’t measure other apps, prove attention, or earn rewards. You can pause or exclude screens in Settings.</p></details>
  </section>;
}
