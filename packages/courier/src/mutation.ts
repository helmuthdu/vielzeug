import { isAbortError, retry } from '@vielzeug/arsenal';

import type { RetryOptions } from './retry';
import type { MutationState, SyncStore, Unsubscribe } from './types';

import { resolveRetryDelay } from './retry';
import { anySignal } from './transport';

const IDLE_STATE: MutationState<unknown> = {
  data: undefined,
  error: null,
  isFetching: false,
  status: 'idle',
  updatedAt: undefined,
};

function createPendingState<TData>(): MutationState<TData> {
  return {
    data: undefined,
    error: null,
    isFetching: true,
    status: 'pending',
    updatedAt: undefined,
  };
}

/**
 * Discriminated union result passed to `onSettled`.
 * Switch on `result.status` to handle each outcome exhaustively.
 */
export type SettledResult<TData, TVariables> =
  | { readonly data: TData; readonly status: 'success'; readonly variables: TVariables }
  | { readonly error: Error; readonly status: 'error'; readonly variables: TVariables }
  | { readonly status: 'aborted'; readonly variables: TVariables };

export type MutationOptions<TData = unknown, TVariables = void> = RetryOptions & {
  /**
   * Called when a lifecycle callback (`onSuccess`, `onError`, or `onSettled`) throws.
   * Does not affect the `mutate()` result or re-throw. Optional — for development/debugging.
   */
  onCallbackError?: (error: Error) => void;
  /**
   * Called after a failed run, before `mutate()` rejects.
   * Not called when the mutation was aborted (use `onSettled` if you need abort awareness).
   */
  onError?: (error: Error, variables: TVariables) => void | Promise<void>;
  /**
   * Called after every run regardless of outcome, including aborts.
   * Switch on `result.status` to handle `'success'`, `'error'`, or `'aborted'` exhaustively.
   */
  onSettled?: (result: SettledResult<TData, TVariables>) => void | Promise<void>;
  /** Called after a successful run, before `mutate()` resolves. */
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
};

export type MutationFn<TData, TVariables = void> = (input: TVariables, signal: AbortSignal) => Promise<TData>;

export function createMutation<TData, TVariables = void>(
  mutationFn: MutationFn<TData, TVariables>,
  mutOpts?: MutationOptions<TData, TVariables>,
): Mutation<TData, TVariables> {
  let snap: MutationState<TData> = IDLE_STATE as MutationState<TData>;
  let currentRun = 0;
  let activeRun: { controller: AbortController; promise: Promise<unknown> } | null = null;
  const observers = new Set<() => void>();
  let disposed = false;

  function notify() {
    observers.forEach((l) => l());
  }

  async function safeCall(fn: (() => void | Promise<void>) | undefined): Promise<void> {
    try {
      await fn?.();
    } catch (err) {
      if (mutOpts?.onCallbackError) {
        try {
          mutOpts.onCallbackError(err instanceof Error ? err : new Error(String(err)));
        } catch {
          // Silently ignore errors in error handler itself.
        }
      }
    }
  }

  async function fireSettled(result: SettledResult<TData, TVariables>): Promise<void> {
    await safeCall(() => mutOpts?.onSettled?.(result));
  }

  return {
    async cancel(): Promise<void> {
      const run = activeRun;

      if (!run) return;

      run.controller.abort();
      await run.promise.catch(() => {});
    },

    dispose(): void {
      if (disposed) return;

      disposed = true;
      activeRun?.controller.abort();
      activeRun = null;
      observers.clear();
    },

    get disposed(): boolean {
      return disposed;
    },

    getState(): MutationState<TData> {
      return snap;
    },

    /**
     * Execute the mutation with the given variables.
     *
     * Concurrent calls are allowed. State updates (`isFetching`, `data`, `error`) always
     * reflect the **latest** `mutate()` call. Lifecycle callbacks (`onSuccess`, `onError`,
     * `onSettled`) fire for **every** call independently — not just the last one.
     * Cancel earlier calls via `mutation.cancel()` if you need only-last-wins callback semantics.
     */
    async mutate(variables: TVariables, callOpts?: { signal?: AbortSignal }): Promise<TData> {
      const localController = new AbortController();

      // Both callOpts.signal and localController.signal are defined, so anySignal always returns AbortSignal (not undefined).
      const signal = callOpts?.signal ? anySignal(callOpts.signal, localController.signal)! : localController.signal;
      const run = ++currentRun;

      snap = createPendingState();
      notify();

      // Assign activeRun synchronously before the operation IIFE executes any
      // awaited code. Without this, a mutationFn that resolves synchronously
      // would hit the `finally` cleanup before `activeRun` was set, leaving a
      // stale reference that persists until the next mutate() call.
      const pendingRun = { controller: localController, promise: null as unknown as Promise<TData> };

      activeRun = pendingRun;

      const operation = (async () => {
        try {
          const data = await retry(() => mutationFn(variables, signal), {
            delay: (attempt) => resolveRetryDelay(attempt, mutOpts?.delay),
            shouldRetry: mutOpts?.shouldRetry,
            signal,
            times: mutOpts?.times ?? 1, // 1 = single attempt, no retries by default
          });

          if (run === currentRun) {
            snap = { data, error: null, isFetching: false, status: 'success', updatedAt: Date.now() };
            notify();
          }

          await safeCall(() => mutOpts?.onSuccess?.(data, variables));

          await fireSettled({ data, status: 'success', variables });

          return data;
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          const isAborted = signal.aborted || isAbortError(error);

          if (run === currentRun) {
            snap = isAborted
              ? (IDLE_STATE as MutationState<TData>)
              : { data: undefined, error, isFetching: false, status: 'error', updatedAt: Date.now() };
            notify();
          }

          if (!isAborted) {
            await safeCall(() => mutOpts?.onError?.(error, variables));
          }

          await fireSettled(isAborted ? { status: 'aborted', variables } : { error, status: 'error', variables });

          throw error;
        } finally {
          if (activeRun?.controller === localController) {
            activeRun = null;
          }
        }
      })();

      pendingRun.promise = operation;

      return operation;
    },

    reset() {
      snap = IDLE_STATE as MutationState<TData>;
      notify();
    },

    /**
     * A `SyncStore` view of the mutation state for framework integrations.
     *
     * - React: `useSyncExternalStore(mutation.store.subscribe, mutation.store.peek)`
     * - Svelte: `readable(mutation.store.peek(), mutation.store.subscribe)`
     */
    store: {
      peek(): MutationState<TData> {
        return snap;
      },

      subscribe(onStoreChange: () => void): Unsubscribe {
        observers.add(onStoreChange);

        return () => observers.delete(onStoreChange);
      },
    } satisfies SyncStore<MutationState<TData>>,

    [Symbol.dispose](): void {
      this.dispose();
    },
  };
}

export interface Mutation<TData, TVariables = void> {
  [Symbol.dispose](): void;
  cancel(): Promise<void>;
  dispose(): void;
  get disposed(): boolean;
  getState(): MutationState<TData>;
  mutate(variables: TVariables, callOpts?: { signal?: AbortSignal }): Promise<TData>;
  reset(): void;
  /** `SyncStore` adapter for framework integrations (`useSyncExternalStore`, Svelte `readable`, etc.). */
  store: SyncStore<MutationState<TData>>;
}
