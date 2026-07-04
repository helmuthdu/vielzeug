import { isAbortError, retry } from '@vielzeug/arsenal';

import type { RetryOptions } from './retry';
import type { MutationState, SyncStore, Unsubscribe } from './types';

import { CourierDisposedError } from './errors';
import { resolveRetryDelay } from './retry';
import { anySignal } from './transport';

const IDLE_STATE: MutationState<unknown> = Object.freeze({
  data: undefined,
  error: null,
  isFetching: false,
  isLoading: false,
  status: 'loading',
  updatedAt: undefined,
});

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
   * Called when a lifecycle callback (`onSuccess`, `onError`, `onSettled`, or `onFinally`) throws.
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
   * Use for cleanup patterns that do not need to inspect the result.
   * Runs after `onSuccess` / `onError` and before `onSettled`.
   */
  onFinally?: (variables: TVariables) => void | Promise<void>;
  /**
   * Called after every run regardless of outcome, including aborts.
   * Switch on `result.status` to handle `'success'`, `'error'`, or `'aborted'` exhaustively.
   */
  onSettled?: (result: SettledResult<TData, TVariables>) => void | Promise<void>;
  /** Called after a successful run, before `mutate()` resolves. */
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
};

export type MutationFn<TData, TVariables = void> = (input: TVariables, signal: AbortSignal) => Promise<TData>;

/**
 * Wraps an async function (typically a write operation — create/update/delete) with
 * loading/success/error state tracking, retries, cancellation, and lifecycle callbacks.
 *
 * @example
 * ```ts
 * const createUser = createMutation(
 *   (input: NewUser, signal) => api.post<User>('/users', { body: input, signal }),
 *   { onSuccess: (user) => console.log('created', user.id) },
 * );
 *
 * const unsub = createUser.subscribe(() => console.log(createUser.peek()));
 * const user = await createUser.mutate({ name: 'Ada' });
 *
 * // later:
 * createUser.dispose();
 * ```
 */
export function createMutation<TData, TVariables = void>(
  mutationFn: MutationFn<TData, TVariables>,
  mutOpts?: MutationOptions<TData, TVariables>,
): Mutation<TData, TVariables> {
  let snap: MutationState<TData> = IDLE_STATE as MutationState<TData>;
  let currentRun = 0;
  let activeRun: { controller: AbortController; promise: Promise<unknown> } | null = null;
  const observers = new Set<() => void>();
  let disposed = false;
  let cachedStore: SyncStore<MutationState<TData>> | null = null;

  function notifyObservers(): void {
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

    /**
     * Execute the mutation with the given variables.
     *
     * Concurrent calls are allowed. State updates (`isFetching`, `data`, `error`) always
     * reflect the **latest** `mutate()` call. Lifecycle callbacks (`onSuccess`, `onError`,
     * `onSettled`) fire for **every** call independently — not just the last one.
     * Cancel earlier calls via `mutation.cancel()` if you need only-last-wins callback semantics.
     *
     * @throws {CourierDisposedError} If called after `dispose()`.
     */
    async mutate(variables: TVariables, callOpts?: { signal?: AbortSignal }): Promise<TData> {
      if (disposed) throw new CourierDisposedError('Mutation');

      const localController = new AbortController();

      const signal = callOpts?.signal ? anySignal(callOpts.signal, localController.signal)! : localController.signal;
      const run = ++currentRun;

      snap = {
        data: undefined,
        error: null,
        isFetching: true,
        isLoading: true,
        status: 'loading',
        updatedAt: undefined,
      };
      notifyObservers();

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
            snap = { data, error: null, isFetching: false, isLoading: false, status: 'success', updatedAt: Date.now() };
            notifyObservers();
          }

          await safeCall(() => mutOpts?.onSuccess?.(data, variables));
          await safeCall(() => mutOpts?.onFinally?.(variables));
          await safeCall(() => mutOpts?.onSettled?.({ data, status: 'success', variables }));

          return data;
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          const isAborted = signal.aborted || isAbortError(error);

          if (run === currentRun) {
            snap = isAborted
              ? (IDLE_STATE as MutationState<TData>)
              : { data: undefined, error, isFetching: false, isLoading: false, status: 'error', updatedAt: Date.now() };
            notifyObservers();
          }

          if (!isAborted) {
            await safeCall(() => mutOpts?.onError?.(error, variables));
          }

          await safeCall(() => mutOpts?.onFinally?.(variables));
          await safeCall(() =>
            mutOpts?.onSettled?.(isAborted ? { status: 'aborted', variables } : { error, status: 'error', variables }),
          );

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

    /**
     * Read the current mutation state snapshot.
     * For framework integrations prefer `peek()` + `subscribe()` directly.
     */
    peek(): MutationState<TData> {
      return snap;
    },

    reset(): void {
      snap = IDLE_STATE as MutationState<TData>;
      notifyObservers();
    },

    /**
     * A `SyncStore` view of the mutation state — identical to `{ peek, subscribe }` on this object.
     * Provided for framework integrations that accept a `SyncStore` directly:
     * - React: `useSyncExternalStore(mutation.subscribe, mutation.peek)`
     * - Svelte: `readable(mutation.peek(), mutation.subscribe)`
     */
    get store(): SyncStore<MutationState<TData>> {
      return (cachedStore ??= {
        peek: () => snap,
        subscribe: (cb) => {
          observers.add(cb);

          return () => observers.delete(cb);
        },
      });
    },

    subscribe(onStoreChange: () => void): Unsubscribe {
      observers.add(onStoreChange);

      return () => observers.delete(onStoreChange);
    },

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
  mutate(variables: TVariables, callOpts?: { signal?: AbortSignal }): Promise<TData>;
  peek(): MutationState<TData>;
  reset(): void;
  /**
   * `SyncStore` adapter — equivalent to `{ peek, subscribe }` on this object.
   * For React: `useSyncExternalStore(mutation.subscribe, mutation.peek)`
   */
  get store(): SyncStore<MutationState<TData>>;
  subscribe(onStoreChange: () => void): Unsubscribe;
}
