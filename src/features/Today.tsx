import { useEffect, useState } from 'react';
import { ArrowRight, Check, Plus, Sparkles, Target, Trash2, ArrowUpRight, Zap, Sun, Flower2, Orbit } from 'lucide-react';
import type { GrowthController } from '../app/useGrowth';
import { localDay, weekday } from '../domain/model';
import { Companion } from './Companion';
import { ActivityOverview } from './ActivityOverview';
import { HabitSchedule } from './HabitSchedule';
import { scheduleLabel } from '../domain/schedules';
import { FocusRecovery } from './FocusRecovery';
import { Modal } from '../components/Modal';

export function Today({ app, openAssistant, openLearn, openProgress, openHome }: { app: GrowthController; openAssistant: () => void; openLearn: () => void; openProgress: () => void; openHome: () => void }) {
  const state = app.state!;
  const [now, setNow] = useState(Date.now);
  const [adding, setAdding] = useState<'habit' | 'goal' | null>(null);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [chosenHabit, setChosenHabit] = useState<string | null>(null);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const zone = state.profile?.timezone ?? 'UTC';
  const day = localDay(now, zone);
  const habits = state.habits.filter((h) => !h.archived && h.days.includes(weekday(now, zone)));
  const completed = habits.filter((h) => state.completions.includes(`habit:${h.id}:${day}`)).length;
  const availableHabits = habits.filter((h) => !state.completions.includes(`habit:${h.id}:${day}`));
  const nextHabit = availableHabits.find((h) => h.id === chosenHabit) ?? availableHabits[0];
  const nextPractice = state.exercises.find((e) => !e.completed);
  const nextGoal = state.goals.find((g) => !g.completed);
  const add = (kind: 'habit' | 'goal') => { setTitle(''); setAdding(kind); };
  const seeSteps = () => { const el = document.getElementById('daily-wins'); el?.scrollIntoView({ block: 'center', behavior: state.preferences.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); el?.focus({ preventScroll: true }); };
  const finishNext = async () => {
    if (!nextHabit || saving) return;
    setSaving(true);
    try { await app.dispatch({ type: 'habit.complete', id: nextHabit.id }, 'Daily win saved. +25 XP.'); } finally { setSaving(false); }
  };
  return <div className="today-page">
    <div className="page-intro today-greeting"><div><h1>Hey{state.profile?.name ? `, ${state.profile.name.split(' ')[0]}` : ''}. Good to see you.</h1></div><span className="eyebrow">{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric', timeZone: zone }).format(now)}</span></div>
    <div className="daily-space">
      <div className="daily-invitation">
        <span className="spark-label"><Zap size={15} fill="currentColor" /> A fresh chance to feel good</span>
        <h2>Small steps.<br /><span>Big energy.</span><Sun className="headline-sun" size={76} strokeWidth={1.5} aria-hidden="true" /></h2>
        <p>Do something for you. Watch your world grow.</p>
      </div>
      <section className="next-step" aria-label="Your next step" tabIndex={-1}>
        <div className="next-step-top"><span className="eyebrow"><Zap size={16} fill="currentColor" /> {nextHabit ? 'Your next win' : habits.length ? 'You made it happen' : 'Start your own thing'}</span><span className="next-step-stamp" aria-hidden="true"><ArrowUpRight size={25} /></span></div>
        <h2>{nextHabit?.title ?? (nextPractice ? 'Put your curiosity to work.' : habits.length ? 'That’s a good day growing.' : 'What would feel good today?')}</h2>
        <p>{nextHabit ? 'Make it yours. Come back and claim your win when you’re done.' : nextPractice ? 'Pick up a practice step and give that idea a go.' : habits.length ? 'Every step counts. Enjoy this one, or make room for something new.' : 'A stretch, a sketch, a few pages. Pick a habit you want to come back to.'}</p>
        <div className="next-step-action">{nextHabit ? <button className="primary-button" disabled={saving} onClick={() => void finishNext()}><Check size={19} />{saving ? 'Saving…' : 'I did this'}<span className="button-reward">+25 XP</span></button> : nextPractice ? <button className="primary-button" onClick={openLearn}>Continue practicing <ArrowRight size={18} /></button> : <button className="primary-button" onClick={() => add('habit')}><Plus size={18} />{habits.length ? 'Add another small step' : 'Choose my first step'}</button>}<button className="text-button" onClick={seeSteps}>My steps <ArrowRight size={16} /></button></div>
      </section>
      <Companion state={state} pending={app.owner !== 'guest' && app.pending.length > 0} onHome={openHome} />
    </div>
    <div className="daily-momentum"><span className="momentum-icon"><Zap size={21} /></span><div><strong>{completed ? `${completed} ${completed === 1 ? 'win' : 'wins'}. That’s you showing up.` : 'Your next win starts with one step.'}</strong><span className="small">{habits.length ? `${completed} of ${habits.length} daily habits complete` : 'Your day, your pace. Let’s find your first step.'}</span></div><progress max={Math.max(1, habits.length)} value={completed} aria-label="Daily habits completed" /><button className="text-button" onClick={seeSteps} aria-label="See today’s steps"><ArrowRight size={20} /></button></div>
    <FocusRecovery app={app} />
    <div className="daily-workbench">
      <section id="daily-wins" tabIndex={-1} className="steps-section"><div className="section-heading"><h2>Pick your next win <span className="count-label">{habits.length}</span></h2><button className="subtle-button" onClick={() => add('habit')}><Plus size={17} /> Add habit</button></div>
        <div className="habit-cards">{habits.map((h, index) => { const done = state.completions.includes(`habit:${h.id}:${day}`); const HabitIcon = [Flower2, Sun, Orbit][index % 3]; return <article className={`habit-card habit-tone-${index % 3} ${done ? 'is-complete' : ''} ${nextHabit?.id === h.id ? 'is-next' : ''}`} key={h.id}>
          <div className="habit-card-top"><span className="habit-art"><HabitIcon size={30} strokeWidth={1.5} /></span><span className="reward-label">{done ? 'You did it!' : '+25 XP'}</span><button className="icon-button row-remove" aria-label={`Archive ${h.title}`} onClick={() => void app.dispatch({ type: 'habit.archive', id: h.id })}><Trash2 size={16} /></button></div>
          <h3>{h.title}</h3><span className="small">{done ? 'A win worth keeping.' : scheduleLabel(h.days)}</span>
          <div className="habit-card-actions">{!done ? <button className="habit-select" aria-label={`Make ${h.title} my next step`} aria-pressed={nextHabit?.id === h.id} onClick={() => { setChosenHabit(h.id); const target = document.querySelector<HTMLElement>('.next-step'); target?.scrollIntoView({ block: 'center', behavior: state.preferences.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); target?.focus({ preventScroll: true }); }}>{nextHabit?.id === h.id ? 'Up next' : 'Pick this'}<ArrowUpRight size={16} /></button> : <span className="habit-done">Saved <Check size={15} /></span>}
          <button className={`check-button ${done ? 'checked' : ''}`} aria-label={`Complete ${h.title}`} disabled={done || saving} onClick={() => void app.dispatch({ type: 'habit.complete', id: h.id }, 'Daily win saved. +25 XP.')}><Check size={19} /></button></div>
        </article>; })}<button className="habit-add" onClick={() => add('habit')}><Plus size={22} /><strong>Room for a new win</strong><small>Add a habit of your own</small></button></div>
        <HabitSchedule app={app} />
      </section>
      <aside className="daily-aside"><section id="growth-goals" tabIndex={-1} className="goals-section"><div className="section-heading"><h2>Dream a little bigger</h2><button className="icon-button" aria-label="New goal" onClick={() => add('goal')}><Plus size={18} /></button></div>
        {!state.goals.length && <p>Something you’d love to work toward.</p>}
        {state.goals.map((g) => <div className="list-row goal-row" key={g.id}><button className={`check-button ${g.completed ? 'checked' : ''}`} aria-label={`Complete goal ${g.title}`} disabled={g.completed} onClick={() => void app.dispatch({ type: 'goal.complete', id: g.id }, 'Milestone reached. +50 XP and +20 Growth Coins.')}>{g.completed ? <Check size={17} /> : <Target size={18} />}</button><div className="grow"><strong className={g.completed ? 'completed' : ''}>{g.title}</strong><span className="small">{g.completed ? 'Milestone reached' : 'At your own pace · 20 coins'}</span></div></div>)}
      </section><button className="assistant-invite" onClick={openAssistant}><span className="invite-icon"><Sparkles size={22} /></span><span><strong>Got a spark of an idea?</strong><span className="small">Turn {nextGoal ? 'your goal' : 'an idea'} into a small next step.</span></span><ArrowUpRight size={20} /></button></aside>
    </div>
    <ActivityOverview app={app} openProgress={openProgress} />
    {adding && <Modal title={adding === 'habit' ? 'Make space for a small habit' : 'Something to grow toward'} onClose={() => setAdding(null)}><p>{adding === 'habit' ? 'Choose something you can repeat. You can change the schedule whenever you need.' : 'A milestone to work toward, without a deadline to race.'}</p><form className="stack" onSubmit={(e) => { e.preventDefault(); if (saving) return; setSaving(true); void app.dispatch(adding === 'habit' ? { type: 'habit.add', id: crypto.randomUUID(), title, days: [0, 1, 2, 3, 4, 5, 6] } : { type: 'goal.add', id: crypto.randomUUID(), title }).then((ok) => { if (ok) setAdding(null); }).finally(() => setSaving(false)); }}><label>{adding === 'habit' ? 'New daily habit' : 'New goal'}<input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={adding === 'habit' ? 'Read a few pages' : 'Learn to draw from life'} required maxLength={160} /></label><button className="primary-button" disabled={saving}><Plus size={18} />{saving ? 'Saving…' : adding === 'habit' ? 'Add habit' : 'Add goal'}</button></form></Modal>}
  </div>;
}
