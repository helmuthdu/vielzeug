import { createApi, type ApiClientOptions, type ApiClient } from './api';
import { createMutation, type MutationOptions, type MutationFn, type Mutation } from './mutation';
import { createQuery, type QueryClientOptions, type QueryClient } from './query';

export type FetchitOptions = {
  /** Options forwarded to `createApi`. */
  api?: ApiClientOptions;
  /** Default options merged into every `mutation()` call. */
  mutationDefaults?: MutationOptions;
  /** Options forwarded to `createQuery`. */
  query?: QueryClientOptions;
};

export interface Fetchit {
  api: ApiClient;
  query: QueryClient;
  mutation: <TData, TVariables = void>(
    fn: MutationFn<TData, TVariables>,
    opts?: MutationOptions<TData>,
  ) => Mutation<TData, TVariables>;
}

/**
 * Create a unified Fetchit instance. Each sub-client receives only its own options.
 * `mutationDefaults` are merged with per-call options (call-site opts take precedence).
 */
export function createFetchit(opts?: FetchitOptions): Fetchit {
  return {
    api: createApi(opts?.api),
    mutation: (fn, mutOpts) => createMutation(fn, { ...opts?.mutationDefaults, ...mutOpts }),
    query: createQuery(opts?.query),
  };
}
