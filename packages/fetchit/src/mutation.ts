import { retry } from '@vielzeug/toolkit';

import type { RetryOptions } from './retry';
import type { MutationState, QueryStatus, Unsubscribe } from './types';

import { toError } from './errors';
import { getRetryConfig } from './retry';
import { dispatch, makeState } from './state';

export type MutationOptions<TData = unknown, TVariables = unknown> = RetryOptions & {
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
  onSuccess?: (data: TData, variables: TVariables) => void;
};

export function createMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  mutOpts?: MutationOptions<TData, TVariables>,
) {
  let snap: { data: TData | undefined; error: Error | null; status: QueryStatus; updatedAt: number } = {
    data: undefined,
    error: null,
    status: 'idle',
    updatedAt: 0,
  };
  let currentAc: AbortController | null = null;
  const observers = new Set<(state: MutationState<TData>) => void>();

  function notify() {
    dispatch(observers, makeState(snap));
  }

  return {
    cancel() {
      if (snap.status !== 'pending') return;

      currentAc?.abort();
      currentAc = null;
      snap = { data: undefined, error: null, status: 'idle', updatedAt: 0 };
      notify();
    },

    getState(): MutationState<TData> {
      return makeState(snap);
    },

    async mutate(variables: TVariables, callOpts?: RetryOptions & { signal?: AbortSignal }): Promise<TData> {
      if (snap.status === 'pending') {
        throw new Error('[fetchit] mutation already in flight — await the previous call or call cancel() first');
      }

      const retryOpts = getRetryConfig(
        callOpts?.retry ?? mutOpts?.retry ?? 0,
        callOpts?.retryDelay ?? mutOpts?.retryDelay,
        callOpts?.shouldRetry ?? mutOpts?.shouldRetry,
      );

      currentAc = new AbortController();

      const signal = callOpts?.signal ? AbortSignal.any([currentAc.signal, callOpts.signal]) : currentAc.signal;

      snap = { data: undefined, error: null, status: 'pending', updatedAt: 0 };
      notify();

      try {
        const data = await retry(() => mutationFn(variables), { ...retryOpts, signal });

        currentAc = null;
        snap = { data, error: null, status: 'success', updatedAt: Date.now() };
        notify();
        mutOpts?.onSuccess?.(data, variables);
        mutOpts?.onSettled?.(data, null, variables);

        return data;
      } catch (err) {
        currentAc = null;

        const error = toError(err);
        const isAborted = error.name === 'AbortError';

        // cancel() already transitioned state to 'idle' and notified — don't override it
        if (isAborted && snap.status === 'idle') throw error;

        if (isAborted) {
          snap = { data: undefined, error: null, status: 'idle', updatedAt: 0 };
        } else {
          snap = { data: undefined, error, status: 'error', updatedAt: Date.now() };
          mutOpts?.onError?.(error, variables);
          mutOpts?.onSettled?.(undefined, error, variables);
        }

        notify();
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
