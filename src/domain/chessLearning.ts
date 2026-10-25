import type { GrowthState } from './model';

// Versioned, workspace-scoped exercise identities: reopening is the same activity.
export const CHESS_LESSONS = [
  { level: 'beginner', label: 'Beginner · I’m new to chess', id: 'c4e55001-0001-4000-8000-000000000001', nextId: 'c4e55001-0001-4000-8000-000000000002',
    title: 'Chess: move a rook', concept: 'How a rook moves', query: 'chess beginner rook movement explained', piece: 'rook', from: 'd4', answer: 'd7',
    prompt: 'Move the white rook from d4 to d7.', hint: 'A rook travels along a row or column. It cannot jump over pieces.', explanation: 'd7 is on the same file as d4: three squares straight up.',
    next: 'Chess: find three rook moves', nextInstructions: 'On an empty board, put a rook on d4. Write down three squares it can reach, then explain why e5 is not a rook move.', nextCriteria: 'Name three reachable squares and explain the diagonal exception.' },
  { level: 'basics', label: 'Some basics · I know the pieces', id: 'c4e55002-0001-4000-8000-000000000001', nextId: 'c4e55002-0001-4000-8000-000000000002',
    title: 'Chess: follow a bishop diagonal', concept: 'Bishop diagonals', query: 'chess bishop diagonal movement lesson', piece: 'bishop', from: 'c1', answer: 'h6',
    prompt: 'Move the white bishop from c1 to h6 on this empty diagonal.', hint: 'A bishop travels diagonally and stays on the same square color. It cannot jump over pieces.', explanation: 'c1–d2–e3–f4–g5–h6 is one clear diagonal.',
    next: 'Chess: trace two bishop diagonals', nextInstructions: 'Put a bishop on d4 on an empty board. Name two destinations on different diagonals, and explain why d5 is not reachable in one bishop move.', nextCriteria: 'Name two diagonal destinations and explain why d5 does not work.' },
  { level: 'intermediate', label: 'Intermediate · I want a tactic', id: 'c4e55003-0001-4000-8000-000000000001', nextId: 'c4e55003-0001-4000-8000-000000000002',
    title: 'Chess: spot a knight fork', concept: 'A knight fork', query: 'chess knight fork explained short lesson', piece: 'knight', from: 'd4', answer: 'f5',
    prompt: 'Move the white knight from d4 to a square that attacks both the black rook on d6 and queen on h6.', hint: 'Try an L-shaped jump: two squares in one direction and one sideways. Check what the knight attacks from its new square.', explanation: 'From f5, the knight attacks d6 and h6 at the same time. That double attack is a fork.',
    next: 'Chess: explain a knight fork', nextInstructions: 'Recreate the knight on d4, black rook on d6 and black queen on h6. Move to f5, then name both attacked squares without looking at the explanation.', nextCriteria: 'Name the destination and both attacked squares from memory.' },
] as const;
export type ChessLesson = typeof CHESS_LESSONS[number];
export type ChessLevel = ChessLesson['level'];
export const CHESS_MINUTES = [5, 10, 15] as const;
export type ChessMinutes = typeof CHESS_MINUTES[number];
export function lessonBudget(minutes: ChessMinutes) {
  const videoSeconds = minutes === 5 ? 120 : 239;
  return { videoSeconds, practiceMinutes: minutes - Math.ceil(videoSeconds / 60) };
}
export function correctChessMove(lesson: ChessLesson, square: string) { return square.trim().toLowerCase() === lesson.answer; }
export function chessTask(lesson: ChessLesson, minutes: number, resourceId: string | null) {
  return { id: lesson.id, title: lesson.title, details: { resourceId, objective: lesson.concept, instructions: `${lesson.prompt} ${lesson.hint} Reopen Learn chess to use the practice board.`, minutes, criteria: 'Try the board exercise and explain the move in your own words.', basis: 'topic' as const, source: 'Offline template' as const, reflection: '' } };
}
export function chessFollowUp(lesson: ChessLesson, title: string) {
  return { id: lesson.nextId, title: title.trim(), details: { resourceId: null, objective: lesson.concept, instructions: lesson.nextInstructions, minutes: 3, criteria: lesson.nextCriteria, basis: 'topic' as const, source: 'Offline template' as const, reflection: '' } };
}
export function savedChessTask(state: GrowthState, lesson: ChessLesson) { return state.exercises.find((task) => task.id === lesson.id); }
