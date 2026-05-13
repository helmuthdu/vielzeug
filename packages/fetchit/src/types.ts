export type StableValue =
  | undefined
  | null
  | boolean
  | number
  | string
  | bigint
  | Date
  | RegExp
  | readonly StableValue[]
  | ReadonlySet<StableValue>
  | ReadonlyMap<StableValue, StableValue>
  | { readonly [key: string]: StableValue };

export type QueryKey = readonly StableValue[];
export type Unsubscribe = () => void;

export type QueryStatus = 'idle' | 'pending' | 'success' | 'error';

export type QueryState<T = unknown> =
  | {
      readonly data: undefined;
      readonly error: null;
      readonly isFetching: false;
      readonly status: 'idle';
      readonly updatedAt: undefined;
    }
  | {
      readonly data: T | undefined;
      readonly error: null;
      readonly isFetching: true;
      readonly status: 'pending';
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
      readonly isFetching: boolean;
      readonly status: 'error';
      readonly updatedAt: number;
    };

export type MutationState<TData = unknown> =
  | { readonly data: undefined; readonly error: null; readonly status: 'idle'; readonly updatedAt: undefined }
  | { readonly data: undefined; readonly error: null; readonly status: 'pending'; readonly updatedAt: undefined }
  | { readonly data: undefined; readonly error: Error; readonly status: 'error'; readonly updatedAt: number }
  | { readonly data: TData; readonly error: null; readonly status: 'success'; readonly updatedAt: number };
