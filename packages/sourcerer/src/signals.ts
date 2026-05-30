import type { ComputedSignal, Signal } from '@vielzeug/ripple';

import { computed, signal } from '@vielzeug/ripple';

/**
 * Adapts any reactive source (local, remote, cursor, or infinite) into ripple computed signals.
 *
 * All source types expose `current`, `meta`, and `subscribe`, so a single generic adapter
 * handles all four. Call `dispose()` when the source is no longer needed.
 *
 * @example
 * ```ts
 * const source = createLocalSource(data, { limit: 10 });
 * const { current, meta, dispose } = toSignals(source);
 *
 * effect(() => {
 *   console.log('Page:', meta.value.pageNumber);
 *   console.log('Items:', current.value);
 * });
 *
 * source.goTo(2); // triggers effects automatically
 * dispose();      // release reactive resources when done
 * ```
 */
export function toSignals<T, TMeta>(source: {
  readonly current: readonly T[];
  readonly meta: TMeta;
  subscribe(listener: () => void): () => void;
}): { current: ComputedSignal<readonly T[]>; dispose: () => void; meta: ComputedSignal<TMeta> } {
  const tick: Signal<number> = signal(0);

  // Write the initial value to advance ripple's global revision counter.
  // Without this, computed() skips evaluation on the first .value read when
  // the global revision clock is at 0 (no prior signal writes in this context).
  tick.value = 1;

  const current = computed(() => {
    void tick.value; // establish reactive dependency

    return source.current;
  });

  const meta = computed(() => {
    void tick.value; // establish reactive dependency

    return source.meta;
  });

  const unsubscribe = source.subscribe(() => {
    tick.value ^= 1;
  });

  return {
    current,
    dispose: () => {
      unsubscribe();
      current.dispose();
      meta.dispose();
      tick.dispose();
    },
    meta,
  };
}
