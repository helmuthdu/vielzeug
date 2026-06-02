import type { DerivedSource } from './types';

import { createSourceCore } from './core';

/**
 * Creates a reactive read-only projection derived from a parent source.
 *
 * The derived source mirrors the parent's `meta` and applies `transform` to `current`
 * whenever the parent changes. This is useful for client-side projections (e.g. additional
 * filtering, mapping, or sorting) over a remote source without re-fetching.
 *
 * Call `dispose()` to stop listening to the parent.
 *
 * @example
 * ```ts
 * const source = createRemoteSource<User>({ fetch: fetchUsers, limit: 20 });
 *
 * // Show only active users without re-fetching.
 * const activeUsers = deriveSource(source, (items) => items.filter((u) => u.active));
 *
 * activeUsers.subscribe(() => {
 *   console.log(activeUsers.current, activeUsers.meta.totalItems);
 * });
 * ```
 */
export function deriveSource<T, U, TMeta>(
  parent: {
    readonly current: readonly T[];
    readonly meta: TMeta;
    subscribe(listener: () => void): () => void;
  },
  transform: (items: readonly T[]) => readonly U[],
): DerivedSource<U, TMeta> {
  const core = createSourceCore();
  let cachedCurrent: readonly U[] = transform(parent.current);

  const unsubscribeParent = parent.subscribe(() => {
    cachedCurrent = transform(parent.current);
    core.notify();
  });

  return {
    get current() {
      return cachedCurrent;
    },

    dispose() {
      unsubscribeParent();
      core.dispose();
    },

    get meta() {
      return parent.meta;
    },

    subscribe(listener) {
      return core.subscribe(listener);
    },
  };
}
