import { listenMediaQuery, resolveWindow } from './_platform.ts';
import { createSentinel } from './core.ts';
import { SentinelUnavailableError } from './errors.ts';
import type { MediaQueryState, Sentinel, WindowSentinelOptions } from './types.ts';

export function createMediaQuery(query: string, options?: WindowSentinelOptions): Sentinel<MediaQueryState> {
  const target = resolveWindow(options?.target);
  if (typeof target.matchMedia !== 'function') {
    throw new SentinelUnavailableError(`matchMedia is not available for query "${query}".`);
  }

  const mediaQuery = target.matchMedia(query);
  const read = (): MediaQueryState => ({ matches: mediaQuery.matches });

  return createSentinel(
    {
      initialValue: read(),
      ...options,
    },
    (update) => listenMediaQuery(mediaQuery, () => update(read())),
  );
}
