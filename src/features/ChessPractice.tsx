import { useState } from 'react';
import { correctChessMove, type ChessLesson } from '../domain/chessLearning';
const squares = Array.from({ length: 64 }, (_, index) => `${'abcdefgh'[index % 8]}${8 - Math.floor(index / 8)}`);
const pieces = { rook: '♖', bishop: '♗', knight: '♘' };
export function ChessPractice({ lesson, solved, onSolve }: { lesson: ChessLesson; solved: boolean; onSolve: () => void }) {
  const [selected, setSelected] = useState(lesson.from as string);
  const [destination, setDestination] = useState('');
  const [feedback, setFeedback] = useState('');
  function tryMove(square: string) {
    if (solved) return;
    if (correctChessMove(lesson, square)) { onSolve(); setFeedback(''); }
    else setFeedback('Try another square. Use the hint below; there is no penalty for trying.');
  }
  return <div className="chess-practice"><h3>{lesson.prompt}</h3>
    <p className="fine-print">A movement exercise with isolated pieces, not a full game. White is at the bottom.</p>
    <div className="chess-board" role="group" aria-label="Chess practice board. Arrow keys move between squares; Enter tries a move.">
      {squares.map((square, index) => {
        const isPlayer = square === (solved ? lesson.answer : lesson.from);
        const enemy = lesson.piece === 'knight' ? square === 'd6' ? 'rook' : square === 'h6' ? 'queen' : null : null;
        return <button key={square} type="button" data-square={square} tabIndex={selected === square ? 0 : -1} aria-label={`${square}: ${isPlayer ? `white ${lesson.piece}` : enemy ? `black ${enemy}` : 'empty'}`} aria-disabled={solved} className={`chess-square ${(Math.floor(index / 8) + index % 8) % 2 ? 'dark-square' : 'light-square'} ${solved && square === lesson.answer ? 'solved-square' : ''}`} onFocus={() => setSelected(square)} onClick={() => tryMove(square)} onKeyDown={(event) => {
          let next = index;
          if (event.key === 'ArrowRight' && index % 8 < 7) next++;
          else if (event.key === 'ArrowLeft' && index % 8 > 0) next--;
          else if (event.key === 'ArrowUp' && index >= 8) next -= 8;
          else if (event.key === 'ArrowDown' && index < 56) next += 8;
          if (event.key.startsWith('Arrow')) { event.preventDefault(); event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-square="${squares[next]}"]`)?.focus(); }
        }}><span className="square-name" aria-hidden="true">{square}</span><span className="chess-piece" aria-hidden="true">{isPlayer ? pieces[lesson.piece] : enemy === 'rook' ? '♜' : enemy === 'queen' ? '♛' : ''}</span></button>;
      })}
    </div>
    <form className="inline-form" onSubmit={(event) => { event.preventDefault(); tryMove(destination); }}><label>Destination square<input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="e.g. d7" maxLength={2} pattern="[a-hA-H][1-8]" required disabled={solved} /></label><button className="secondary-button" disabled={solved}>Try move</button></form>
    <p role="status">{solved ? `You found it. ${lesson.explanation}` : feedback}</p>
    <details><summary>Show a hint</summary><p>{lesson.hint}</p></details>
  </div>;
}
