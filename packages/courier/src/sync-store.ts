import type { SyncStore, Unsubscribe } from './types';

/**
 * Converts any object with `peek()` and `subscribe()` methods into a plain
 * `SyncStore<T>` suitable for framework integration adapters.
 *
 * @example
 * ```ts
 * // React
 * const store = toSyncStore(mutation);
 * const state = useSyncExternalStore(store.subscribe, store.peek);
 *
 * // Svelte
 * const readable = toSyncStore(mutation);
 * ```
 */
export function toSyncStore<T>(source: { peek(): T; subscribe(cb: () => void): Unsubscribe }): SyncStore<T> {
  return {
    peek: () => source.peek(),
    subscribe: (cb) => source.subscribe(cb),
  };
}
