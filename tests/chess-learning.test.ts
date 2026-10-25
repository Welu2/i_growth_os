import { describe, expect, it } from 'vitest';
import { CHESS_LESSONS, CHESS_MINUTES, chessTask, chessFollowUp, correctChessMove, lessonBudget } from '../src/domain/chessLearning';
import { applyCommand, initialState, totalXp, balance, persistedStateSchema, type Action } from '../src/domain/model';
import { youtubeResults } from '../src/services/youtube';
const run = (state: ReturnType<typeof initialState>, action: Action) => applyCommand(state, { id: crypto.randomUUID(), at: Date.now(), action });
describe('guided chess practice', () => {
  it('reserves meaningful practice time within every session budget', () => {
    for (const minutes of CHESS_MINUTES) {
      const budget = lessonBudget(minutes);
      expect(budget.practiceMinutes).toBeGreaterThanOrEqual(3);
      expect(budget.videoSeconds).toBeLessThan(240);
      expect(budget.videoSeconds + budget.practiceMinutes * 60).toBeLessThanOrEqual(minutes * 60);
    }
    expect(lessonBudget(5).videoSeconds).toBe(120);
  });
  it.each(CHESS_LESSONS)('checks the isolated $piece exercise without changing progress', (lesson) => {
    expect(correctChessMove(lesson, lesson.answer.toUpperCase())).toBe(true);
    expect(correctChessMove(lesson, lesson.from)).toBe(false);
    expect(correctChessMove(lesson, 'z9')).toBe(false);
  });
  it('saves and resumes each assignment once and never rewards a preview or follow-up save', () => {
    let state = initialState();
    const lesson = CHESS_LESSONS[0];
    const task = chessTask(lesson, 3, null);
    state = run(state, { type: 'plan.save', tasks: [task] });
    state = run(state, { type: 'plan.save', tasks: [task] });
    expect(state.exercises).toHaveLength(1); expect(totalXp(state)).toBe(0);
    state = run(state, { type: 'exercise.complete', id: lesson.id });
    state = persistedStateSchema.parse(JSON.parse(JSON.stringify(state)));
    state = run(state, { type: 'plan.save', tasks: [chessTask(lesson, 11, null)] });
    state = run(state, { type: 'exercise.complete', id: lesson.id });
    expect(totalXp(state)).toBe(30); expect(balance(state)).toBe(10);
    expect(state.exercises[0].details?.minutes).toBe(3);
    const next = chessFollowUp(lesson, lesson.next);
    state = run(state, { type: 'plan.save', tasks: [next] });
    state = run(state, { type: 'plan.save', tasks: [next] });
    expect(state.exercises).toHaveLength(2); expect(totalXp(state)).toBe(30);
    expect(state.exercises[1].completed).toBe(false);
    expect(new Set(CHESS_LESSONS.flatMap((item) => [item.id, item.nextId])).size).toBe(6);
  });
  it('keeps a saved resource on a failed plan and retries without duplicating the activity', () => {
    let state = initialState(); const resourceId = crypto.randomUUID();
    state = run(state, { type: 'resource.add', id: resourceId, title: 'My chess lesson', url: 'https://youtu.be/dQw4w9WgXcQ' });
    expect(() => run(state, { type: 'plan.save', tasks: [chessTask(CHESS_LESSONS[0], 3, crypto.randomUUID())] })).toThrow();
    expect(state.resources).toHaveLength(1); expect(state.exercises).toHaveLength(0);
    state = run(state, { type: 'plan.save', tasks: [chessTask(CHESS_LESSONS[0], 3, resourceId)] });
    expect(state.exercises[0].details?.resourceId).toBe(resourceId); expect(totalXp(state)).toBe(0);
  });
  it('rejects unsafe provider links and implausible short-video metadata', () => {
    const result = { title: 'Chess', creator: 'Teacher', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', durationSeconds: 90 };
    expect(youtubeResults.parse({ results: [result] }).results).toHaveLength(1);
    for (const bad of [{ url: 'javascript:alert(1)' }, { url: 'https://evil.example/watch' }, { durationSeconds: 240 }, { durationSeconds: 0 }]) expect(youtubeResults.safeParse({ results: [{ ...result, ...bad }] }).success).toBe(false);
  });
});
