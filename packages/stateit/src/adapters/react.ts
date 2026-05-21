import type { ReadonlySignal } from '../index.js';

/**
 * React external store shape — consumed by `useSyncExternalStore`.
 */
export type ReactExternalStore<T> = {
  getSnapshot(): T;
  subscribe(onStoreChange: () => void): () => void;
};

/**
 * `useSyncExternalStore` signature — typed locally so this adapter has no hard
 * dependency on the `react` package.
 */
export type UseSyncExternalStore = <T>(subscribe: (onStoreChange: () => void) => () => void, getSnapshot: () => T) => T;

/**
 * Adapts any stateit {@link ReadonlySignal} to React's external store protocol.
 * Pass the returned object to `useSyncExternalStore`.
 *
 * Create the store object **outside** your component (or memoize it) so that the
 * `subscribe` reference is stable across renders — `useSyncExternalStore` will
 * resubscribe whenever `subscribe` changes identity.
 *
 * The method name `adapt` is consistent across all `@vielzeug/stateit/*` adapters,
 * making it trivial to swap frameworks without learning a new API.
 *
 * @example
 * ```tsx
 * import { useSyncExternalStore } from 'react';
 * import { adapt } from '@vielzeug/stateit/react';
 * import { signal } from '@vielzeug/stateit';
 *
 * const count = signal(0);
 * const countStore = adapt(count); // stable — created at module level
 *
 * function Counter() {
 *   const value = useSyncExternalStore(countStore.subscribe, countStore.getSnapshot);
 *   return <button onClick={() => count.value++}>{value}</button>;
 * }
 * ```
 */
export const adapt = <T>(source: ReadonlySignal<T>): ReactExternalStore<T> => ({
  getSnapshot: () => source.value,
  subscribe: (onStoreChange) => {
    const sub = source.subscribe(onStoreChange);

    return () => sub();
  },
});

/**
 * Creates a `useSignal` hook bound to React's `useSyncExternalStore`.
 * Call once at module level with React's hook, then use the result inside components.
 *
 * @example
 * ```tsx
 * import { useSyncExternalStore } from 'react';
 * import { createUseSignal } from '@vielzeug/stateit/react';
 *
 * const useSignal = createUseSignal(useSyncExternalStore);
 *
 * const count = signal(0);
 *
 * function Counter() {
 *   const value = useSignal(count);
 *   return <button onClick={() => count.value++}>{value}</button>;
 * }
 * ```
 */
export const createUseSignal =
  (useSyncExternalStore: UseSyncExternalStore) =>
  <T>(source: ReadonlySignal<T>): T => {
    const store = adapt(source);

    return useSyncExternalStore(store.subscribe, store.getSnapshot);
  };
