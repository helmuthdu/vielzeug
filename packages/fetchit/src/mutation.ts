import type { RetryOptions } from './retry';
import type { MutationState, SyncStore, Unsubscribe } from './types';

import { runWithRetry, toError } from './retry';

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

export type MutationOptions<TData = unknown> = RetryOptions & {
  /** Called when a lifecycle callback throws. Does not affect mutate() result. Optional for development/debugging. */
  onCallbackError?: (error: Error) => void;
  /** Called after a failed run, before `mutate()` rejects. */
  onError?: (error: Error) => void | Promise<void>;
  /** Called after every run regardless of outcome. */
  onSettled?: (data: TData | undefined, error: Error | null) => void | Promise<void>;
  /** Called after a successful run, before `mutate()` resolves. */
  onSuccess?: (data: TData) => void | Promise<void>;
};

export type MutationFn<TData, TVariables = void> = (input: TVariables, signal: AbortSignal) => Promise<TData>;

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

export function createMutation<TData, TVariables = void>(
  mutationFn: MutationFn<TData, TVariables>,
  mutOpts?: MutationOptions<TData>,
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
          mutOpts.onCallbackError(toError(err));
        } catch {
          // Silently ignore errors in error handler itself.
        }
      }
    }
  }

  async function fireSettled(data: TData | undefined, error: Error | null): Promise<void> {
    await safeCall(() => mutOpts?.onSettled?.(data, error));
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

    async mutate(variables: TVariables, callOpts?: { signal?: AbortSignal }): Promise<TData> {
      const localController = new AbortController();

      const signal = callOpts?.signal
        ? AbortSignal.any([callOpts.signal, localController.signal])
        : localController.signal;
      const run = ++currentRun;

      snap = createPendingState();
      notify();

      const operation = (async () => {
        try {
          const data = await runWithRetry(
            () => mutationFn(variables, signal),
            mutOpts?.attempts ?? 1,
            mutOpts?.retryDelay,
            mutOpts?.shouldRetry,
            signal,
          );

          if (run === currentRun) {
            snap = { data, error: null, isFetching: false, status: 'success', updatedAt: Date.now() };
            notify();
          }

          await safeCall(() => mutOpts?.onSuccess?.(data));

          await fireSettled(data, null);

          return data;
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          const isAborted = signal.aborted || error.name === 'AbortError';

          if (run === currentRun) {
            snap = isAborted
              ? (IDLE_STATE as MutationState<TData>)
              : { data: undefined, error, isFetching: false, status: 'error', updatedAt: Date.now() };
            notify();
          }

          if (!isAborted) {
            await safeCall(() => mutOpts?.onError?.(error));
          }

          await fireSettled(undefined, isAborted ? null : error);

          throw error;
        } finally {
          if (activeRun?.controller === localController) {
            activeRun = null;
          }
        }
      })();

      activeRun = { controller: localController, promise: operation };

      return operation;
    },

    reset() {
      snap = IDLE_STATE as MutationState<TData>;
      notify();
    },

    subscribe(listener: (state: MutationState<TData>) => void): Unsubscribe {
      const wrapped = () => listener(snap);

      observers.add(wrapped);
      listener(snap);

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
