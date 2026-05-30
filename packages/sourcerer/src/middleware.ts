/**
 * Generic fetch function type — matches the `fetch` signature used by all remote source configs.
 */
export type FetchFn<TQuery, TResult> = (query: TQuery, signal: AbortSignal) => Promise<TResult>;

/**
 * A middleware layer that intercepts fetch calls.
 * Receives the query, signal, and the next handler in the chain.
 * Must call `next(query, signal)` to continue the chain.
 */
export type FetchMiddleware<TQuery, TResult> = (
  query: TQuery,
  signal: AbortSignal,
  next: FetchFn<TQuery, TResult>,
) => Promise<TResult>;

/**
 * Composes a fetch function with one or more middleware layers.
 * Middleware executes left-to-right: the first receives the call first and delegates down.
 *
 * @example
 * ```ts
 * // Logging middleware
 * const withLogging: FetchMiddleware<{ page: number }, { items: User[]; total: number }> =
 *   async (query, signal, next) => {
 *     console.log('fetch', query);
 *     const result = await next(query, signal);
 *     console.log('fetched', result.total, 'items');
 *     return result;
 *   };
 *
 * // Auth header injection
 * const withAuth: FetchMiddleware<typeof query, typeof result> =
 *   async (query, signal, next) => {
 *     // Augment the signal or mutate headers via a wrapper if needed.
 *     return next(query, signal);
 *   };
 *
 * const source = createRemoteSource({
 *   fetch: composeFetch(baseApiFetch, withAuth, withLogging),
 * });
 * ```
 */
export function composeFetch<TQuery, TResult>(
  fetch: FetchFn<TQuery, TResult>,
  ...middlewares: FetchMiddleware<TQuery, TResult>[]
): FetchFn<TQuery, TResult> {
  // Build right-to-left so the leftmost middleware is the outermost wrapper.
  return middlewares.reduceRight<FetchFn<TQuery, TResult>>((next, mw) => (q, sig) => mw(q, sig, next), fetch);
}
