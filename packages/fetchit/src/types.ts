export type QueryKey = readonly unknown[];
export type Unsubscribe = () => void;

export type QueryStatus = 'idle' | 'pending' | 'success' | 'error';

export type QueryState<T = unknown> = {
  readonly data: T | undefined;
  readonly error: Error | null;
  readonly status: QueryStatus;
  readonly updatedAt: number;
};

export type MutationState<TData = unknown> = QueryState<TData>;
