import type { ReadonlySignal } from '../index.js';

/**
 * Minimal `shallowRef` signature — matches `shallowRef` from `vue`.
 * Typed locally so this adapter has no hard dependency on the `vue` package.
 */
export type ShallowRefFn = <T>(value: T) => { value: T };

/**
 * Minimal `onScopeDispose` signature — matches `onScopeDispose` from `vue`.
 * Must be called within an active Vue effect scope (inside `setup()` or a composable).
 */
export type OnScopeDisposeFn = (fn: () => void, failSilently?: boolean) => void;

/**
 * A Vue-compatible readonly ref — a plain object with a reactive `.value`.
 */
export type VueReadonlyRef<T> = { readonly value: T };

/**
 * Options accepted by {@link createAdapter}.
 */
export type VueAdapterOptions = {
  onScopeDispose: OnScopeDisposeFn;
  shallowRef: ShallowRefFn;
};

/**
 * Creates an `adapt` function pre-bound to Vue's `shallowRef` and `onScopeDispose`.
 *
 * Call once at app/plugin level (or at the top of a composable file) and import
 * the returned `adapt` wherever you need to bridge a stateit signal into Vue.
 *
 * The method name `adapt` is consistent across all `@vielzeug/stateit/*` adapters,
 * making it trivial to swap frameworks without learning a new API.
 *
 * @example
 * ```ts
 * // adapters.ts — create once, re-export everywhere
 * import { onScopeDispose, shallowRef } from 'vue';
 * import { createAdapter } from '@vielzeug/stateit/vue';
 *
 * export const { adapt } = createAdapter({ shallowRef, onScopeDispose });
 *
 * // In a component or composable:
 * import { adapt } from './adapters';
 * import { signal } from '@vielzeug/stateit';
 *
 * const count = signal(0);
 *
 * export function useCount() {
 *   const countRef = adapt(count); // reactive Vue shallowRef, auto-disposed
 *   return { countRef };
 * }
 * ```
 */
export const createAdapter = ({ shallowRef, onScopeDispose }: VueAdapterOptions) => ({
  /**
   * Wraps a stateit {@link ReadonlySignal} in a Vue `shallowRef` that stays in sync.
   * The Vue ref is readonly — write to the original signal to trigger updates.
   *
   * The underlying stateit subscription is automatically disposed when the enclosing
   * Vue effect scope is torn down (component unmount, `effectScope().stop()`, etc.).
   */
  adapt: <T>(source: ReadonlySignal<T>): VueReadonlyRef<T> => {
    const ref = shallowRef(source.value);
    const unsubscribe = source.subscribe(() => {
      ref.value = source.value;
    });

    onScopeDispose(unsubscribe, /* failSilently */ true);

    return Object.freeze(ref) as VueReadonlyRef<T>;
  },
});
