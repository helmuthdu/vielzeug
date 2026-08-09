import type { AnimateOptions, MotionMode } from './types';

import { NecromancerConfigError } from './errors';

/** Reports whether the requested motion preference reduces visible movement. */
export function shouldReduceMotion(mode: MotionMode): boolean {
  if (mode === 'full') return false;

  if (mode === 'reduced') return true;

  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Converts ownership options to native timing, collapsing reduced motion to an instant transition. */
export function resolveAnimationOptions(options: AnimateOptions = {}, reduced = false): KeyframeAnimationOptions {
  const { motion: _motion = 'system', signal: _signal, ...nativeOptions } = options;

  return reduced ? { ...nativeOptions, delay: 0, duration: 0, endDelay: 0, iterations: 1 } : nativeOptions;
}

/** Adds an element's stagger offset without changing native nonnumeric delays when no offset is needed. */
export function withStaggeredDelay(options: AnimateOptions, offset: number): AnimateOptions {
  if (offset === 0) return options;

  const delay = options.delay ?? 0;

  if (typeof delay !== 'number') {
    throw new NecromancerConfigError('animateEach() requires a numeric delay when stagger is non-zero.');
  }

  return { ...options, delay: delay + offset };
}
