export type QueryKeyAtom = string | number | boolean | null;
export type QueryKey = readonly [QueryKeyAtom, ...QueryKeyAtom[]];
export type Unsubscribe = () => void;

export type AsyncState<T> =
  | {
      readonly data: undefined;
      readonly error: null;
      readonly isFetching: boolean;
      readonly status: 'loading';
      readonly updatedAt: undefined;
    }
  | {
      readonly data: T;
      readonly error: null;
      readonly isFetching: boolean;
      readonly status: 'success';
      readonly updatedAt: number;
    }
  | {
      readonly data: T | undefined;
      readonly error: Error;
      readonly isFetching: false;
      readonly status: 'error';
      readonly updatedAt: number;
    };

export type QueryContext = {
  readonly key: QueryKey;
  readonly signal: AbortSignal;
};

export type QueryDefinition<T> = {
  fetch: (context: QueryContext) => Promise<T>;
  key: QueryKey;
  staleTime?: number;
};

export type QueryCache = {
  clear(): void;
  delete(key: QueryKey): void;
  fetch<T>(definition: QueryDefinition<T>, options?: { force?: boolean }): Promise<T>;
  get<T>(key: QueryKey): T | undefined;
  getSnapshot<T>(key: QueryKey): AsyncState<T> | null;
  /** Invalidate entries whose key starts with `prefix`. An empty prefix invalidates every entry.
   *  When `refetch` is true, invalidated entries with a registered definition are refetched in the background. */
  invalidate(prefix: readonly unknown[], options?: { refetch?: boolean }): void;
  keys(): QueryKey[];
  set<T>(key: QueryKey, data: T, options?: { updatedAt?: number }): void;
  subscribe(key: QueryKey, listener: () => void): Unsubscribe;
};

export type MutationContext = { readonly signal: AbortSignal };
export type MutationOptions<T> = {
  /** Cache key prefixes to invalidate (and refetch) after a successful write. Replaces manual
   *  `invalidate()` + `refetchStale()` calls in `onSuccess`. */
  invalidateKeys?: readonly (readonly unknown[])[];
  onSuccess?: (data: T, queries: QueryCache) => void | Promise<void>;
  request: (context: MutationContext) => Promise<T>;
  signal?: AbortSignal;
};
