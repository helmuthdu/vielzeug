import type { Resource, ResourceOptions, ResourceState } from './types';

import { effect } from './effect';
import { signal } from './signal';
import { IS_COMPUTED, IS_SIGNAL } from './symbols';
import { autoRegisterDisposal } from './tracking';

/**
 * Creates a reactive async resource that emits a `ResourceState<T>` discriminated union.
 *
 * Dependencies are tracked synchronously in the factory (before the first `await`).
 * The factory receives an `AbortSignal` that fires when dependencies change or
 * the resource is disposed, cancelling any in-flight work.
 *
 * If `resource()` is created inside an active `effect()` or `scope.run()` context,
 * it is automatically registered for cleanup and disposed with that context —
 * matching `computed()`'s auto-disposal behavior.
 *
 * Call `refresh()` to force the factory to re-run immediately, even if no tracked
 * dependency changed — useful for manual "retry"/"refetch" actions.
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
 * user.refresh(); // force a re-fetch without changing userId
 * user.dispose();
 * ```
 */
export const resource = <T>(
  factory: (abortSignal: AbortSignal) => Promise<T>,
  options?: ResourceOptions<T>,
): Resource<T> => {
  const name = options?.name;
  const state = signal<ResourceState<T>>(
    { data: options?.initialValue, status: 'loading' },
    name ? { name } : undefined,
  );
  // Internal-only trigger — never exposed. Read (but never written to a meaningful
  // value) inside the effect purely so it becomes a tracked dep; refresh() bumps it
  // to force a re-run without requiring a real dependency to change.
  const epoch = signal(0);

  let controller: AbortController | null = null;
  let disposed = false;

  const stop = effect(
    () => {
      void epoch.value;

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

  const refresh = (): void => {
    if (disposed) return;

    epoch.value = epoch.peek() + 1;
  };

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;
    controller?.abort();
    stop.dispose();
    state.dispose();
    epoch.dispose();
  };

  autoRegisterDisposal(dispose);

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
    refresh,
    subscribe: (listener: () => void) => state.subscribe(listener),
    [Symbol.dispose]: dispose,
    get value() {
      return state.value;
    },
  } as Resource<T>;
};
