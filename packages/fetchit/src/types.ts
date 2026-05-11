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

export type MutationState<TData = unknown> =
  | { readonly data: undefined; readonly error: null; readonly status: 'idle'; readonly updatedAt: number }
  | { readonly data: undefined; readonly error: null; readonly status: 'pending'; readonly updatedAt: number }
  | { readonly data: undefined; readonly error: Error; readonly status: 'error'; readonly updatedAt: number }
  | { readonly data: TData; readonly error: null; readonly status: 'success'; readonly updatedAt: number };
