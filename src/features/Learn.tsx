import { YouTubeSearch } from './YouTubeSearch';
import { useState } from 'react';
import { ArrowUpRight, Plus, Sparkles, Trash2, BookOpen, PencilLine, Search } from 'lucide-react';
import type { GrowthController } from '../app/useGrowth';
import { parseVideo, type GrowthState } from '../domain/model';
import { Modal } from '../components/Modal';
import { PracticeTask } from './PracticeTask';
import { VideoPlayer } from '../components/VideoPlayer';
import { GuidedChess } from './GuidedChess';
function Resource({ resource, app, openAssistant, hidden }: { hidden?: boolean; resource: GrowthState['resources'][number]; app: GrowthController; openAssistant: (id?: string) => void }) {
  const [notes, setNotes] = useState(resource.notes);
  const [revision, setRevision] = useState(resource.revision);
  const [open, setOpen] = useState(false);
  const video = parseVideo(resource.url);
  return <article className="resource-card" hidden={hidden}><div className="section-heading"><span className="pill">{video.provider}</span><button className="icon-button" aria-label={`Remove ${resource.title}`} onClick={() => { if (window.confirm('Remove this saved resource and its notes?')) void app.dispatch({ type: 'resource.delete', id: resource.id }); }}><Trash2 size={16} /></button></div><h3>{resource.title}</h3>
    <div className="button-row"><button className="secondary-button" disabled={!app.online} onClick={() => setOpen(true)}>Open video</button><a className="text-link" href={video.url} target="_blank" rel="noopener noreferrer">View on {video.provider} <ArrowUpRight size={14} /></a></div>
    <button className="subtle-button" onClick={() => openAssistant(resource.id)}><Sparkles size={17} /> Create practice from this resource</button>
    <label>My notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={5000} placeholder="What would you like to remember?" /></label>
    {revision !== resource.revision && notes !== resource.notes && <div className="callout">These notes changed elsewhere. Copy your draft before loading the latest version.<button className="subtle-button" onClick={() => { setNotes(resource.notes); setRevision(resource.revision); }}>Load latest notes</button></div>}
    <button className="subtle-button" disabled={notes === resource.notes} onClick={() => void app.dispatch({ type: 'resource.notes', id: resource.id, notes, revision }, 'Notes saved.').then((ok) => { if (ok) setRevision(revision + 1); })}>Save notes</button>
    {open && <Modal title={resource.title} onClose={() => setOpen(false)}><p className="fine-print">This loads {video.provider}’s player and may send information to that provider. Video availability and playback are controlled by {video.provider}.</p>{app.online ? <VideoPlayer resource={resource} app={app} /> : <p className="callout">You’re offline. Your notes are still available.</p>}<p>If this video is private, removed, or unavailable here, <a href={video.url} target="_blank" rel="noopener noreferrer">open it on {video.provider}</a>.</p></Modal>}
  </article>;
}
export function Learn({ app, openAssistant }: { app: GrowthController; openAssistant: (id?: string) => void }) {
  const [view, setView] = useState<'practice' | 'library'>('practice');
  const [chess, setChess] = useState(false);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState(''); const [url, setUrl] = useState(''); const [exercise, setExercise] = useState('');
  const [saving, setSaving] = useState(false);
  const state = app.state!;
  const resources = state.resources.filter((r) => !r.deleted);
  const matches = resources.filter((r) => r.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <div className="learn-page"><div className="page-intro"><div><span className="eyebrow">Follow that spark</span><h1>A little learning.<br /><span className="muted-heading">Something that stays.</span></h1></div><button className="secondary-button" onClick={() => openAssistant()}><Sparkles size={17} /> Build a learning plan</button></div>
    <section className="chess-entry" aria-label="Guided chess learning"><span className="chess-entry-piece" aria-hidden="true">♘</span><div><span className="eyebrow">One skill. One small session.</span><h2>Learn chess, one move at a time.</h2><p>Choose your pace, find a short lesson, and try a move yourself.</p></div><button className="primary-button" onClick={() => { setView('practice'); setChess(true); }}>Learn chess <ArrowUpRight size={18} /></button></section>
    <div className="view-switch" aria-label="Learning views"><button aria-pressed={view === 'practice'} onClick={() => setView('practice')}><PencilLine size={18} /> Practice <span>{state.exercises.filter((e) => !e.completed).length}</span></button><button aria-pressed={view === 'library'} onClick={() => setView('library')}><BookOpen size={18} /> Library <span>{resources.length}</span></button></div>
    <div className="learning-workspace" hidden={view !== 'practice'}><section className="practice-workspace"><div className="section-heading"><div><h2>Learn by doing.</h2><p>A sketch. A reflection. An idea put to work.</p></div><span className="pill">30 XP + 10 coins</span></div>
      {!state.exercises.length && <div className="empty-state practice-empty"><span className="empty-orbit"><PencilLine size={38} strokeWidth={1.3} /></span><h3>What would you like to try?</h3><p>Give yourself one small exercise. Progress starts with practice.</p></div>}
      <div className="list">{state.exercises.map((e) => <PracticeTask key={e.id} task={e} app={app} />)}</div><form className="inline-form" onSubmit={(e) => { e.preventDefault(); void app.dispatch({ type: 'exercise.add', id: crypto.randomUUID(), title: exercise }).then((ok) => { if (ok) setExercise(''); }); }}><input value={exercise} onChange={(e) => setExercise(e.target.value)} aria-label="New practice task" placeholder="One small thing to practice…" maxLength={160} required /><button className="icon-button" aria-label="Add practice task"><Plus size={20} /></button></form><p className="fine-print practice-note">Rewards recognize your practice. Watching videos doesn’t earn XP or coins.</p></section>
      <aside className="learning-note"><span className="eyebrow">Something just for you</span><h2>Found something<br />you’d love to try?</h2><p>Save something useful in your library, then turn one idea into a practice step.</p><button className="text-button" onClick={() => setView('library')}>Explore your library <ArrowUpRight size={17} /></button><div className="note-illustration" aria-hidden="true"><BookOpen size={86} strokeWidth={.8} /><Sparkles size={26} /></div></aside></div><section className="library-workspace" hidden={view !== 'library'}>
      <div className="library-toolbar"><label className="search-field"><Search size={18} /><input aria-label="Search your library" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find something you saved…" /></label><button className="primary-button" onClick={() => setAdding(true)}><Plus size={18} /> Save a resource</button></div>
      <div className="resource-grid" hidden={!matches.length}>{resources.map((r) => <Resource key={r.id} resource={r} app={app} openAssistant={openAssistant} hidden={!r.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())} />)}</div>{!matches.length && <div className="empty-state library-empty"><BookOpen size={42} strokeWidth={1.3} /><h2>{query ? 'Nothing matches just yet.' : 'A shelf for your curiosity.'}</h2><p>{query ? 'Try another title or clear your search.' : 'Keep useful videos and your own notes in one quiet place.'}</p>{query && <button className="subtle-button" onClick={() => setQuery('')}>Clear search</button>}</div>}
      <details className="discovery-section"><summary>Discover something on YouTube</summary><YouTubeSearch app={app} /></details>
    </section>
    {chess && <GuidedChess key={app.owner} app={app} onClose={() => setChess(false)} />}
    {adding && <Modal title="Keep something worth learning" onClose={() => setAdding(false)}><p>Save a YouTube or TikTok video. Your notes stay available offline.</p><form className="stack" onSubmit={(e) => { e.preventDefault(); if (saving) return; setSaving(true); void app.dispatch({ type: 'resource.add', id: crypto.randomUUID(), title, url }).then((ok) => { if (ok) { setTitle(''); setUrl(''); setAdding(false); } }).finally(() => setSaving(false)); }}><label>Give it a name<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="An idea worth trying" maxLength={160} required autoFocus /></label><label>Video link<input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" maxLength={500} required /></label><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save resource'}</button></form></Modal>}
  </div>;
}
