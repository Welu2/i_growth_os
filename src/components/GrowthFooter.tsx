import type { GrowthController } from '../app/useGrowth';
import { PwaStatus } from '../features/PwaStatus';
import './GrowthFooter.css';

export function GrowthFooter({ app }: { app: GrowthController }) {
  const connection = !app.online ? 'Offline' : app.owner === 'guest' ? 'Saved on this device' : app.syncing ? 'Syncing…' : app.pending.length ? `${app.pending.length} pending` : app.lastSynced ? 'Synced' : 'Not synced yet';
  return <footer className="growth-footer">
    <svg className="footer-bloom" viewBox="0 0 220 220" aria-hidden="true">
      <path d="M110 190Q131 145 107 93" fill="none" stroke="#777630" strokeWidth="7" strokeLinecap="round" />
      <path d="M118 164Q62 170 57 128Q102 116 118 164Z" fill="#777630" />
      <path d="M120 147Q162 151 174 112Q130 104 120 147Z" fill="#9b964e" />
      <g className="bloom-petals" transform="translate(104 78)">
        {[0, 60, 120, 180, 240, 300].map((angle) => <ellipse key={angle} cy="-25" rx="19" ry="30" transform={`rotate(${angle})`} fill="#e5b92f" />)}
        <circle r="22" fill="#443719" />
        <path d="M-9 3Q0 13 9 3" stroke="#fff6d6" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cx="-8" cy="-5" r="2" fill="#fff6d6" /><circle cx="8" cy="-5" r="2" fill="#fff6d6" />
      </g>
      <path d="m177 46 4 11 11 4-11 4-4 11-4-11-11-4 11-4Z" fill="#777630" />
      <circle cx="42" cy="187" r="5" fill="#9b964e" />
      <path d="M64 204Q110 190 163 201" stroke="#9b964e" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
    <div className="footer-message"><span className="eyebrow">A LITTLE PROGRESS. A LOT OF POSSIBILITY.</span><h2>Good things<br /><span>are growing.</span></h2><p>Take your time. Make it yours.</p></div>
    <div className="footer-utilities"><PwaStatus activeSession={app.state!.sessions.some((s) => s.endedAt === null)} pendingChanges={app.pending.length > 0} /><span className="connection"><span className={`status-dot ${app.online ? '' : 'offline'}`} />{connection}</span></div>
  </footer>;
}
