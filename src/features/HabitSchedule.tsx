import { useState } from 'react';
import type { GrowthController } from '../app/useGrowth';
import { Modal } from '../components/Modal';
import { WEEKDAYS, scheduleLabel } from '../domain/schedules';
export function HabitSchedule({ app }: { app: GrowthController }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [days, setDays] = useState<number[]>([]);
  const habit = app.state!.habits.find((h) => h.id === selected);
  return <details className="setup-help"><summary>Manage habit schedules</summary><p>Choose the days that fit your routine. Changing days or restoring a habit keeps its completion history.</p>
    {app.state!.habits.map((h) => <div className="list-row" key={h.id}><div className="grow"><strong>{h.title}</strong><span className="small">{h.archived ? 'Archived · ' : ''}{scheduleLabel(h.days)}</span></div>{h.archived ? <button className="subtle-button" onClick={() => void app.dispatch({ type: 'habit.restore', id: h.id })}>Restore {h.title}</button> : <button className="subtle-button" onClick={() => { setSelected(h.id); setDays(h.days); }}>Schedule {h.title}</button>}</div>)}
    {habit && <Modal title={`Schedule ${habit.title}`} onClose={() => setSelected(null)}><form className="stack" onSubmit={(e) => { e.preventDefault(); void app.dispatch({ type: 'habit.schedule', id: habit.id, days }, 'Habit schedule saved.').then((ok) => { if (ok) setSelected(null); }); }}><fieldset className="tracking-exclusions"><legend>Scheduled days</legend>{WEEKDAYS.map((name, day) => <label className="toggle-row" key={name}><span>{name}</span><input type="checkbox" checked={days.includes(day)} onChange={(e) => setDays(e.target.checked ? [...days, day].sort() : days.filter((d) => d !== day))} /></label>)}</fieldset><p className="fine-print">Uses {app.state!.profile!.timezone}. At least one day is required.</p><button className="primary-button" disabled={!days.length}>Save schedule</button></form></Modal>}
  </details>;
}
