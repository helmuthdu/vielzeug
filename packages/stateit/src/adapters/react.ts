export * from '../index.js';

import type { ReadonlySignal } from '../index.js';

/**
 * `useSyncExternalStore` signature — typed locally so this adapter has no hard
 * dependency on the `react` package.
 */
export type UseSyncExternalStoreFn = <T>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => T,
) => T;

let _useSyncExternalStore: UseSyncExternalStoreFn | undefined;

/**
 * Registers React's `useSyncExternalStore` with this adapter.
 * Call once at your app's entry point before any component uses {@link useSignal}.
 *
 * @example
 * ```ts
 * // main.tsx
 * import { useSyncExternalStore } from 'react';
 * import { init } from '@vielzeug/stateit/react';
 *
 * init(useSyncExternalStore);
 * ```
 */
export const init = (useSyncExternalStore: UseSyncExternalStoreFn): void => {
  _useSyncExternalStore = useSyncExternalStore;
};

/**
 * React hook — subscribes the current component to a stateit signal, computed, or store
 * and returns its current value. Re-renders whenever the value changes.
 *
 * Works with any {@link ReadonlySignal}: `signal()`, `computed()`, `store()`, `readonly()`.
 *
 * Requires {@link init} to be called once before use.
 *
 * @example
 * ```tsx
 * // main.tsx — once, at app entry
 * import { useSyncExternalStore } from 'react';
 * import { init } from '@vielzeug/stateit/react';
 * init(useSyncExternalStore);
 *
 * // Counter.tsx
 * import { signal, computed, useSignal } from '@vielzeug/stateit/react';
 *
 * const count = signal(0);
 * const doubled = computed(() => count.value * 2);
 *
 * function Counter() {
 *   const value = useSignal(count);    // re-renders when count changes
 *   const dbl   = useSignal(doubled);  // re-renders when doubled changes
 *   return <button onClick={() => count.value++}>{value} (×2 = {dbl})</button>;
 * }
 * ```
 */
export const useSignal = <T>(source: ReadonlySignal<T>): T => {
  if (!_useSyncExternalStore) {
    throw new Error('[stateit/react] Call init(useSyncExternalStore) once at your app entry before using useSignal().');
  }

  return _useSyncExternalStore(
    (onStoreChange) => {
      const sub = source.subscribe(onStoreChange);

      return () => sub();
    },
    () => source.value,
  );
};
