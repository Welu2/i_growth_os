import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Modal } from '../components/Modal';
import { offlineDraft, requestAssistant } from '../services/assistant';
import { cloudConfigured } from '../services/cloud';
import type { GrowthController } from '../app/useGrowth';
import type { AssistantDraft, AssistantRequest, GrowthState } from '../domain/model';

type Task = { id: string; title: string; details: NonNullable<GrowthState['exercises'][number]['details']> };
export function Assistant({ app, onClose, resourceId }: { app: GrowthController; onClose: () => void; resourceId?: string }) {
  const resource = app.state!.resources.find((r) => r.id === resourceId && !r.deleted);
  const [topic, setTopic] = useState(resource?.title ?? '');
  const [minutes, setMinutes] = useState(15);
  const [mode, setMode] = useState<AssistantRequest['mode']>(resource ? 'learning-plan' : 'next-step');
  const [includeNotes, setIncludeNotes] = useState(false);
  const [excerpt, setExcerpt] = useState('');
  const [draft, setDraft] = useState<AssistantDraft | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const canConnect = app.online && app.owner !== 'guest' && cloudConfigured;
  const close = () => { request.current?.abort(); onClose(); };
  async function generate(live: boolean) {
    const input: AssistantRequest = { topic, minutes, mode, ...(resource ? { resourceId: resource.id } : {}), ...(includeNotes && excerpt.trim() ? { excerpt } : {}) };
    setError(''); setDraft(null); setSaved(false); setBusy(true);
    const controller = new AbortController(); request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 25_000);
    try {
      if (live && resource) await app.sync();
      if (controller.signal.aborted) throw new Error('Request stopped.');
      const result = live ? await requestAssistant(input, controller.signal, app.owner) : offlineDraft(input);
      if (controller.signal.aborted) return;
      setDraft(result);
      setTasks(result.steps.map((step, index) => ({
        id: crypto.randomUUID(), title: step,
        details: { resourceId: resource?.id ?? null, objective: result.title, instructions: step, minutes: Math.max(1, Math.floor(minutes / result.steps.length) + (index < minutes % result.steps.length ? 1 : 0)), criteria: 'Try the activity and describe one thing you learned.', basis: live && input.excerpt ? 'selected-notes' : live && resource ? 'resource-title' : 'topic', source: live ? 'AI response' : 'Offline template', reflection: '' },
      })));
    } catch (e) { setError(controller.signal.aborted ? 'Request stopped. Try again or use a template.' : e instanceof Error ? e.message : 'The assistant is unavailable.'); }
    finally { clearTimeout(timeout); setBusy(false); }
  }
  function edit(index: number, changes: Partial<Task['details']>) {
    setTasks((current) => current.map((task, i) => i === index ? { ...task, details: { ...task.details, ...changes } } : task));
  }
  const valid = tasks.length > 0 && tasks.every((t) => t.details.instructions.trim() && t.details.criteria.trim() && Number.isInteger(t.details.minutes) && t.details.minutes >= 1 && t.details.minutes <= 120);
  return <Modal title={resource ? 'Turn an idea into practice' : 'A little help getting started'} onClose={close}>
    <p>Your assistant can turn a big idea into a few small, doable steps.</p>
    {resource && <div className="resource-context"><strong>{resource.title}</strong><p>Linked resource · the assistant has not watched this video. Your own practice is what matters.</p></div>}
    <form className="stack" onSubmit={(e) => { e.preventDefault(); void generate(true); }}>
      <fieldset disabled={busy || saving} className="stack">
        <label>What would you like help with?<textarea value={topic} onChange={(e) => setTopic(e.target.value)} minLength={3} maxLength={500} required placeholder="I want to learn to draw…" /></label>
        <div className="two-column"><label>Help me with<select value={mode} onChange={(e) => setMode(e.target.value as AssistantRequest['mode'])}><option value="next-step">My next step</option><option value="learning-plan">A learning plan</option><option value="encouragement">Encouragement</option></select></label><label>Time available<select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>{[5, 15, 25, 45, 60].map((n) => <option key={n} value={n}>{n} minutes</option>)}</select></label></div>
        {resource && <><label className="toggle-row"><span>Include notes I review below</span><input type="checkbox" checked={includeNotes} onChange={(e) => { setIncludeNotes(e.target.checked); if (e.target.checked && !excerpt) setExcerpt(resource.notes.slice(0, 2000)); }} /></label>{includeNotes && <label>Selected notes to share<textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} maxLength={2000} placeholder="Summarize the idea you want to practice…" /></label>}</>}
        <p className="fine-print">AI receives your topic, time, help type{resource ? ', resource title, and only the notes explicitly selected above' : ''}. Progress, activity history, and other private notes are excluded. Offline templates use only your topic and time.</p>
        {!canConnect && <p className="callout">{!app.online ? 'You’re offline. A local template is available.' : !cloudConfigured ? 'Live AI needs cloud setup. You can use a local template now.' : 'Sign in from Settings to use live AI. Guest mode includes local templates.'}</p>}
        <div className="button-row"><button className="primary-button" disabled={!canConnect || topic.trim().length < 3}><Sparkles size={17} />{busy ? 'Thinking…' : 'Ask AI'}</button><button type="button" className="secondary-button" disabled={topic.trim().length < 3} onClick={() => void generate(false)}>Use offline template</button></div>
      </fieldset>
      {busy && <button type="button" className="subtle-button" onClick={() => request.current?.abort()}>Cancel</button>}
    </form>
    {error && <p role="alert" className="error">{error}</p>}
    {draft && <section className="draft"><span className="pill">{tasks[0]?.details.source}</span><h3>{draft.title}</h3><p>{draft.message}</p><p className="fine-print">Based on {tasks[0]?.details.basis === 'selected-notes' ? 'the notes you selected' : tasks[0]?.details.basis === 'resource-title' ? 'your topic and resource title only' : 'your topic and time only'}. Review and adjust each assignment before saving.</p>
      <fieldset disabled={saved || saving} className="stack">{tasks.map((task, i) => <div className="assignment-draft stack" key={task.id}><label>Practice step {i + 1}<textarea value={task.details.instructions} maxLength={2000} onChange={(e) => edit(i, { instructions: e.target.value })} /></label><div className="two-column"><label>Estimated minutes<input type="number" min={1} max={120} value={task.details.minutes} onChange={(e) => edit(i, { minutes: Number(e.target.value) })} /></label><label>Done when<input value={task.details.criteria} maxLength={160} onChange={(e) => edit(i, { criteria: e.target.value })} /></label></div></div>)}</fieldset>
      <p className="fine-print">Saving creates independent practice assignments. Only completing an activity can earn XP or coins. Watching the resource is optional.</p>
      <button className="primary-button" disabled={saved || saving || !valid} onClick={() => { setSaving(true); void app.dispatch({ type: 'plan.save', tasks: tasks.map((t) => ({ ...t, title: t.details.instructions.trim().slice(0, 160) })) }, 'Your practice plan is saved.').then((ok) => { if (ok) setSaved(true); }).finally(() => setSaving(false)); }}>{saved ? 'Saved to Learn' : saving ? 'Saving…' : 'Save these practice steps'}</button>
    </section>}
  </Modal>;
}
