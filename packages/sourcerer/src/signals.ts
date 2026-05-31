import { computed, signal } from '@vielzeug/ripple';

import type { ReactiveSource } from './types';

/**
 * Wraps any reactive source as a pair of ripple signals: `current` and `meta`.
 * The signals update whenever the source notifies its subscribers.
 *
 * @example
 * ```ts
 * const { current, meta } = toSignals(source);
 * const itemCount = computed(() => current.value.length);
 * effect(() => console.log('page:', meta.value.pageNumber));
 * ```
 */
export function toSignals<T, TMeta>(source: ReactiveSource<T, TMeta>) {
  // Advance the global ripple revision clock so computed() evaluates immediately on first read.
  const tick = signal(0);

  tick.value++;

  const dispose = source.subscribe(() => {
    tick.value++;
  });

  return {
    current: computed(() => {
      void tick.value;

      return source.current;
    }),
    dispose,
    meta: computed(() => {
      void tick.value;

      return source.meta;
    }),
  };
}
