import { createApi, type ApiClient, type ApiClientOptions } from './api';
import { createMutation, type Mutation, type MutationFn, type MutationOptions } from './mutation';
import { createQuery, type QueryClient, type QueryClientOptions } from './query';
import { createStream, type StreamClient, type StreamClientOptions } from './stream';

export type FetchitOptions = {
  /** Options forwarded to `createApi`. */
  api?: ApiClientOptions;
  /** Default options merged into every `mutation()` call. */
  mutationDefaults?: MutationOptions;
  /** Options forwarded to `createQuery`. */
  query?: QueryClientOptions;
  /** Options forwarded to `createStream`. */
  stream?: StreamClientOptions;
};

export interface Fetchit {
  api: ApiClient;
  mutation: <TData, TVariables = void>(
    fn: MutationFn<TData, TVariables>,
    opts?: MutationOptions<TData>,
  ) => Mutation<TData, TVariables>;
  query: QueryClient;
  stream: StreamClient;
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
    stream: createStream(opts?.stream),
  };
}
