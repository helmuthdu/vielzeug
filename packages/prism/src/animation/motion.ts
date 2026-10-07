import type { TransitionConfig, TransitionOption } from '../types';

/** Duration (ms) every chart uses when motion is enabled without an explicit `duration`. */
export const DEFAULT_DURATION = 300;

/**
 * Resolves a user-facing `transition` option into concrete motion values.
 *
 * - `false` disables motion entirely: renderers apply their final state synchronously.
 * - `true` (or omitted) enables motion with the chart's `defaultDuration`/`defaultStagger`.
 * - `preference: 'system'` (the default) disables motion when the user prefers reduced motion.
 */
export function resolveMotion(
  config?: TransitionOption,
  defaults?: { defaultDuration?: number; defaultStagger?: number },
): TransitionConfig & { duration: number; stagger: number } {
  if (config === false) return { duration: 0, stagger: 0 };

  const options = config === true ? undefined : config;
  const preference = options?.preference ?? 'system';
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration =
    preference === 'never' || (preference === 'system' && reduced)
      ? 0
      : (options?.duration ?? defaults?.defaultDuration ?? DEFAULT_DURATION);

  return { ...options, duration, stagger: Math.max(0, options?.stagger ?? defaults?.defaultStagger ?? 0) };
}
