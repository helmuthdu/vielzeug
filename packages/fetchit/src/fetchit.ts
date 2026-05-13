import { createApi, type ApiClientOptions, type ApiClient } from './api';
import { createMutation, type MutationOptions, type MutationFn, type Mutation } from './mutation';
import { createQuery, type QueryClientOptions, type QueryClient } from './query';

export type FetchitOptions = ApiClientOptions &
  QueryClientOptions & {
    mutationDefaults?: MutationOptions;
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
 * Create a unified Fetchit instance with shared defaults across API, query, and mutations.
 */
export function createFetchit(opts?: FetchitOptions): Fetchit {
  const { mutationDefaults, ...shared } = opts ?? {};

  return {
    api: createApi(shared),
    mutation: (fn, mutOpts) => createMutation(fn, { ...mutationDefaults, ...mutOpts }),
    query: createQuery(shared),
  };
}
