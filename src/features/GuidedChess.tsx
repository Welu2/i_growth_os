import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Search } from 'lucide-react';
import type { GrowthController } from '../app/useGrowth';
import { Modal } from '../components/Modal';
import { VideoPlayer } from '../components/VideoPlayer';
import { CHESS_LESSONS, CHESS_MINUTES, chessTask, chessFollowUp, lessonBudget, savedChessTask, type ChessLevel, type ChessMinutes } from '../domain/chessLearning';
import { parseVideo } from '../domain/model';
import { api, cloudConfigured } from '../services/cloud';
import { runtime, youtubeResults, type YouTubeResult } from '../services/youtube';
import { ChessPractice } from './ChessPractice';
import './GuidedChess.css';
type Step = 'setup' | 'lesson' | 'practice' | 'next';
type Choice = YouTubeResult & { id: string };
export function GuidedChess({ app, onClose }: { app: GrowthController; onClose: () => void }) {
  const [step, setStep] = useState<Step>('setup');
  const [level, setLevel] = useState<ChessLevel>('beginner');
  const [minutes, setMinutes] = useState<ChessMinutes>(10);
  const [results, setResults] = useState<YouTubeResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [choice, setChoice] = useState<Choice | null>(null);
  const [manualTitle, setManualTitle] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [player, setPlayer] = useState(false);
  const [solved, setSolved] = useState(false);
  const [nextTitle, setNextTitle] = useState<string>(CHESS_LESSONS[0].next);
  const heading = useRef<HTMLHeadingElement>(null);
  const request = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const lesson = CHESS_LESSONS.find((item) => item.level === level)!;
  const budget = lessonBudget(minutes);
  const task = savedChessTask(app.state!, lesson);
  const followUp = app.state!.exercises.find((item) => item.id === lesson.nextId);
  const resource = app.state!.resources.find((item) => item.id === task?.details?.resourceId && !item.deleted);
  const connected = app.online && app.owner !== 'guest' && cloudConfigured;
  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current?.abort(); }; }, []);
  useEffect(() => { heading.current?.focus(); }, [step]);
  function cancelSearch() { request.current?.abort(); request.current = null; setSearching(false); }
  function changeSetup() { cancelSearch(); setError(''); setPlayer(false); setStep('setup'); }
  async function search() {
    if (!connected || searching) return;
    cancelSearch();
    const controller = new AbortController(); request.current = controller;
    const timer = setTimeout(() => controller.abort(), 25_000);
    setSearching(true); setSearched(false); setResults([]); setError('');
    try {
      const data = youtubeResults.parse(await api('/youtube/search', { query: lesson.query, maxSeconds: budget.videoSeconds }, controller.signal, undefined, app.owner));
      if (controller.signal.aborted || !alive.current) return;
      const verified = data.results.filter((item) => item.durationSeconds !== undefined && item.durationSeconds <= budget.videoSeconds);
      if (data.results.length && !verified.length) throw new Error('The service did not return verified short lessons. Update the backend or practice without a video.');
      setResults(verified); setSearched(true);
    } catch (e) { if (alive.current && request.current === controller) setError(controller.signal.aborted ? 'Search stopped. Try again or practice without a video.' : e instanceof Error ? e.message : 'Search is unavailable.'); }
    finally { clearTimeout(timer); if (alive.current && request.current === controller) { setSearching(false); request.current = null; } }
  }
  async function startPractice(selected: Choice | null) {
    if (saving) return;
    cancelSearch(); setSaving(true); setError('');
    try {
      if (task) { setStep(task.completed ? 'next' : 'practice'); return; }
      let resourceId: string | null = null;
      if (selected) {
        const existing = app.state!.resources.find((item) => !item.deleted && item.url === selected.url);
        resourceId = existing?.id ?? selected.id;
        if (!existing && !await app.dispatch({ type: 'resource.add', id: resourceId, title: selected.title, url: selected.url })) {
          if (alive.current) setError('The video could not be saved. Your selection is still here; try again.'); return;
        }
      }
      const practiceMinutes = selected ? Math.max(1, minutes - Math.ceil((selected.durationSeconds ?? budget.videoSeconds) / 60)) : minutes;
      const ok = await app.dispatch({ type: 'plan.save', tasks: [chessTask(lesson, practiceMinutes, resourceId)] });
      if (!alive.current) return;
      if (!ok) { setError(selected ? 'The video is in your library, but practice could not be saved. Retry with this selection.' : 'Practice could not be saved. Try again.'); return; }
      setSolved(false); setStep('practice');
    } finally { if (alive.current) setSaving(false); }
  }
  async function complete() {
    if (!solved || saving || !task) return;
    setSaving(true); setError('');
    try {
      const ok = await app.dispatch({ type: 'exercise.complete', id: lesson.id }, 'Chess practice saved. Your world is growing.');
      if (alive.current) { if (ok) { setPlayer(false); setStep('next'); } else setError('Your completion could not be saved. Try again; the exercise will not reward twice.'); }
    } finally { if (alive.current) setSaving(false); }
  }
  async function saveNext() {
    if (saving || followUp || !task?.completed || !nextTitle.trim()) return;
    setSaving(true); setError('');
    try {
      const ok = await app.dispatch({ type: 'plan.save', tasks: [chessFollowUp(lesson, nextTitle)] }, 'Your next chess step is saved in Practice.');
      if (!ok && alive.current) setError('Your next step could not be saved. Your completed practice is safe; try again.');
    } finally { if (alive.current) setSaving(false); }
  }
  const titles = { setup: 'Make room for chess.', lesson: 'Pick one short lesson.', practice: 'Try one move for yourself.', next: 'Leave yourself a next step.' };
  return <Modal title="Learn chess" onClose={() => { cancelSearch(); onClose(); }}><div className="guided-chess">
    <ol className="lesson-steps" aria-label="Lesson steps">{(['setup', 'lesson', 'practice', 'next'] as const).map((item, index) => <li key={item} aria-current={step === item ? 'step' : undefined}><span>{index + 1}</span>{['Your pace', 'Lesson', 'Practice', 'Next step'][index]}</li>)}</ol>
    <h3 ref={heading} tabIndex={-1} className="guided-heading">{titles[step]}</h3>
    {step === 'setup' && <form className="stack" onSubmit={(event) => { event.preventDefault(); setError(''); setResults([]); setSearched(false); setChoice(null); setSolved(false); setNextTitle(followUp?.title ?? lesson.next); setStep(task ? task.completed ? 'next' : 'practice' : 'lesson'); }}>
      <p>One concept, a little practice, and something to try next time.</p>
      <label>Your chess level<select value={level} onChange={(event) => setLevel(event.target.value as ChessLevel)}>{CHESS_LESSONS.map((item) => <option key={item.level} value={item.level}>{item.label}</option>)}</select></label>
      <label>Time for this session<select value={minutes} onChange={(event) => setMinutes(Number(event.target.value) as ChessMinutes)}>{CHESS_MINUTES.map((time) => <option key={time} value={time}>{time} minutes</option>)}</select></label>
      <div className="lesson-concept"><span className="eyebrow">One concept</span><strong>{lesson.concept}</strong><p>{task ? `Your ${task.completed ? 'completed' : 'unfinished'} practice is saved. Resuming keeps its original ${task.details?.minutes ?? 3}-minute practice estimate.` : `Video up to ${runtime(budget.videoSeconds)} · at least ${budget.practiceMinutes} minutes to practice. Video is optional.`}</p></div>
      <button className="primary-button">{task ? task.completed ? 'Review my next step' : 'Resume saved practice' : 'Pick a lesson'}<ArrowRight size={18} /></button>
    </form>}
    {step === 'lesson' && <div className="stack">
      <p><strong>{lesson.concept}</strong> · YouTube lessons up to {runtime(budget.videoSeconds)}. Choose a video that explains this concept; search results are not reviewed courses.</p>
      <p className="fine-print">Search shares this chess topic and length limit with YouTube. It does not send your notes or activity history. Runtime and embedding metadata may be cached for up to a day.</p>
      {!connected && <p className="callout">{!app.online ? 'You’re offline. The chess exercise works locally.' : 'YouTube search needs a signed-in account and configured services. You can use your own link or practice locally.'}</p>}
      <div className="button-row"><button className="primary-button" disabled={!connected || searching || saving} onClick={() => void search()}><Search size={17} />{searching ? 'Finding short lessons…' : 'Find short YouTube lessons'}</button>{searching && <button className="secondary-button" onClick={cancelSearch}>Cancel search</button>}</div>
      {searched && !results.length && <p role="status">No verified lessons fit this time limit. Try a longer session, use your own link, or practice without a video.</p>}
      <div className="short-lessons">{results.map((item) => <button className="short-lesson" key={item.url} disabled={saving} aria-pressed={choice?.url === item.url} onClick={() => setChoice({ ...item, id: choice?.url === item.url ? choice.id : crypto.randomUUID() })}><span className="pill">YouTube · {runtime(item.durationSeconds!)}</span><strong>{item.title}</strong><span>{item.creator}</span><span className="small">{choice?.url === item.url ? 'Selected' : 'Choose this lesson'}</span></button>)}</div>
      <details><summary>Use a YouTube link I already have</summary><form className="stack" onSubmit={(event) => { event.preventDefault(); try { const video = parseVideo(manualUrl); if (video.provider !== 'YouTube') throw new Error('Use a full YouTube video link for this lesson.'); setChoice({ title: manualTitle.trim(), creator: 'Your link · length not verified', url: video.url, id: choice?.url === video.url ? choice.id : crypto.randomUUID() }); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Check the video link.'); } }}><label>Lesson name<input value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} required maxLength={160} /></label><label>YouTube lesson link<input type="url" value={manualUrl} onChange={(event) => setManualUrl(event.target.value)} required maxLength={500} /></label><button className="secondary-button" disabled={saving || !manualTitle.trim()}>Use this link</button></form></details>
      {choice && <div className="lesson-concept"><strong>{choice.title}</strong><p>{choice.durationSeconds ? `${runtime(choice.durationSeconds)} · runtime supplied by YouTube` : 'Your link · length not verified. Check the runtime yourself and leave time to practice.'}</p><button className="primary-button" disabled={saving} onClick={() => void startPractice(choice)}>{saving ? 'Saving…' : 'Save lesson and start practice'}</button></div>}
      <button className="secondary-button" disabled={saving} onClick={() => void startPractice(null)}>{saving ? 'Saving…' : 'Practice without a video'}</button>
      <button className="text-button" disabled={saving} onClick={changeSetup}>Change level or time</button>
    </div>}
    {step === 'practice' && <div className="stack">
      <p><span className="pill">Curated chess exercise · Offline template</span> {task?.details?.minutes ?? budget.practiceMinutes} min practice</p>
      {resource && <div className="lesson-concept"><strong>{resource.title}</strong><p>Optional video. Opening the player shares information with YouTube. This exercise is based on the chess concept, not on a transcript of the video.</p><button className="secondary-button" disabled={!app.online} onClick={() => setPlayer(!player)}>{player ? 'Close lesson video' : 'Open lesson video'}</button>{!app.online && <p>You’re offline. Your saved exercise is ready below.</p>}{player && app.online && <VideoPlayer resource={resource} app={app} />}<a href={resource.url} target="_blank" rel="noopener noreferrer">Open original on YouTube ↗</a></div>}
      {task?.details?.resourceId && !resource && <p className="callout">The saved video was removed. Your practice still works.</p>}
      <ChessPractice key={lesson.id} lesson={lesson} solved={solved} onSolve={() => setSolved(true)} />
      <p className="fine-print">Explain the move to yourself, then save your practice. Watching a video or solving the board alone does not award progress.</p>
      <button className="primary-button" disabled={!solved || saving || !task} onClick={() => void complete()}><Check size={18} />{saving ? 'Saving…' : task?.completed ? 'Continue to my next step' : 'I practiced this concept'}</button>
      <button className="text-button" disabled={saving} onClick={changeSetup}>Change session</button>
    </div>}
    {step === 'next' && <form className="stack" onSubmit={(event) => { event.preventDefault(); void saveNext(); }}>
      <div className="lesson-concept"><span className="eyebrow">Practice saved</span><strong>{lesson.concept}</strong><p>You can stop here. Keep one small step ready for your next visit.</p></div>
      <p className="fine-print">Curated follow-up · Offline template. Saving a task earns no rewards.</p>
      <label>My next chess step<input value={followUp?.title ?? nextTitle} onChange={(event) => setNextTitle(event.target.value)} disabled={Boolean(followUp) || saving} maxLength={160} required /></label>
      <p>{followUp?.details?.instructions ?? lesson.nextInstructions}</p><p><strong>Done when:</strong> {followUp?.details?.criteria ?? lesson.nextCriteria}</p>
      <button className="primary-button" disabled={Boolean(followUp) || saving || !nextTitle.trim() || !task?.completed}>{followUp ? 'Saved to Practice' : saving ? 'Saving…' : 'Save my next step'}</button>
      {followUp && <p role="status">Your next step is in Learn → Practice and stays available offline.</p>}
      <button type="button" className="secondary-button" disabled={saving} onClick={onClose}>{followUp ? 'Back to Learn' : 'Finish without a next step'}</button>
    </form>}
    {error && <p className="error" role="alert">{error}</p>}
    {saving && <p role="status">Saving to your workspace…</p>}
  </div></Modal>;
}
