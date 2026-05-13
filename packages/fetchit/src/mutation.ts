import type { RetryOptions } from './retry';
import type { MutationState, Unsubscribe } from './types';

import { runWithRetry } from './retry';

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
  let snap: MutationState<TData> = { data: undefined, error: null, status: 'idle', updatedAt: undefined };
  let currentRun = 0;
  let activeRun: { controller: AbortController; promise: Promise<unknown> } | null = null;
  const observers = new Set<(state: MutationState<TData>) => void>();

  function notify() {
    observers.forEach((l) => l(snap));
  }

  async function fireSettled(data: TData | undefined, error: Error | null): Promise<void> {
    try {
      await mutOpts?.onSettled?.(data, error);
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

      snap = { data: undefined, error: null, status: 'pending', updatedAt: undefined };
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
            snap = { data, error: null, status: 'success', updatedAt: Date.now() };
            notify();
          }

          try {
            await mutOpts?.onSuccess?.(data);
          } catch (err) {
            if (mutOpts?.onCallbackError) {
              try {
                mutOpts.onCallbackError(toError(err));
              } catch {
                // Silently ignore errors in error handler itself.
              }
            }
          }

          await fireSettled(data, null);

          return data;
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          const isAborted = signal.aborted || error.name === 'AbortError';

          if (run === currentRun) {
            snap = isAborted
              ? { data: undefined, error: null, status: 'idle', updatedAt: undefined }
              : { data: undefined, error, status: 'error', updatedAt: Date.now() };
            notify();
          }

          if (!isAborted) {
            try {
              await mutOpts?.onError?.(error);
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
      snap = { data: undefined, error: null, status: 'idle', updatedAt: undefined };
      notify();
    },

    subscribe(listener: (state: MutationState<TData>) => void): Unsubscribe {
      observers.add(listener);
      listener(snap);

      return () => observers.delete(listener);
    },
  };
}

export interface Mutation<TData, TVariables = void> {
  cancel(): Promise<void>;
  getState(): MutationState<TData>;
  mutate(variables: TVariables, callOpts?: { signal?: AbortSignal }): Promise<TData>;
  reset(): void;
  subscribe(listener: (state: MutationState<TData>) => void): Unsubscribe;
}
