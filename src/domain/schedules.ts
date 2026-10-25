export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function scheduleLabel(days: number[]) { return new Set(days).size === 7 ? 'Daily' : days.map((d) => WEEKDAYS[d].slice(0, 3)).join(', '); }
