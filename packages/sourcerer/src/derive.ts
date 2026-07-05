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
  let cachedCurrent: readonly U[] = [];

  const applyTransform = () => {
    cachedCurrent = transform(parent.current);
  };

  applyTransform();

  const unsubscribeParent = parent.subscribe(() => {
    applyTransform();
    core.notify();
  });

  if ('disposalSignal' in parent && parent.disposalSignal instanceof AbortSignal) {
    parent.disposalSignal.addEventListener('abort', () => core.dispose(), { once: true });
  }

  const source: DerivedSource<U, TMeta> = {
    get current() {
      return cachedCurrent;
    },

    get disposalSignal() {
      return core.disposalSignal;
    },

    dispose() {
      if (core.isDisposed) return;

      unsubscribeParent();
      core.dispose();
    },

    get disposed() {
      return core.isDisposed;
    },

    get meta() {
      return parent.meta;
    },

    subscribe(listener) {
      return core.subscribe(listener);
    },

    [Symbol.dispose]() {
      source.dispose();
    },
  };

  return source;
}
