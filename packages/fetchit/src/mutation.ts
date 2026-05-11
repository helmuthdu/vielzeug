import { retry } from '@vielzeug/toolkit';

import type { RetryOptions } from './retry';
import type { MutationState, Unsubscribe } from './types';

import { getRetryConfig } from './retry';

export type MutationOptions<TData = unknown> = RetryOptions & {
  /** Called after a failed run, before `mutate()` rejects. */
  onError?: (error: Error) => void | Promise<void>;
  /** Called after every run regardless of outcome. */
  onSettled?: (data: TData | undefined, error: Error | null) => void | Promise<void>;
  /** Called after a successful run, before `mutate()` resolves. */
  onSuccess?: (data: TData) => void | Promise<void>;
};

export type MutationFn<TData, TVariables = void> = (input: TVariables, signal: AbortSignal) => Promise<TData>;

export function createMutation<TData, TVariables = void>(
  mutationFn: MutationFn<TData, TVariables>,
  mutOpts?: MutationOptions<TData>,
) {
  let snap: MutationState<TData> = { data: undefined, error: null, status: 'idle', updatedAt: 0 };
  let currentRun = 0;
  let activeController: AbortController | null = null;
  const observers = new Set<(state: MutationState<TData>) => void>();

  function notify() {
    observers.forEach((l) => l(snap));
  }

  return {
    cancel() {
      activeController?.abort();
    },

    getState(): MutationState<TData> {
      return snap;
    },

    async mutate(variables: TVariables, callOpts?: { signal?: AbortSignal }): Promise<TData> {
      const retryOpts = getRetryConfig(mutOpts?.retry ?? 0, mutOpts?.retryDelay, mutOpts?.shouldRetry);
      const localController = new AbortController();

      activeController = localController;

      const signal = callOpts?.signal
        ? AbortSignal.any([callOpts.signal, localController.signal])
        : localController.signal;
      const run = ++currentRun;

      snap = { data: undefined, error: null, status: 'pending', updatedAt: 0 };
      notify();

      try {
        const data = await retry(() => mutationFn(variables, signal), { ...retryOpts, signal });

        if (run === currentRun) {
          snap = { data, error: null, status: 'success', updatedAt: Date.now() };
          notify();
        }

        // Fire lifecycle callbacks — sync throws and async rejections are both swallowed.
        await Promise.all([
          Promise.resolve()
            .then(() => mutOpts?.onSuccess?.(data))
            .catch(() => {}),
          Promise.resolve()
            .then(() => mutOpts?.onSettled?.(data, null))
            .catch(() => {}),
        ]);

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const nextState =
          signal.aborted || error.name === 'AbortError'
            ? { data: undefined, error: null, status: 'idle' as const, updatedAt: 0 }
            : { data: undefined, error, status: 'error' as const, updatedAt: Date.now() };

        if (run === currentRun) {
          snap = nextState;
          notify();
        }

        if (nextState.status === 'error') {
          await Promise.all([
            Promise.resolve()
              .then(() => mutOpts?.onError?.(error))
              .catch(() => {}),
            Promise.resolve()
              .then(() => mutOpts?.onSettled?.(undefined, error))
              .catch(() => {}),
          ]);
        }

        throw error;
      } finally {
        if (activeController === localController) {
          activeController = null;
        }
      }
    },

    reset() {
      snap = { data: undefined, error: null, status: 'idle', updatedAt: 0 };
      notify();
    },

    subscribe(listener: (state: MutationState<TData>) => void): Unsubscribe {
      observers.add(listener);
      listener(snap);

      return () => observers.delete(listener);
    },
  };
}

export type Mutation<TData, TVariables = void> = ReturnType<typeof createMutation<TData, TVariables>>;
