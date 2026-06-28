import type { Computed, ResourceOptions, ResourceState } from './types';

import { effect } from './effect';
import { signal } from './signal';
import { IS_COMPUTED, IS_SIGNAL } from './symbols';

/**
 * Creates a reactive async resource that emits a `ResourceState<T>` discriminated union.
 *
 * Dependencies are tracked synchronously in the factory (before the first `await`).
 * The factory receives an `AbortSignal` that fires when dependencies change or
 * the resource is disposed, cancelling any in-flight work.
 *
 * @example
 * ```ts
 * const userId = signal('u1');
 * const user = resource(async (signal) => {
 *   const id = userId.value; // tracked dep — re-runs when userId changes
 *   return fetchUser(id, { signal });
 * });
 *
 * effect(() => {
 *   const s = user.value;
 *   if (s.status === 'loading') return showSpinner();
 *   if (s.status === 'error')   return showError(s.error);
 *   renderUser(s.data);
 * });
 *
 * user.dispose();
 * ```
 */
export const resource = <T>(
  factory: (abortSignal: AbortSignal) => Promise<T>,
  options?: ResourceOptions<T>,
): Computed<ResourceState<T>> => {
  const name = options?.name;
  const state = signal<ResourceState<T>>(
    { data: options?.initialValue, status: 'loading' },
    name ? { name } : undefined,
  );

  let controller: AbortController | null = null;
  let disposed = false;

  const stop = effect(
    () => {
      controller?.abort();
      controller = new AbortController();

      const { signal: abortSignal } = controller;

      const current = state.peek();
      const prevData = 'data' in current ? current.data : undefined;

      state.value = { data: prevData, status: 'loading' };

      void (async () => {
        try {
          const result = await factory(abortSignal);

          if (!abortSignal.aborted && !disposed) {
            state.value = { data: result, status: 'ready' };
          }
        } catch (err) {
          if (!abortSignal.aborted && !disposed) {
            state.value = { data: prevData, error: err, status: 'error' };
          }
        }
      })();
    },
    name ? { name } : undefined,
  );

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;
    controller?.abort();
    stop.dispose();
    state.dispose();
  };

  return {
    dispose,
    get disposed() {
      return disposed;
    },
    [IS_COMPUTED]: true as const,
    [IS_SIGNAL]: true as const,
    get name() {
      return state.name;
    },
    peek: () => state.peek(),
    subscribe: (listener: () => void) => state.subscribe(listener),
    [Symbol.dispose]: dispose,
    get value() {
      return state.value;
    },
  } as Computed<ResourceState<T>>;
};
