import type { AnimateOptions } from './types';

/** Converts ownership options to native timing, collapsing reduced motion to an instant transition. */
export function resolveAnimationOptions(options: AnimateOptions = {}, reduced = false): KeyframeAnimationOptions {
  const { motion: _motion, signal: _signal, ...nativeOptions } = options;

  return reduced ? { ...nativeOptions, delay: 0, duration: 0, endDelay: 0, iterations: 1 } : nativeOptions;
}

/** Adds an element's stagger offset to a validated numeric delay. */
export function withStaggeredDelay(options: AnimateOptions, offset: number): AnimateOptions {
  if (offset === 0) return options;

  // animateEach() validates up front that a non-zero stagger carries a numeric
  // (or absent) delay, so a non-zero offset here can only ever meet a number.
  const delay = options.delay ?? 0;

  return { ...options, delay: (delay as number) + offset };
}
