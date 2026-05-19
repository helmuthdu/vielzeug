import { createApi, type ApiClient } from './api';
import { createMutation, type Mutation, type MutationFn, type MutationOptions } from './mutation';
import { createQuery, type QueryClient, type QueryClientOptions } from './query';
import { createStream, type StreamClient } from './stream';
import { createTransportCore, type Interceptor, type TransportOptions } from './transport';

export type FetchitOptions = TransportOptions & {
  /** Default options merged into every `mutation()` call. */
  mutationDefaults?: MutationOptions;
  /** Options specific to the query cache (staleTime, gcTime, refetch policies, etc.). */
  query?: QueryClientOptions;
};

export interface Fetchit {
  /** HTTP request client — GET, POST, PUT, PATCH, DELETE, and generic `request()`. */
  api: ApiClient;
  /** Abort all in-flight requests and SSE connections. Does not dispose the client. */
  cancelAll(): void;
  /** Permanently dispose the client. All in-flight requests are aborted. */
  dispose(): void;
  /** `true` after `dispose()` is called. */
  readonly disposed: boolean;
  /** Update or delete global headers. Applies to both API requests and SSE streams. */
  headers(updates: Record<string, string | undefined>): void;
  /** Create a mutation instance with optional lifecycle callbacks. */
  mutation<TData, TVariables = void>(
    fn: MutationFn<TData, TVariables>,
    opts?: MutationOptions<TData>,
  ): Mutation<TData, TVariables>;
  /** Query / cache client. */
  query: QueryClient;
  /** SSE and ReadableStream client. */
  stream: StreamClient;
  /** Register a shared interceptor that applies to both API requests and SSE connections. */
  use(interceptor: Interceptor): () => void;
  [Symbol.dispose](): void;
}

/**
 * Create a unified Fetchit instance backed by a single shared transport.
 *
 * `baseUrl`, `headers`, `timeout`, and `fetch` are shared between the `api` and
 * `stream` sub-clients. Interceptors registered via `fetchit.use()` apply to all
 * HTTP requests — REST calls and SSE connections alike.
 *
 * @example
 * ```ts
 * const client = createFetchit({
 *   baseUrl: 'https://api.example.com',
 *   headers: { authorization: `Bearer ${token}` },
 * });
 *
 * // Interceptors apply to both api and stream
 * client.use(async (ctx, next) => {
 *   ctx.init.headers = { ...ctx.init.headers as Record<string,string>, 'x-request-id': crypto.randomUUID() };
 *   return next(ctx);
 * });
 *
 * const user = await client.api.get<User>('/users/{id}', { params: { id: 1 } });
 * const src = client.stream.sse('/events', { reconnect: true });
 * ```
 */
export function createFetchit(opts?: FetchitOptions): Fetchit {
  const { mutationDefaults, query: queryOpts, ...transportOpts } = opts ?? {};

  // Single shared transport — interceptors, headers, and cancellation are
  // unified across the api and stream sub-clients.
  const transport = createTransportCore({
    ...transportOpts,
    // Stream connections are long-lived; default timeout to Infinity so SSE
    // connections don't time out while the API client keeps its 30 s default.
    // Individual clients can still override per-request via config.timeout.
    timeout: transportOpts.timeout ?? Number.POSITIVE_INFINITY,
  });

  const api = createApi(undefined, transport);
  const stream = createStream(undefined, transport);
  const queryClient = createQuery(queryOpts);

  return {
    api,

    cancelAll(): void {
      transport.cancelAll();
    },

    dispose(): void {
      transport.dispose();
      queryClient.dispose();
    },

    get disposed() {
      return transport.disposed;
    },

    headers: transport.headers,

    mutation<TData, TVariables = void>(
      fn: MutationFn<TData, TVariables>,
      mutOpts?: MutationOptions<TData>,
    ): Mutation<TData, TVariables> {
      return createMutation(fn, { ...mutationDefaults, ...mutOpts } as MutationOptions<TData>);
    },

    query: queryClient,

    stream,

    [Symbol.dispose](): void {
      this.dispose();
    },

    use: transport.use,
  };
}
