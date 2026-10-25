export const ACTIVITY_CONTEXTS = ['today', 'learn', 'progress', 'settings', 'assistant'] as const;
export type ActivityContext = typeof ACTIVITY_CONTEXTS[number];
export const ACTIVITY_LABELS: Record<ActivityContext, string> = { today: 'Daily planning', learn: 'Learning & practice', progress: 'Reviewing progress', settings: 'Preferences', assistant: 'Planning with the assistant' };
export const emptyActivity = () => ({ today: 0, learn: 0, progress: 0, settings: 0, assistant: 0 });

/** Conservative full-minute estimates. A context is a screen, never an inferred task or attention claim. */
export class ActivityMeter {
  private previous: number | null = null;
  private elapsed = 0;
  private contexts = emptyActivity();
  reset() { this.previous = null; this.elapsed = 0; this.contexts = emptyActivity(); }
  sample(now: number, eligible: boolean, context: ActivityContext): { minute: number; context: ActivityContext } | null {
    if (!eligible) { this.reset(); return null; }
    const delta = this.previous === null ? 0 : now - this.previous;
    this.previous = now;
    // Suspended tabs, sleeping devices, and clock changes never create catch-up time.
    if (delta < 0 || delta > 2500) { this.elapsed = 0; this.contexts = emptyActivity(); return null; }
    this.elapsed += delta; this.contexts[context] += delta;
    if (this.elapsed < 60_000) return null;
    const dominant = ACTIVITY_CONTEXTS.reduce((best, key) => this.contexts[key] > this.contexts[best] ? key : best, context);
    this.elapsed = 0; this.contexts = emptyActivity();
    return { minute: Math.floor((now - 1) / 60_000), context: dominant };
  }
}
