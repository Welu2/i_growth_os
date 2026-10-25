import { useEffect, useRef, useState } from 'react';
import { BookOpen, Heart, House, LockKeyhole, Check, Sun, Moon, Sparkles } from 'lucide-react';
import { Modal } from '../components/Modal';
import { CompanionScene } from '../components/CompanionScene';
import { level, totalXp, type GrowthState } from '../domain/model';
import { STORY } from '../domain/story';

export function Companion({ state, pending = false, onHome }: { state: GrowthState; pending?: boolean; onHome: () => void }) {
  const [daylight, setDaylight] = useState(false);
  const [reward, setReward] = useState(0);
  const [greeting, setGreeting] = useState<'welcome' | 'hello' | null>(() => document.hidden ? null : 'welcome');
  const [celebrate, setCelebrate] = useState(false);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const xp = totalXp(state);
  const previous = useRef(xp);
  const focus = state.story.some((s) => s.id === 'practice');
  const type = state.profile?.companionType ?? 'panda';
  const plant = type === 'seedling';
  const unlocked = state.story.map((s) => s.id);
  const latest = STORY.find((s) => s.id === state.story.at(-1)?.id);
  useEffect(() => {
    const update = () => {
      setHidden(document.hidden);
      setGreeting(document.hidden ? null : 'welcome');
    };
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect(() => {
    if (xp <= previous.current) { previous.current = xp; return; }
    const delta = xp - previous.current;
    previous.current = xp;
    const start = setTimeout(() => { setCelebrate(true); setReward(delta); }, 0);
    const end = setTimeout(() => setCelebrate(false), 3500);
    return () => { clearTimeout(start); clearTimeout(end); };
  }, [xp]);
  useEffect(() => { if (!greeting) return; const timer = setTimeout(() => setGreeting(null), 3200); return () => clearTimeout(timer); }, [greeting]);
  return <section className={`companion-panel living-companion ${celebrate ? 'world-celebrating' : ''} ${hidden ? 'animation-paused' : ''}`} aria-label="Your companion">
    <div className="world-toolbar"><span><Sparkles size={16} /> {state.profile?.companionName}’s world</span><button className="icon-button" aria-label={daylight ? 'Switch scene to moonlight' : 'Switch scene to daylight'} onClick={() => setDaylight(!daylight)}>{daylight ? <Moon size={18} /> : <Sun size={18} />}</button></div>
    <div className="world-stage"><CompanionScene type={type} unlocks={unlocked} mood={celebrate || greeting ? 'pet' : focus ? 'focus' : 'idle'} habitat={state.equipped} daylight={daylight} name={state.profile?.companionName} onGreet={() => setGreeting('hello')} />
      <p className={`companion-speech ${celebrate || greeting ? 'speech-active' : ''}`} role="status">{celebrate ? `Look at you grow! +${reward} XP` : greeting === 'welcome' ? 'You’re here. Hi, you ♡' : greeting === 'hello' ? 'Happy to see you, too ♡' : ''}</p>
    </div>
    {celebrate && <div className="win-burst" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ '--piece': i } as import('react').CSSProperties} />)}</div>}
    <div className="world-dock"><div className="companion-actions"><button className="subtle-button" onClick={() => setOpen(true)}><BookOpen size={16} /> Our story</button><button className="subtle-button" onClick={onHome}><House size={16} /> Our home</button><button className="icon-button" aria-label="Say hello" onClick={() => setGreeting('hello')}><Heart size={18} /></button></div><span className="level-badge">Lv. {level(state)}</span></div>
    <div className="world-progress"><div className="xp-label"><span>{xp % 150} / 150 XP</span><strong>{latest ? plant ? latest.plant : latest.animal : 'A place to begin'}</strong></div><progress max={150} value={xp % 150} aria-label="Progress to next companion level" /></div>
    {pending && <span className="small world-pending">Recent progress is pending account sync.</span>}
    {open && <Modal title={`Our story · ${state.profile?.companionName}`} onClose={() => setOpen(false)}><p>A life built from the things you practice. Your progress stays here when you rest.</p><div className="story-timeline">{STORY.map((chapter, i) => {
      const earned = state.story.find((s) => s.id === chapter.id);
      return <article className={`story-chapter ${earned ? 'unlocked' : ''}`} key={chapter.id}><span className="story-number">{earned ? <Check size={18} /> : <LockKeyhole size={18} />}</span><div><span className="small">Chapter {i + 1}{earned ? ' · Yours to keep' : ' · Still to come'}</span><h3>{chapter.title}</h3><strong>{plant ? chapter.plant : chapter.animal}</strong>{earned ? <><p>{chapter.text}</p><p>{chapter.after}</p></> : <p>{chapter.next}. No rush, and no streak to protect.</p>}</div></article>;
    })}</div><p className="fine-print">Written story · saved on this device{pending ? ' · recent changes pending sync' : ''}. Story moments unlock through eligible activities, with no extra coin charge.</p></Modal>}
  </section>;
}
