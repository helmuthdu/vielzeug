export type QueryKey = readonly unknown[];
export type Unsubscribe = () => void;

export type QueryStatus = 'idle' | 'pending' | 'success' | 'error';

export type AsyncState<T = unknown> = {
  readonly data: T | undefined;
  readonly error: Error | null;
  readonly status: QueryStatus;
  readonly updatedAt: number;
};

export type QueryState<T = unknown> = AsyncState<T>;
export type MutationState<TData = unknown> = AsyncState<TData>;
