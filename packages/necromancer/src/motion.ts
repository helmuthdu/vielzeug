import type { MotionMode } from './types';

/**
 * Reports whether the requested motion preference reduces visible movement.
 *
 * This is the same check `animate()` applies internally, exposed so hand-rolled
 * effects (scroll behavior, tweens) stay consistent with it.
 */
export function shouldReduceMotion(mode: MotionMode): boolean {
  if (mode === 'full') return false;

  if (mode === 'reduced') return true;

  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
