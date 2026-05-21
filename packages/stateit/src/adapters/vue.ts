export * from '../index.js';

import type { ReadonlySignal } from '../index.js';

/**
 * Minimal `shallowRef` signature — matches `shallowRef` from `vue`.
 * Typed locally so this adapter has no hard dependency on the `vue` package.
 */
export type ShallowRefFn = <T>(value: T) => { value: T };

/**
 * Minimal `onScopeDispose` signature — matches `onScopeDispose` from `vue`.
 * Must be called from within an active Vue effect scope (inside `setup()` or a composable).
 */
export type OnScopeDisposeFn = (fn: () => void, failSilently?: boolean) => void;

/** A Vue-compatible readonly ref — a plain object with a reactive `.value`. */
export type VueReadonlyRef<T> = { readonly value: T };

let _shallowRef: ShallowRefFn | undefined;
let _onScopeDispose: OnScopeDisposeFn | undefined;

/**
 * Registers Vue's `shallowRef` and `onScopeDispose` with this adapter.
 * Call once at your app or plugin entry point before any composable uses {@link useSignal}.
 *
 * @example
 * ```ts
 * // main.ts
 * import { onScopeDispose, shallowRef } from 'vue';
 * import { init } from '@vielzeug/stateit/vue';
 *
 * init({ shallowRef, onScopeDispose });
 * ```
 */
export const init = (options: { onScopeDispose: OnScopeDisposeFn; shallowRef: ShallowRefFn }): void => {
  _shallowRef = options.shallowRef;
  _onScopeDispose = options.onScopeDispose;
};

/**
 * Vue composable — wraps a stateit signal, computed, or store in a Vue `shallowRef`
 * that stays in sync with the source. The ref's `.value` is reactive in templates,
 * `computed()`, and `watch()`.
 *
 * The underlying stateit subscription is automatically disposed when the enclosing
 * Vue scope is torn down (component unmount, `effectScope().stop()`, etc.).
 *
 * Works with any {@link ReadonlySignal}: `signal()`, `computed()`, `store()`, `readonly()`.
 *
 * Requires {@link init} to be called once before use.
 *
 * @example
 * ```ts
 * // main.ts — once, at app entry
 * import { onScopeDispose, shallowRef } from 'vue';
 * import { init } from '@vielzeug/stateit/vue';
 * init({ shallowRef, onScopeDispose });
 *
 * // useCounter.ts
 * import { signal, computed, useSignal } from '@vielzeug/stateit/vue';
 *
 * const count = signal(0);
 * const doubled = computed(() => count.value * 2);
 *
 * export function useCounter() {
 *   const countRef   = useSignal(count);   // reactive shallowRef
 *   const doubledRef = useSignal(doubled); // reactive shallowRef
 *   return { countRef, doubledRef };
 * }
 * ```
 */
export const useSignal = <T>(source: ReadonlySignal<T>): VueReadonlyRef<T> => {
  if (!_shallowRef || !_onScopeDispose) {
    throw new Error(
      '[stateit/vue] Call init({ shallowRef, onScopeDispose }) once at your app entry before using useSignal().',
    );
  }

  const ref = _shallowRef(source.value);
  const unsubscribe = source.subscribe(() => {
    ref.value = source.value;
  });

  _onScopeDispose(unsubscribe, /* failSilently */ true);

  return Object.freeze(ref) as VueReadonlyRef<T>;
};
