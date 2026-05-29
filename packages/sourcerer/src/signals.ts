import type { ComputedSignal, Signal } from '@vielzeug/ripple';

import { computed, signal } from '@vielzeug/ripple';

import type { BaseSource, CursorMeta, CursorSource, InfiniteMeta, InfiniteSource, SourceMeta } from './types';

// Shared implementation: creates a tick signal, two computed signals derived from callbacks,
// and a single dispose that releases all three reactive resources plus the source subscription.
function makeSignals<TItems, TMeta>(
  source: { subscribe(listener: () => void): () => void },
  getItems: () => TItems,
  getMeta: () => TMeta,
): { dispose: () => void; items: ComputedSignal<TItems>; meta: ComputedSignal<TMeta>; tick: Signal<number> } {
  const tick = signal(0);

  const items = computed(() => {
    void tick.value; // read to establish reactive dependency

    return getItems();
  });

  const metaSig = computed(() => {
    void tick.value; // read to establish reactive dependency

    return getMeta();
  });

  const unsubscribe = source.subscribe(() => {
    tick.value += 1;
  });

  return {
    dispose: () => {
      unsubscribe();
      items.dispose();
      metaSig.dispose();
      tick.dispose();
    },
    items,
    meta: metaSig,
    tick,
  };
}

/**
 * Adapts a page-based source into reactive ripple signals.
 * Returns `current` and `meta` as computed signals that automatically update
 * whenever the source notifies subscribers.
 *
 * @example
 * ```ts
 * const source = createLocalSource(data, { limit: 10 });
 * const { current, meta } = toSignals(source);
 *
 * effect(() => {
 *   console.log('Page:', meta.value.pageNumber);
 *   console.log('Items:', current.value);
 * });
 *
 * source.goTo(2); // triggers effects automatically
 * ```
 *
 * @returns An object with `current` and `meta` as read-only computed signals, and a `dispose` function.
 */
export function toSignals<T>(source: BaseSource<T>): {
  current: ComputedSignal<readonly T[]>;
  dispose: () => void;
  meta: ComputedSignal<SourceMeta>;
} {
  const {
    dispose,
    items: current,
    meta,
  } = makeSignals(
    source,
    () => source.current,
    () => source.meta,
  );

  return { current, dispose, meta };
}

/**
 * Adapts a cursor-based source into reactive ripple signals.
 *
 * @example
 * ```ts
 * const source = createCursorSource({ fetch: ... });
 * const { current, meta } = toCursorSignals(source);
 *
 * effect(() => console.log(current.value, meta.value.hasNextPage));
 * ```
 */
export function toCursorSignals<T>(source: CursorSource<T>): {
  current: ComputedSignal<readonly T[]>;
  dispose: () => void;
  meta: ComputedSignal<CursorMeta>;
} {
  const {
    dispose,
    items: current,
    meta,
  } = makeSignals(
    source,
    () => source.current,
    () => source.meta,
  );

  return { current, dispose, meta };
}

/**
 * Adapts an infinite (append) source into reactive ripple signals.
 *
 * @example
 * ```ts
 * const source = createInfiniteSource({ fetch: ... });
 * const { all, meta } = toInfiniteSignals(source);
 *
 * effect(() => console.log(all.value.length, meta.value.hasMore));
 * ```
 */
export function toInfiniteSignals<T>(source: InfiniteSource<T>): {
  all: ComputedSignal<readonly T[]>;
  dispose: () => void;
  meta: ComputedSignal<InfiniteMeta>;
} {
  const {
    dispose,
    items: all,
    meta,
  } = makeSignals(
    source,
    () => source.all,
    () => source.meta,
  );

  return { all, dispose, meta };
}
