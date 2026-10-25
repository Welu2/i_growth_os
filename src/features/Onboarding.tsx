import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowLeft, Sprout } from 'lucide-react';
import { AccountForm } from './AccountForm';
import { Modal } from '../components/Modal';
import { cloudConfigured } from '../services/cloud';
import { CompanionScene } from '../components/CompanionScene';
import { AnimatedMascot } from '../components/AnimatedMascot';
import type { GrowthController } from '../app/useGrowth';
import type { CompanionType } from '../domain/model';
export function Onboarding({ app }: { app: GrowthController }) {
  const [step, setStep] = useState(1);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  useEffect(() => { if (previousStep.current !== step) { stepHeading.current?.focus(); previousStep.current = step; } }, [step]);
  const [name, setName] = useState(''); const [goal, setGoal] = useState(''); const [habit, setHabit] = useState('');
  const [companionName, setCompanionName] = useState('Babu'); const [type, setType] = useState<CompanionType>('panda');
  const [accountOpen, setAccountOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return <main className="onboarding"><div className="onboarding-top"><div className="brand"><span className="brand-mark"><Sprout size={24} /></span><span>growth<span className="brand-light">os</span></span></div>{app.owner === 'guest' && cloudConfigured && <button className="subtle-button" onClick={() => setAccountOpen(true)}>Sign in to an existing account</button>}</div>
    <div className="onboarding-grid"><div className="onboarding-intro"><span className="eyebrow">A little better, together</span><h1>A quieter space.<br />A little more you.</h1><p>Build a habit. Follow a curiosity.<br />Grow a little world along the way.</p><CompanionScene type={type} unlocks={[]} mood="idle" habitat={null} /><span className="fine-print">Private on this device. No account needed.</span></div>
      <div className="onboarding-form"><div className="onboarding-steps" aria-label={`Step ${step} of 2`}><span className={step === 1 ? 'active' : ''}>01 · Your intention</span><span className={step === 2 ? 'active' : ''}>02 · Your companion</span></div>
        <form key={step} className="stack" onSubmit={(e) => { e.preventDefault(); if (step === 1) { setStep(2); return; } setBusy(true); void app.dispatch({ type: 'onboard', profile: { name, companionName, companionType: type, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }, goal, habit }).finally(() => setBusy(false)); }}>
          {step === 1 ? <><div><span className="eyebrow">A small beginning</span><h2 ref={stepHeading} tabIndex={-1}>What’s your next chapter?</h2><p>No perfect plan needed. Just a place to begin.</p></div><label>What should we call you?<input required autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Your first name" /></label><label>One thing you want to grow toward<input required value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={160} placeholder="Learn to sketch confidently" /></label><label>A small daily habit to help you get there<input required value={habit} onChange={(e) => setHabit(e.target.value)} maxLength={160} placeholder="Spend 10 minutes with my sketchbook" /></label><button className="primary-button wide">Meet your companion <ArrowRight size={18} /></button></> : <><div><span className="eyebrow">A friend for the journey</span><h2 ref={stepHeading} tabIndex={-1}>Who’s growing with you?</h2><p>They’ll celebrate your small wins. No chores, no pressure.</p></div><fieldset><legend>Choose your companion</legend><div className="companion-options">{([{ type: 'panda', name: 'Panda' }, { type: 'fox', name: 'Fox' }, { type: 'dog', name: 'Dog' }, { type: 'seedling', name: 'Sprout' }] as const).map((c) => <button key={c.type} type="button" aria-pressed={type === c.type} onClick={() => setType(c.type)}><AnimatedMascot type={c.type} />{c.name}</button>)}</div></fieldset><label>Give your companion a name<input required value={companionName} onChange={(e) => setCompanionName(e.target.value)} maxLength={60} /></label><button className="primary-button wide" disabled={busy}>{busy ? 'Saving…' : 'Start growing'}<ArrowRight size={17} /></button><button type="button" className="subtle-button" disabled={busy} onClick={(e) => { e.preventDefault(); setStep(1); }}><ArrowLeft size={17} /> Back to my intention</button></>}
        </form>
      </div>
    </div>{accountOpen && <Modal title="Your account" onClose={() => setAccountOpen(false)}><p>Sign in to restore your saved progress, or create an account. Guest progress stays separate.</p><AccountForm app={app} /></Modal>}
  </main>;
}
