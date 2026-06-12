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
 * Call `dispose()` to unsubscribe from all parent sources.
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

  return {
    get current() {
      return cachedCurrent;
    },

    dispose() {
      for (const unsub of unsubscribeFns) {
        unsub();
      }

      core.dispose();
    },

    subscribe(listener) {
      return core.subscribe(listener);
    },

    [Symbol.dispose]() {
      this.dispose();
    },
  };
}
