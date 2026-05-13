export type StableValue =
  | undefined
  | null
  | boolean
  | number
  | string
  | bigint
  | Date
  | RegExp
  | readonly StableValue[]
  | ReadonlySet<StableValue>
  | ReadonlyMap<StableValue, StableValue>
  | { readonly [key: string]: StableValue };

export type QueryKey = readonly StableValue[];
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

export type AsyncStatus = 'idle' | 'pending' | 'success' | 'error';

export type AsyncState<T = unknown> =
  | {
      readonly data: undefined;
      readonly error: null;
      readonly isFetching: false;
      readonly status: 'idle';
      readonly updatedAt: undefined;
    }
  | {
      readonly data: T | undefined;
      readonly error: null;
      readonly isFetching: true;
      readonly status: 'pending';
      readonly updatedAt: number | undefined;
    }
  | {
      readonly data: T;
      readonly error: null;
      readonly isFetching: boolean;
      readonly status: 'success';
      readonly updatedAt: number;
    }
  | {
      readonly data: T | undefined;
      readonly error: Error;
      readonly isFetching: boolean;
      readonly status: 'error';
      readonly updatedAt: number;
    };

export type QueryStatus = AsyncStatus;
export type MutationStatus = AsyncStatus;

export type QueryState<T = unknown> = AsyncState<T>;
export type MutationState<TData = unknown> = AsyncState<TData>;
