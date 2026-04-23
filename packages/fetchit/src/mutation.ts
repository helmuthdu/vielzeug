import { retry } from '@vielzeug/toolkit';

import type { RetryOptions } from './retry';
import type { MutationState, QueryStatus, Unsubscribe } from './types';

import { toError } from './errors';
import { getRetryConfig } from './retry';
import { dispatch, makeState } from './state';

export type MutationOptions = RetryOptions;

export type MutationFnContext<TVariables> = {
  input: TVariables;
  signal?: AbortSignal;
};

export function createMutation<TData, TVariables = void>(
  mutationFn: (ctx: MutationFnContext<TVariables>) => Promise<TData>,
  mutOpts?: MutationOptions,
) {
  let snap: { data: TData | undefined; error: Error | null; status: QueryStatus; updatedAt: number } = {
    data: undefined,
    error: null,
    status: 'idle',
    updatedAt: 0,
  };
  let currentRun = 0;
  const observers = new Set<(state: MutationState<TData>) => void>();

  function notify() {
    dispatch(observers, makeState(snap));
  }

  return {
    getState(): MutationState<TData> {
      return makeState(snap);
    },

    async mutate(variables: TVariables, callOpts?: { signal?: AbortSignal }): Promise<TData> {
      const retryOpts = getRetryConfig(mutOpts?.retry ?? 0, mutOpts?.retryDelay, mutOpts?.shouldRetry);
      const signal = callOpts?.signal;
      const run = ++currentRun;

      snap = { data: undefined, error: null, status: 'pending', updatedAt: 0 };
      notify();

      try {
        const data = await retry(() => mutationFn({ input: variables, signal }), { ...retryOpts, signal });

        if (run === currentRun) {
          snap = { data, error: null, status: 'success', updatedAt: Date.now() };
          notify();
        }

        return data;
      } catch (err) {
        const error = toError(err);
        const nextState =
          signal?.aborted || error.name === 'AbortError'
            ? { data: undefined, error: null, status: 'idle' as const, updatedAt: 0 }
            : { data: undefined, error, status: 'error' as const, updatedAt: Date.now() };

        if (run === currentRun) {
          snap = nextState;
          notify();
        }

        throw error;
      }
    },

    reset() {
      snap = { data: undefined, error: null, status: 'idle', updatedAt: 0 };
      notify();
    },

    subscribe(listener: (state: MutationState<TData>) => void): Unsubscribe {
      observers.add(listener);
      listener(makeState(snap));

      return () => observers.delete(listener);
    },
  };
}

export type Mutation<TData, TVariables = void> = ReturnType<typeof createMutation<TData, TVariables>>;
