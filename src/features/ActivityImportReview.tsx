import { useState } from 'react';
import { Modal } from '../components/Modal';
import { unionDuration, type GrowthState } from '../domain/model';
import { formatDuration } from '../domain/insights';
import type { GrowthController } from '../app/useGrowth';
export function ActivityImportReview({ rows, app, onClose }: { rows: GrowthState['activity']; app: GrowthController; onClose: () => void }) {
  const [excluded, setExcluded] = useState<string[]>([]);
  const [categories, setCategories] = useState<Record<string, 'focus' | 'learning' | 'other'>>({});
  const [busy, setBusy] = useState(false);
  const apps = [...new Set(rows.map((r) => r.app))];
  const selected = rows.filter((r) => !excluded.includes(r.app)).map((r) => ({ ...r, category: categories[r.app] ?? r.category }));
  const existing = new Set(app.state!.activity.map((r) => r.id));
  const fresh = selected.filter((r) => !existing.has(r.id));
  const addedMs = unionDuration([...app.state!.activity, ...fresh]) - unionDuration(app.state!.activity);
  return <Modal title="Review activity import" onClose={onClose}><p>{rows.length} {rows.length === 1 ? 'interval' : 'intervals'} from {[...new Set(rows.map((r) => r.device))].join(', ')}. Only app names, timestamps, devices, and categories are saved.</p><p>Matching ActivityWatch AFK data keeps only observed active periods. Without matching AFK data, window time may include idle time.</p><fieldset className="tracking-exclusions"><legend>Choose apps and categories</legend>{apps.map((name) => <div className="stack" key={name}><label className="toggle-row"><span>Include {name}</span><input type="checkbox" checked={!excluded.includes(name)} onChange={(e) => setExcluded(e.target.checked ? excluded.filter((a) => a !== name) : [...excluded, name])} /></label><label>Category for {name}<select disabled={excluded.includes(name)} value={categories[name] ?? ''} onChange={(e) => { const value = e.target.value; setCategories((current) => { const next = { ...current }; if (!value) delete next[name]; else next[name] = value as 'focus' | 'learning' | 'other'; return next; }); }}><option value="">Keep imported categories</option><option value="focus">Focus</option><option value="learning">Learning</option><option value="other">Other</option></select></label></div>)}</fieldset><p>{selected.length} selected · {selected.length - fresh.length} already saved. Adds {formatDuration(addedMs)} after overlaps with saved imports.</p><p>Categories describe your intent; they do not prove productivity. Exclusions apply to this import. Previously saved intervals stay unchanged; clear recorded activity first if you need to replace an earlier unfiltered import.</p><p>{app.owner !== 'guest' ? 'These summaries will synchronize to your account.' : 'These summaries stay on this device.'} Imported time earns no rewards.</p><button className="primary-button" disabled={!fresh.length || busy} onClick={() => { setBusy(true); void app.dispatch({ type: 'activity.import', rows: fresh }, 'Activity imported.').then((ok) => { if (ok) onClose(); }).finally(() => setBusy(false)); }}>{busy ? 'Importing…' : 'Import these summaries'}</button></Modal>;
}
