import { retry } from '@vielzeug/toolkit';

import type { RetryOptions } from './retry';
import type { MutationState, QueryStatus, Unsubscribe } from './types';

import { getRetryConfig } from './retry';

export type MutationOptions = RetryOptions;

export type MutationFn<TData, TVariables = void> = (input: TVariables, signal: AbortSignal) => Promise<TData>;

export function createMutation<TData, TVariables = void>(
  mutationFn: MutationFn<TData, TVariables>,
  mutOpts?: MutationOptions,
) {
  let snap: { data: TData | undefined; error: Error | null; status: QueryStatus; updatedAt: number } = {
    data: undefined,
    error: null,
    status: 'idle',
    updatedAt: 0,
  };
  let currentRun = 0;
  let activeController: AbortController | null = null;
  const observers = new Set<(state: MutationState<TData>) => void>();

  function toState(): MutationState<TData> {
    return {
      data: snap.data,
      error: snap.error,
      status: snap.status,
      updatedAt: snap.updatedAt,
    };
  }

  function notify() {
    const state = toState();

    observers.forEach((listener) => listener(state));
  }

  return {
    cancel() {
      activeController?.abort();
    },

    getState(): MutationState<TData> {
      return toState();
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
      listener(toState());

      return () => observers.delete(listener);
    },
  };
}

export type Mutation<TData, TVariables = void> = ReturnType<typeof createMutation<TData, TVariables>>;
