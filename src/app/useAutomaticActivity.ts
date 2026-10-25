import { useEffect, useRef, useState } from 'react';
import { ActivityMeter, type ActivityContext } from '../domain/activity';
import type { Action } from '../domain/model';

export type ActivityStatus = 'paused' | 'excluded' | 'idle' | 'observing';
export function useAutomaticActivity(owner: string, enabled: boolean, context: ActivityContext, exclusions: ActivityContext[], dispatch: (action: Action) => Promise<boolean>) {
  const [status, setStatus] = useState<ActivityStatus>('paused');
  const current = useRef({ context, exclusions });
  useEffect(() => { current.current = { context, exclusions }; }, [context, exclusions]);
  useEffect(() => {
    if (!enabled) return;
    const meter = new ActivityMeter();
    let lastInteraction = Date.now();
    const interact = () => { lastInteraction = Date.now(); };
    const reset = () => { meter.reset(); lastInteraction = 0; };
    const resume = () => { meter.reset(); interact(); };
    const visibility = () => { if (document.hidden) reset(); else resume(); };
    const tick = () => {
      const now = Date.now(), { context, exclusions } = current.current;
      const excluded = exclusions.includes(context);
      const eligible = !excluded && !document.hidden && document.hasFocus() && now >= lastInteraction && now - lastInteraction < 120_000;
      setStatus(excluded ? 'excluded' : eligible ? 'observing' : 'idle');
      const minute = meter.sample(now, eligible, context);
      if (minute) void dispatch({ type: 'visible.minute', ...minute });
    };
    window.addEventListener('pointerdown', interact); window.addEventListener('keydown', interact);
    window.addEventListener('scroll', interact, true); window.addEventListener('blur', reset); window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', visibility);
    const timer = window.setInterval(tick, 1000);
    return () => {
      clearInterval(timer); meter.reset();
      window.removeEventListener('pointerdown', interact); window.removeEventListener('keydown', interact);
      window.removeEventListener('scroll', interact, true); window.removeEventListener('blur', reset); window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [owner, enabled, dispatch]);
  return !enabled ? 'paused' : exclusions.includes(context) ? 'excluded' : status;
}
