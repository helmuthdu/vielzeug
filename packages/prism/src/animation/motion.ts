import type { TransitionConfig } from '../types';

export function resolveMotion(
  config?: TransitionConfig,
  defaultDuration = 300,
): Required<Pick<TransitionConfig, 'duration' | 'stagger'>> & TransitionConfig {
  const preference = config?.preference ?? 'system';
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration =
    preference === 'never' || (preference === 'system' && reduced) ? 0 : (config?.duration ?? defaultDuration);

  return { ...config, duration, stagger: Math.max(0, config?.stagger ?? 0) };
}
