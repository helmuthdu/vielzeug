import type { MergedSource } from './types';

import { createSourceCore } from './core';

/**
 * Combines multiple reactive sources into a single read-only view by applying
 * a user-supplied `combine` function over all sources' `current` arrays.
 *
 * The merged source recalculates whenever any parent source changes. Useful for
 * offline/online hybrid UIs (local + remote merged), multi-dataset views, or
 * pagination across multiple backends.
 *
 * Call `dispose()` to unsubscribe from all parent sources. If every parent exposes a
 * `disposalSignal` (the standard `ReactiveSource` shape does), the merge auto-disposes once
 * every parent has disposed — mirroring `deriveSource()`'s single-parent auto-dispose, scaled
 * to N parents. If any parent lacks `disposalSignal` (a minimal duck-typed source), auto-dispose
 * doesn't activate — call `dispose()` yourself.
 *
 * @example
 * ```ts
 * const local = createLocalSource(localCache, { limit: 50 });
 * const remote = createRemoteSource({ fetch: fetchUsers, limit: 50 });
 *
 * // Show local cache items first, then remote items (deduped by id).
 * const merged = mergeSource([local, remote], (all) => {
 *   const seen = new Set<number>();
 *   return all.flat().filter((u) => !seen.has(u.id) && seen.add(u.id));
 * });
 *
 * merged.subscribe(() => console.log(merged.current));
 * ```
 */
export function mergeSource<T>(
  sources: ReadonlyArray<{
    readonly current: readonly T[];
    readonly disposalSignal?: AbortSignal;
    subscribe(listener: () => void): () => void;
  }>,
  combine: (allItems: ReadonlyArray<readonly T[]>) => readonly T[],
): MergedSource<T> {
  const core = createSourceCore();
  let cachedCurrent: readonly T[] = combine(sources.map((s) => s.current));

  const unsubscribeFns = sources.map((source) =>
    source.subscribe(() => {
      cachedCurrent = combine(sources.map((s) => s.current));
      core.notify();
    }),
  );

  const source: MergedSource<T> = {
    get current() {
      return cachedCurrent;
    },

    get disposalSignal() {
      return core.disposalSignal;
    },

    dispose() {
      if (core.isDisposed) return;

      for (const unsub of unsubscribeFns) {
        unsub();
      }

      core.dispose();
    },

    get disposed() {
      return core.isDisposed;
    },

    subscribe(listener) {
      return core.subscribe(listener);
    },

    [Symbol.dispose]() {
      source.dispose();
    },
  };

  // Mirrors deriveSource()'s parent-lifetime tracking, scaled to N parents: once every
  // parent has disposed there's nothing left this merge could ever reflect, so it disposes
  // itself too instead of staying alive holding now-permanently-stale combined state.
  // Only tracked when every source actually exposes a disposalSignal — mergeSource() also
  // accepts minimal duck-typed sources (per its parameter type) that may not have one.
  // Routed through `source.dispose()` above, not `core.dispose()` directly, so there's exactly
  // one cleanup path (including unsubscribing from parents) regardless of what triggered it.
  const disposalSignals = sources
    .map((s) => s.disposalSignal)
    .filter((s): s is AbortSignal => s instanceof AbortSignal);

  if (disposalSignals.length === sources.length && disposalSignals.length > 0) {
    let pendingCount = disposalSignals.filter((s) => !s.aborted).length;

    if (pendingCount === 0) {
      // Every parent was already disposed before mergeSource() was even called.
      source.dispose();
    } else {
      for (const signal of disposalSignals) {
        if (signal.aborted) continue;

        signal.addEventListener(
          'abort',
          () => {
            pendingCount--;

            if (pendingCount === 0) source.dispose();
          },
          { once: true },
        );
      }
    }
  }

  return source;
}
