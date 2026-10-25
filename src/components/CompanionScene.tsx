import { useId, type PointerEvent } from 'react';
import type { CompanionType } from '../domain/model';
import type { StoryId } from '../domain/story';
import { AnimatedMascot } from './AnimatedMascot';

type Props = { type: CompanionType; unlocks: StoryId[]; mood: 'idle' | 'pet' | 'focus'; habitat: string | null; daylight?: boolean; onGreet?: () => void; name?: string };
export function CompanionScene({ type, unlocks, mood, habitat, daylight = false, onGreet, name = 'your companion' }: Props) {
  const paint = useId().replace(/:/g, '');
  const has = (id: StoryId) => unlocks.includes(id);
  const follow = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' || document.hidden || document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--look-x', `${((event.clientX - box.left) / box.width - .5) * 7}px`);
    event.currentTarget.style.setProperty('--look-y', `${((event.clientY - box.top) / box.height - .5) * 4}px`);
  };
  return <div className={`living-scene ${daylight ? 'scene-day' : 'scene-night'} scene-${habitat ?? 'default'} ${mood === 'pet' ? 'scene-happy' : ''}`} onPointerMove={follow} onPointerLeave={(event) => { event.currentTarget.style.setProperty('--look-x', '0px'); event.currentTarget.style.setProperty('--look-y', '0px'); }}>
    <svg className="scene-background" viewBox="0 0 640 420" role="img" aria-label={`A peaceful ${daylight ? 'sunlit' : 'moonlit'} garden. ${unlocks.length} world improvements earned.`}>
      <defs>
        <radialGradient id={paint + 'sky'} cx=".55" cy=".38" r=".65"><stop stopColor={daylight ? '#e9d89b' : '#71694b'} /><stop offset="1" stopColor={daylight ? '#a29c68' : '#34392f'} /></radialGradient>
        <linearGradient id={paint + 'island'} x2="0" y2="1"><stop stopColor="#91a16f" /><stop offset="1" stopColor="#526744" /></linearGradient>
        <radialGradient id={paint + 'moon'}><stop stopColor="#e8d5a2" stopOpacity=".22" /><stop offset="1" stopColor="#e8d5a2" stopOpacity="0" /></radialGradient>
        <linearGradient id={paint + 'pond'} x2="1" y2="1"><stop stopColor="#b5c9a0" /><stop offset="1" stopColor="#748f72" /></linearGradient>
      </defs>
      <rect width="640" height="420" rx="28" fill={`url(#${paint}sky)`} />
      <circle cx="462" cy="91" r="84" fill={`url(#${paint}moon)`} />
      {daylight ? <circle cx="462" cy="91" r="28" fill="#f1d79f" /> : <path d="M479 64a29 29 0 1 0 5 44 30 30 0 0 1-5-44Z" fill="#f1deb2" />}
      {!daylight && <g className="scene-stars" fill="#d7dfd2">{[[72,64],[144,110],[230,46],[327,80],[385,39],[550,150],[577,62],[96,185],[377,147]].map(([x,y],i) => <circle key={x} cx={x} cy={y} r={i % 3 === 0 ? 2 : 1.2} style={{ animationDelay: `${i * -.7}s` }} />)}</g>}
      <g className="scene-clouds" fill={daylight ? '#d7e1d8' : '#7c8e96'} opacity=".14"><path d="M65 124q20-23 41-7 11-34 42-11 25-9 39 18Z" /><path d="M336 164q20-23 41-7 11-34 42-11 25-9 39 18Z" /></g>
      <path d="M0 253Q84 147 170 218T349 207T513 215T640 200V420H0Z" fill={daylight ? '#a4a073' : '#595e40'} />
      <path d="M0 300Q124 193 234 275T432 253T640 275V420H0Z" fill={daylight ? '#7c8759' : '#414f38'} />
      <ellipse cx="325" cy="373" rx="226" ry="25" fill="#101b24" opacity=".35" />
      <path d="M90 294Q106 265 205 251Q336 219 487 266Q560 286 552 317L535 345Q444 400 209 371Q99 361 90 324Z" fill="#24362d" />
      <ellipse cx="321" cy="301" rx="231" ry="73" fill={`url(#${paint}island)`} />
      <path d="M171 339Q245 295 343 310Q416 322 483 291" fill="none" stroke="#a7b389" strokeWidth="26" opacity=".25" strokeLinecap="round" />
      <ellipse cx="413" cy="322" rx="65" ry="23" fill={`url(#${paint}pond)`} />
      <g className="pond-ripples" fill="none" stroke="#b1d4bc" opacity=".35"><ellipse cx="412" cy="322" rx="30" ry="7" /><ellipse cx="412" cy="322" rx="49" ry="13" /></g>
      <g className="scene-tree"><path d="M158 281V169" stroke="#7e8262" strokeWidth="12" strokeLinecap="round" /><path d="M158 239l-25-24m25 6 27-28" fill="none" stroke="#7e8262" strokeWidth="7" /><path d="M110 209Q75 181 112 154Q98 115 139 112Q171 77 196 123Q232 127 213 164Q234 205 189 213Z" fill="#dcb754" /><path d="M117 158Q159 110 195 143Q179 175 144 185Z" fill="#ffe3a0" opacity=".55" /></g>
      <g fill="#94b986"><ellipse cx="127" cy="285" rx="28" ry="11" /><ellipse cx="501" cy="285" rx="20" ry="9" /></g>
      <g fill="#b2cc8c" opacity=".8"><path d="M204 283q-16-34-20-9l20 9q-2-40 11-17Z" /><path d="M475 338q-15-24-23-11l23 11q0-32 12-18Z" /><path d="M132 323q-14-23-19-9l19 9q0-32 10-18Z" /></g>
      <g fill="#a2ae91"><ellipse cx="385" cy="345" rx="13" ry="7" /><ellipse cx="444" cy="342" rx="10" ry="5" /><ellipse cx="196" cy="319" rx="13" ry="8" /></g>
      {(has('begin') || habitat === 'fern') && <g><path d="M226 286v-31m0 13q-24-5-16-19 17 4 16 19m0-4q1-22 20-20 0 19-20 20" fill="#d0e99c" stroke="#91ab72" strokeWidth="3" /></g>}
      {has('rhythm') && <g><rect x="447" y="233" width="66" height="41" rx="4" fill="#aa9875" /><path d="M437 237l44-38 43 38Z" fill="#687e62" /><path d="M473 274v-26q9-9 17 0v26Z" fill="#39483a" /><rect x="454" y="244" width="10" height="12" rx="2" fill="#e1c58b" /></g>}
      {has('practice') && <g><path d="M371 275v22m51-22v22" stroke="#9d8c69" strokeWidth="5" /><rect x="363" y="271" width="68" height="7" rx="3" fill="#c1ac7d" /><path d="M379 269l18-5 18 5v5h-36Z" fill="#e5d9b0" /><path d="M397 265v9" stroke="#9d8c69" /></g>}
      {has('focus') && <g><circle cx="475" cy="212" r="32" fill={`url(#${paint}moon)`} /><path d="M475 268v-52" stroke="#b7a983" strokeWidth="4" /><path d="M465 218v-19h20v19Z" fill="#ecd091" /><path d="M460 200l15-11 15 11Z" fill="#9d9871" /></g>}
      {(has('goal') || habitat === 'sunrise') && <g>{[172,240,458,502].map((x,i) => <g key={x} transform={`translate(${x} ${i%2?300:310})`}><path d="M0 10V-4" stroke="#97b087" strokeWidth="3" /><circle r="7" fill="#e3b6a0" /><circle r="3" fill="#f6de9b" /></g>)}</g>}
      <g className="fireflies" fill="#ecf9a2">{[[245,200],[378,229],[190,245],[509,229],[350,175]].map(([x,y],i)=><circle key={x} cx={x} cy={y} r="2" style={{ animationDelay: `${i * -.8}s` }} />)}</g>
      {habitat === 'stars' && <path d="m320 35 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="#f1d79f" />}
    </svg>
    {onGreet ? <button className="scene-character" aria-label={`Greet ${name}`} onClick={onGreet}><AnimatedMascot type={type} actionState={mood} grown={has('begin')} blooming={has('goal')} /></button> : <div className="scene-character"><AnimatedMascot type={type} actionState={mood} grown={has('begin')} blooming={has('goal')} /></div>}
    {mood === 'pet' && <span className="scene-heart" aria-hidden="true">♡</span>}
  </div>;
}
