import type { AsyncComputedOptions, AsyncComputedSignal, AsyncComputedState } from './types';

import { computed } from './computed';
import { effect } from './effect';
import { signal } from './signal';
import { untrack } from './tracking';

/**
 * Creates a reactive signal that runs an async factory whenever its tracked
 * dependencies change, exposing the lifecycle as an `AsyncComputedState<T>`.
 *
 * Dependencies are tracked synchronously in the factory (before the first `await`).
 * The factory receives an `AbortSignal` that is aborted when the factory is
 * superseded by a newer run or when the asyncComputed is disposed.
 *
 * @example
 * ```ts
 * const userId = signal('u1');
 * const user = asyncComputed(async (signal) => {
 *   const id = userId.value; // tracked dep — re-runs when userId changes
 *   return fetchUser(id, { signal });
 * });
 *
 * effect(() => {
 *   const { status, value } = user.value;
 *   if (status === 'fulfilled') renderUser(value);
 *   if (status === 'error') showError(user.value.error);
 * });
 *
 * user.dispose();
 * ```
 */
export const asyncComputed = <T>(
  factory: (abortSignal: AbortSignal) => Promise<T>,
  options?: AsyncComputedOptions<T>,
): AsyncComputedSignal<T> => {
  const initialState: AsyncComputedState<T> =
    options?.initialValue !== undefined
      ? { error: undefined, status: 'pending', value: options.initialValue }
      : { error: undefined, status: 'idle', value: undefined };

  const state = signal<AsyncComputedState<T>>(initialState);
  let controller: AbortController | null = null;
  let disposed = false;

  const stop = effect(() => {
    // Abort any previous run
    controller?.abort();
    controller = new AbortController();

    const { signal: abortSignal } = controller;

    // Set to pending — reads of state must be untracked to avoid the effect
    // depending on the signal it writes to (infinite loop).
    untrack(() => {
      state.value = {
        error: undefined,
        status: 'pending',
        value: state.peek().status === 'idle' ? options?.initialValue : state.peek().value,
      };
    });

    // Run the factory. Dependencies accessed synchronously inside factory
    // (before first await) are tracked by this effect.
    void (async () => {
      try {
        const result = await factory(abortSignal);

        if (!abortSignal.aborted && !disposed) {
          state.value = { error: undefined, status: 'fulfilled', value: result };
        }
      } catch (err) {
        if (!abortSignal.aborted && !disposed) {
          state.value = {
            error: err,
            status: 'error',
            value: state.value.status === 'pending' ? state.value.value : undefined,
          };
        }
      }
    })();
  });

  // Expose a ComputedSignal<AsyncComputedState<T>> view over the internal signal.
  const view = computed(() => state.value, options);
  const disposeView = view.dispose.bind(view);

  const dispose = (): void => {
    disposed = true;
    controller?.abort();
    stop.dispose();
    disposeView();
    state.dispose();
  };

  return Object.assign(view, { dispose, [Symbol.dispose]: dispose }) as unknown as AsyncComputedSignal<T>;
};
