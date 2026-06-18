import type { AsyncComputedOptions, AsyncComputedSignal } from './types';

import { effect } from './effect';
import { signal } from './signal';
import { untrack } from './tracking';

/**
 * Creates a reactive async computed with three projected signals:
 * - `data`      — the latest fulfilled value (`T | undefined`)
 * - `error`     — the last thrown error (`unknown | undefined`)
 * - `isLoading` — `true` while a run is in-flight (starts `true` on first frame)
 *
 * Dependencies are tracked synchronously in the factory (before the first `await`).
 * The factory receives an `AbortSignal` that is aborted when the factory is
 * superseded by a newer run or when the asyncComputed is disposed.
 *
 * @example
 * ```ts
 * const userId = signal('u1');
 * const user = asyncComputed(async (abortSignal) => {
 *   const id = userId.value; // tracked dep — re-runs when userId changes
 *   return fetchUser(id, { signal: abortSignal });
 * });
 *
 * effect(() => {
 *   if (user.isLoading.value) return showSpinner();
 *   if (user.error.value)     return showError(user.error.value);
 *   renderUser(user.data.value);
 * });
 *
 * user.dispose();
 * ```
 */
export const asyncComputed = <T>(
  factory: (abortSignal: AbortSignal) => Promise<T>,
  options?: AsyncComputedOptions<T>,
): AsyncComputedSignal<T> => {
  const name = options?.name;
  const data = signal<T | undefined>(options?.initialValue, name ? { name: `${name}.data` } : undefined);
  const error = signal<unknown | undefined>(undefined, name ? { name: `${name}.error` } : undefined);
  const isLoading = signal<boolean>(true, name ? { name: `${name}.isLoading` } : undefined);

  let controller: AbortController | null = null;
  let disposed = false;

  const stop = effect(
    () => {
      controller?.abort();
      controller = new AbortController();

      const { signal: abortSignal } = controller;

      untrack(() => {
        error.value = undefined;
        isLoading.value = true;
      });

      void (async () => {
        try {
          const result = await factory(abortSignal);

          if (!abortSignal.aborted && !disposed) {
            data.value = result;
            error.value = undefined;
            isLoading.value = false;
          }
        } catch (err) {
          if (!abortSignal.aborted && !disposed) {
            error.value = err;
            isLoading.value = false;
          }
        }
      })();
    },
    name ? { name } : undefined,
  );

  const dispose = (): void => {
    disposed = true;
    controller?.abort();
    stop.dispose();
    data.dispose();
    error.dispose();
    isLoading.dispose();
  };

  return {
    data,
    dispose,
    get disposed() {
      return disposed;
    },
    error,
    isLoading,
    [Symbol.dispose]: dispose,
  } as AsyncComputedSignal<T>;
};
