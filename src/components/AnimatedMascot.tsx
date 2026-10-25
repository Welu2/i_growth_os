import { useId } from 'react';
import type { CompanionType } from '../domain/model';

export function AnimatedMascot({ type, actionState = 'idle', grown = false, blooming = false }: {
  type: CompanionType; actionState?: 'idle' | 'pet' | 'focus'; grown?: boolean; blooming?: boolean;
}) {
  const paint = useId().replace(/:/g, '');
  const happy = actionState === 'pet';
  const fur = type === 'panda' ? '#f7eddb' : type === 'dog' ? '#d6aa76' : '#df905c';
  const dark = type === 'panda' ? '#33463e' : '#76503d';
  return <div className={`mascot-art mascot-${type} mood-${actionState}`}>
    <svg viewBox="0 0 160 190" aria-hidden="true">
      <defs>
        <radialGradient id={paint + 'fur'} cx="32%" cy="24%" r="80%"><stop stopColor={type === 'panda' ? '#fffaf0' : type === 'dog' ? '#f2d4a7' : '#f6bc81'} /><stop offset=".6" stopColor={fur} /><stop offset="1" stopColor={type === 'panda' ? '#bcbbb0' : '#ad7150'} /></radialGradient>
        <radialGradient id={paint + 'dark'} cx="30%" cy="20%" r="85%"><stop stopColor={type === 'panda' ? '#5b6f6b' : '#a68368'} /><stop offset=".65" stopColor={dark} /><stop offset="1" stopColor="#263c3b" /></radialGradient>
        <linearGradient id={paint + 'pot'}><stop stopColor="#ad674c" /><stop offset=".35" stopColor="#edb28a" /><stop offset=".8" stopColor="#c38260" /><stop offset="1" stopColor="#9c604b" /></linearGradient>
        <linearGradient id={paint + 'leaf'} x1="0" y1="1" x2="1" y2="0"><stop stopColor="#346b58" /><stop offset=".52" stopColor="#6caa7e" /><stop offset="1" stopColor="#c3d997" /></linearGradient>
        <radialGradient id={paint + 'belly'} cx="35%" cy="25%" r="80%"><stop stopColor="#fff8e8" /><stop offset="1" stopColor="#deccb2" /></radialGradient>
      </defs>
      {type === 'seedling' ? <>
        <ellipse cx="80" cy="177" rx="43" ry="8" fill="#182e2433" />
        <path d="M49 128 L57 172 Q80 184 103 172 L111 128Z" fill={`url(#${paint}pot)`} />
        <path d="M53 132 L60 167 Q70 173 77 173 L72 132Z" fill="#e4aa87" />
        <ellipse cx="80" cy="127" rx="32" ry="9" fill="#ad6c50" />
        <ellipse cx="80" cy="126" rx="25" ry="5" fill="#604936" /><path d="M60 126 l3 -1 M71 128 l2 -2 M91 125 l4 1 M101 128 l-3 -1" stroke="#b7986d" strokeWidth="2" strokeLinecap="round" /><path d="M58 162 Q80 173 102 162 M57 159 Q80 169 103 159" fill="none" stroke="#f7cfac" opacity=".45" />
        <g className="plant-stem">
          <path d="M80 126 Q73 87 82 45" stroke="#668a54" strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M79 92 Q26 90 30 57 Q72 53 79 92" fill={`url(#${paint}leaf)`} />
          <path d="M79 75 Q123 82 134 39 Q96 33 79 75" fill={`url(#${paint}leaf)`} />
          <path d="M80 86 L43 66 M84 65 L121 47" stroke="#d9e9aa" strokeWidth="1.3" opacity=".7" fill="none" />
          <path d="M52 73 L49 63 M60 78 L60 66 M96 59 L98 45 M108 54 L113 40 M96 59 L113 62" stroke="#d9e9aa" strokeWidth=".9" opacity=".6" fill="none" />
          {grown && <><path d="M80 110 Q37 118 37 89 Q64 83 80 110" fill="#b0c98b" /><path d="M81 101 Q117 107 126 78 Q101 73 81 101" fill="#72965c" /></>}
          {blooming && <g transform="translate(83 40)" className="scene-flower">{[0,60,120,180,240,300].map((r) => <ellipse key={r} cy="-12" rx="9" ry="15" transform={`rotate(${r})`} fill="#f2ce9b" />)}<circle r="10" fill="#bd8145" /></g>}
        </g>
        <g className="mascot-eyes"><circle cx="69" cy="149" r="3" fill="#573e33" /><circle cx="91" cy="149" r="3" fill="#573e33" /></g>
        <path d="M75 157 Q80 162 85 157" fill="none" stroke="#573e33" strokeWidth="2.5" strokeLinecap="round" />
      </> : <g className="animal-body">
        <ellipse cx="80" cy="178" rx="48" ry="8" fill="#172c2433" />
        {type !== 'panda' && <path className="mascot-tail" d="M113 145 Q157 145 143 112 Q137 98 126 112 Q136 128 111 127" fill={`url(#${paint}fur)`} stroke={dark} strokeWidth="3" />}
        <ellipse cx="80" cy="131" rx="39" ry="43" fill={`url(#${paint}fur)`} />
        <ellipse cx="80" cy="137" rx="25" ry="30" fill={`url(#${paint}belly)`} />
        <ellipse cx="53" cy="172" rx="21" ry="12" fill={`url(#${paint}dark)`} />
        <ellipse cx="107" cy="172" rx="21" ry="12" fill={`url(#${paint}dark)`} />
        <g className={happy ? 'mascot-wave' : ''}><ellipse cx="42" cy="124" rx="13" ry="26" fill={`url(#${paint}dark)`} transform="rotate(22 42 124)" /></g>
        <ellipse cx="118" cy="123" rx="13" ry="25" fill={`url(#${paint}dark)`} transform="rotate(-22 118 123)" />
        {type === 'fox' ? <><path d="M36 61 L31 12 L66 43Z" fill={`url(#${paint}fur)`} /><path d="M124 61 L129 12 L94 43Z" fill={`url(#${paint}fur)`} /><path d="M40 46 L38 25 L57 44 M120 46 L122 25 L103 44" stroke="#f6d7b9" strokeWidth="7" /></> : type === 'dog' ? <><ellipse cx="38" cy="61" rx="16" ry="33" fill={`url(#${paint}dark)`} transform="rotate(15 38 61)" /><ellipse cx="122" cy="61" rx="16" ry="33" fill={`url(#${paint}dark)`} transform="rotate(-15 122 61)" /></> : <><circle cx="44" cy="36" r="20" fill={`url(#${paint}dark)`} /><circle cx="116" cy="36" r="20" fill={`url(#${paint}dark)`} /><circle cx="44" cy="36" r="11" fill="#6e8070" /><circle cx="116" cy="36" r="11" fill="#6e8070" /></>}
        <g className="mascot-head"><ellipse cx="80" cy="69" rx="49" ry="42" fill={`url(#${paint}fur)`} />
        {type === 'panda' && <><ellipse cx="60" cy="65" rx="15" ry="19" fill={`url(#${paint}dark)`} transform="rotate(15 60 65)" /><ellipse cx="100" cy="65" rx="15" ry="19" fill={`url(#${paint}dark)`} transform="rotate(-15 100 65)" /></>}
        {type !== 'panda' && <ellipse cx="80" cy="84" rx="30" ry="22" fill={`url(#${paint}belly)`} />}
        {happy ? <g stroke={type === 'panda' ? '#fff0d6' : dark} strokeWidth="3" fill="none" strokeLinecap="round"><path d="M54 65 Q60 59 66 65 M94 65 Q100 59 106 65" /></g> : <g className="mascot-eyes"><ellipse cx="60" cy="65" rx="5" ry="6" fill="#182d2c" stroke="#dbdcca" strokeWidth="1.2" /><ellipse cx="100" cy="65" rx="5" ry="6" fill="#182d2c" stroke="#dbdcca" strokeWidth="1.2" /><circle cx="61" cy="63" r="1.8" fill="#fff" /><circle cx="101" cy="63" r="1.8" fill="#fff" /></g>}
        <ellipse cx="80" cy="82" rx="7" ry="5" fill={`url(#${paint}dark)`} />
        <path d="M72 91 Q80 98 88 91" fill="none" stroke={dark} strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="47" cy="83" rx="8" ry="5" fill="#db9e8f" opacity=".6" /><ellipse cx="113" cy="83" rx="8" ry="5" fill="#db9e8f" opacity=".6" />
        <path d="M63 34 l3 -4 M70 32 l3 -5 M78 31 l3 -4 M42 92 l-3 3 M119 92 l3 3" stroke={fur} strokeWidth="3" strokeLinecap="round" opacity=".85" /></g>
        <path d="M53 105 Q80 117 107 105 L103 117 Q80 129 57 117Z" fill="#427e79" />
        <path d="M94 115 L106 139 L91 137 L86 118" fill="#427e79" />
        <path d="M41 172 l0 4 M48 174 v4 M111 174 v4 M118 172 v4" stroke="#a2a89b" strokeWidth="1.7" strokeLinecap="round" opacity=".65" />
        {actionState === 'focus' && <g><path d="M49 134 Q65 128 80 136 Q95 128 111 134 L108 157 Q95 151 80 159 Q65 151 52 157Z" fill="#e8c69a" stroke="#97724f" strokeWidth="2" /><path d="M80 136 V159" stroke="#97724f" strokeWidth="2" /></g>}
      </g>}
    </svg>
  </div>;
}
