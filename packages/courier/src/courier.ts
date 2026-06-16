import type { QueryKey } from './types';

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
 *   return next(ctx.withHeaders({ 'x-request-id': crypto.randomUUID() }));
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

  const api = createApi({ transport });
  const stream = createStream({ transport });
  const queryClient = createQuery(queryOpts);

  return {
    api,

    /** Abort all in-flight requests, SSE connections, and query cache fetches. Does not dispose the client. */
    cancelAll(): void {
      transport.cancelAll();
      queryClient.cancelAll();
    },

    /** `AbortSignal` aborted when the client is disposed. Use to tie other lifecycles to this client. */
    get disposalSignal() {
      return transport.disposalSignal;
    },

    /** Permanently dispose the client. All in-flight requests are aborted. Idempotent. */
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

    /**
     * Create a mutation instance with optional lifecycle callbacks.
     *
     * The `invalidates` and `sets` shorthands automatically update the shared query
     * cache on success, eliminating boilerplate in the `onSuccess` callback.
     *
     * @example
     * ```ts
     * const createUser = client.mutation(
     *   (input: NewUser, signal) => client.api.post<User>('/users', { body: input, signal }),
     *   {
     *     invalidates: [['users']],
     *     sets: (user) => [['users', user.id], user],
     *   },
     * );
     * ```
     */
    mutation<TData, TVariables = void>(
      fn: MutationFn<TData, TVariables>,
      mutOpts?: MutationOptions<TData, TVariables> & {
        /** Query keys to invalidate on success. Runs before `onSuccess`. */
        invalidates?: QueryKey[];
        /**
         * Imperatively seed the cache on success. Return `[key, data]` pairs.
         * Runs before `onSuccess`.
         */
        sets?: (data: TData, variables: TVariables) => [QueryKey, unknown] | Array<[QueryKey, unknown]>;
      },
    ): Mutation<TData, TVariables> {
      const { invalidates, sets, ...rest } = mutOpts ?? {};

      const wrappedOnSuccess = async (data: TData, variables: TVariables): Promise<void> => {
        if (sets) {
          const result = sets(data, variables);
          const pairs: Array<[QueryKey, unknown]> = Array.isArray(result[0])
            ? (result as Array<[QueryKey, unknown]>)
            : [result as [QueryKey, unknown]];

          for (const [key, val] of pairs) queryClient.set(key, val);
        }

        if (invalidates) {
          for (const key of invalidates) queryClient.invalidate(key);
        }

        await rest.onSuccess?.(data, variables);
      };

      return createMutation(fn, { ...mutationDefaults, ...rest, onSuccess: wrappedOnSuccess });
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
