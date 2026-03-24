export type QueryKey = readonly unknown[];
export type Unsubscribe = () => void;

export type QueryStatus = 'idle' | 'pending' | 'success' | 'error';

type StateBase<T, TPendingData> = {
  readonly isError: boolean;
  readonly isIdle: boolean;
  readonly isPending: boolean;
  readonly isSuccess: boolean;
} & (
  | { data: undefined; error: null; status: 'idle'; updatedAt: number }
  | { data: TPendingData; error: null; status: 'pending'; updatedAt: number }
  | { data: T; error: null; status: 'success'; updatedAt: number }
  | { data: T | undefined; error: Error; status: 'error'; updatedAt: number }
);

/** Full state snapshot for a query — pending may carry stale data. */
export type QueryState<T = unknown> = StateBase<T, T | undefined>;

/** Full state snapshot for a mutation — pending never carries data. */
export type MutationState<TData = unknown> = StateBase<TData, undefined>;

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
  } as unknown as QueryState<T>;
}

export function dispatch<T>(observers: Set<(s: T) => void>, state: T) {
  observers.forEach((fn) => {
    try {
      fn(state);
    } catch (err) {
      console.error('[fetchit] observer threw', err);
    }
  });
}
