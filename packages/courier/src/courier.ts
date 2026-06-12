import { createApi } from './api';
import { createMutation, type Mutation, type MutationFn, type MutationOptions } from './mutation';
import { createQuery, type QueryClientOptions } from './query';
import { createStream } from './stream';
import { createTransportCore, type TransportOptions } from './transport';

export type CourierOptions = TransportOptions & {
  /**
   * Default options merged into every `mutation()` call.
   * Only retry/callback-error options are meaningful here — lifecycle callbacks
   * (`onSuccess`, `onError`, `onSettled`) should be provided per-mutation since
   * they receive typed variables that differ per mutation.
   */
  mutationDefaults?: Pick<MutationOptions, 'delay' | 'onCallbackError' | 'shouldRetry' | 'times'>;
  /** Options specific to the query cache (staleTime, gcTime, refetch policies, etc.). */
  query?: QueryClientOptions;
};

/**
 * Create a unified Courier instance backed by a single shared transport.
 *
 * `baseUrl`, `headers`, `timeout`, and `fetch` are shared between the `api` and
 * `stream` sub-clients. Interceptors registered via `courier.use()` apply to all
 * HTTP requests — REST calls and SSE connections alike.
 *
 * @example
 * ```ts
 * const client = createCourier({
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
 * const user = await client.api.get<User>('/users/{id}', { params: { id: '1' } });
 * const src = client.stream.sse('/events', { reconnect: true });
 * ```
 */
export function createCourier(opts?: CourierOptions) {
  const { mutationDefaults, query: queryOpts, ...transportOpts } = opts ?? {};

  // Single shared transport — interceptors, headers, and cancellation are
  // unified across the api and stream sub-clients.
  // REST requests use DEFAULT_TIMEOUT (30s); SSE/readable streams default to
  // Infinity individually inside createStream, so the two concerns stay separate.
  const transport = createTransportCore(transportOpts);

  const api = createApi(undefined, transport);
  const stream = createStream(undefined, transport);
  const queryClient = createQuery(queryOpts);

  return {
    api,

    /** Abort all in-flight requests, SSE connections, and query cache fetches. Does not dispose the client. */
    cancelAll(): void {
      transport.cancelAll();
      queryClient.cancelAll();
    },

    /** Permanently dispose the client. All in-flight requests are aborted. */
    dispose(): void {
      transport.dispose();
      queryClient.dispose();
    },

    /** `true` after `dispose()` is called. */
    get disposed() {
      return transport.disposed;
    },

    /** Update or delete global headers. Applies to both API requests and SSE streams. */
    headers: transport.headers,

    /** Create a mutation instance with optional lifecycle callbacks. */
    mutation<TData, TVariables = void>(
      fn: MutationFn<TData, TVariables>,
      mutOpts?: MutationOptions<TData, TVariables>,
    ): Mutation<TData, TVariables> {
      return createMutation(fn, { ...mutationDefaults, ...mutOpts });
    },

    /** Query / cache client. */
    query: queryClient,

    /** SSE and ReadableStream client. */
    stream,

    [Symbol.dispose](): void {
      this.dispose();
    },

    /** Register a shared interceptor that applies to both API requests and SSE connections. */
    use: transport.use,
  };
}

export type Courier = ReturnType<typeof createCourier>;
