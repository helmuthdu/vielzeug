/**
 * A single segment in a query key — JSON-safe primitives or a plain object of primitives.
 * No `Date`, `bigint`, `Map`, `Set`, or nested arrays — these are not reliably serialisable.
 */
export type QueryKeyAtom =
  string | number | boolean | null | { readonly [k: string]: string | number | boolean | null };

/**
 * Identifies a cached query. Must be a non-empty flat array of `QueryKeyAtom` values.
 *
 * @example
 * ```ts
 * ['users', userId]
 * ['users', userId, 'posts', { page: 1, limit: 10 }]
 * ```
 */
export type QueryKey = readonly [QueryKeyAtom, ...QueryKeyAtom[]];

export type Unsubscribe = () => void;

/**
 * Minimal external-store contract for framework integrations.
 *
 * - React: useSyncExternalStore(store.subscribe, store.peek)
 * - Vue: assign `store.peek()` into a shallowRef inside `store.subscribe`
 * - Svelte: adapt to `readable` by forwarding `subscribe`
 */
export interface SyncStore<T> {
  peek(): T;
  subscribe(onStoreChange: () => void): Unsubscribe;
}

/**
 * Lifecycle status for an async operation.
 *
 * - `'loading'` — no data yet; a fetch may or may not be in-flight.
 * - `'success'` — data is available; `isFetching` may be `true` during background revalidation.
 * - `'error'` — the last operation failed; stale `data` from a prior success may still be present.
 */
export type AsyncStatus = 'loading' | 'success' | 'error';

export type AsyncState<T = unknown> = {
  /**
   * `true` while a fetch is in-flight (including background revalidation).
   * Orthogonal to `status` — a `'success'` entry can have `isFetching: true`.
   */
  readonly isFetching: boolean;
  /** Shorthand for `status === 'loading'`. Useful as a loading-spinner predicate. */
  readonly isLoading: boolean;
} & (
  | {
      readonly data: undefined;
      readonly error: null;
      readonly status: 'loading';
      readonly updatedAt: undefined;
    }
  | {
      readonly data: T;
      readonly error: null;
      readonly status: 'success';
      readonly updatedAt: number;
    }
  | {
      readonly data: T | undefined;
      readonly error: Error;
      readonly status: 'error';
      /** Timestamp (ms since epoch) of when the error was committed. May coexist with stale `data` from a prior successful fetch. */
      readonly updatedAt: number;
    }
);

export type QueryState<T = unknown> = AsyncState<T>;
export type MutationState<TData = unknown> = AsyncState<TData>;
