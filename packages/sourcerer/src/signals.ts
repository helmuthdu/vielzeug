import type { ComputedSignal } from '@vielzeug/ripple';

import { computed, signal } from '@vielzeug/ripple';

import type { ReactiveSource } from './types';

/**
 * The object returned by `toSignals()`.
 * Provides ripple `Computed` signals for `current` and `meta`, plus a `dispose()` function.
 */
export type SourceSignals<T, TMeta> = {
  [Symbol.dispose](): void;
  readonly current: ComputedSignal<readonly T[]>;
  dispose(): void;
  readonly meta: ComputedSignal<TMeta>;
};

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
export function toSignals<T, TMeta>(source: ReactiveSource<T, TMeta>): SourceSignals<T, TMeta> {
  // Advance the global ripple revision clock so computed() evaluates immediately on first read.
  const tick = signal(0);

  tick.value++;

  const unsubscribe = source.subscribe(() => {
    tick.value++;
  });

  const currentSignal = computed(() => {
    void tick.value;

    return source.current;
  });

  const metaSignal = computed(() => {
    void tick.value;

    return source.meta;
  });

  const dispose = () => {
    unsubscribe();
    currentSignal.dispose();
    metaSignal.dispose();
    tick.dispose();
  };

  return {
    current: currentSignal,
    dispose,
    meta: metaSignal,
    [Symbol.dispose]: dispose,
  };
}
