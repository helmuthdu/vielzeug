import type { QueryState, QueryStatus } from './types';

export function makeState<T>(entry: {
  data: T | undefined;
  error: Error | null;
  status: QueryStatus;
  updatedAt: number;
}): QueryState<T> {
  const { data, error, status, updatedAt } = entry;

  return {
    data,
    error,
    isError: status === 'error',
    isIdle: status === 'idle',
    isPending: status === 'pending',
    isSuccess: status === 'success',
    status,
    updatedAt,
  };
}

export function dispatch<T>(observers: Set<(s: T) => void>, state: T): void {
  observers.forEach((fn) => {
    try {
      fn(state);
    } catch (err) {
      console.error('[fetchit] observer threw', err);
    }
  });
}
