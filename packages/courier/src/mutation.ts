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
   * `error` is `null` for both success and abort; `data` is `undefined` for error and abort.
   */
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void | Promise<void>;
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
  let cachedStore: SyncStore<MutationState<TData>> | null = null;

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

  async function fireSettled(data: TData | undefined, error: Error | null, variables: TVariables): Promise<void> {
    await safeCall(() => mutOpts?.onSettled?.(data, error, variables));
  }

  return {
    async cancel(): Promise<void> {
      const run = activeRun;

      if (!run) return;

      run.controller.abort();
      await run.promise.catch(() => {});
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
            times: mutOpts?.times ?? 1,
          });

          if (run === currentRun) {
            snap = { data, error: null, isFetching: false, status: 'success', updatedAt: Date.now() };
            notify();
          }

          await safeCall(() => mutOpts?.onSuccess?.(data, variables));

          await fireSettled(data, null, variables);

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

          await fireSettled(undefined, isAborted ? null : error, variables);

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

    subscribe(listener: (state: MutationState<TData>) => void): Unsubscribe {
      const wrapped = () => listener(snap);

      observers.add(wrapped);

      return () => observers.delete(wrapped);
    },

    toStore(): SyncStore<MutationState<TData>> {
      if (cachedStore) return cachedStore;

      cachedStore = {
        // peek() always returns the live snap — no caching needed since snap is
        // updated synchronously before any observer is notified.
        peek() {
          return snap;
        },

        subscribe(onStoreChange) {
          // Add directly to observers (bypasses the immediate-call in mutation.subscribe).
          // React's useSyncExternalStore calls peek() for the initial snapshot, so
          // onStoreChange must only fire on subsequent state changes.
          const listener = () => {
            onStoreChange();
          };

          observers.add(listener);

          return () => observers.delete(listener);
        },
      };

      return cachedStore;
    },
  };
}

export interface Mutation<TData, TVariables = void> {
  cancel(): Promise<void>;
  getState(): MutationState<TData>;
  mutate(variables: TVariables, callOpts?: { signal?: AbortSignal }): Promise<TData>;
  reset(): void;
  subscribe(listener: (state: MutationState<TData>) => void): Unsubscribe;
  toStore(): SyncStore<MutationState<TData>>;
}
