/**
 * Middleware type for wrapping fetch functions.
 * Receives `(q, signal, next)` where `next` invokes the next layer in the chain.
 */
export type FetchMiddleware<TQuery = unknown, TResult = unknown> = (
  q: TQuery,
  signal: AbortSignal,
  next: (q: TQuery, signal: AbortSignal) => Promise<TResult>,
) => Promise<TResult>;

/**
 * Composes multiple `FetchMiddleware` wrappers around a core fetch function.
 *
 * Wrappers execute **left-to-right** (first argument = outermost):
 * the first middleware in the list runs before the second, and so on.
 * Each middleware calls `next(q, signal)` to invoke the next layer.
 *
 * @example
 * ```ts
 * const fetchWithMiddleware = composeFetch(
 *   baseApiFetch,
 *   loggingMiddleware,   // runs first (outermost)
 *   retryMiddleware,     // runs second
 * );
 * ```
 */
export function composeFetch<TQuery, TResult>(
  core: (q: TQuery, signal: AbortSignal) => Promise<TResult>,
  ...fns: ReadonlyArray<FetchMiddleware<TQuery, TResult>>
): (q: TQuery, signal: AbortSignal) => Promise<TResult> {
  return fns.reduceRight<(q: TQuery, signal: AbortSignal) => Promise<TResult>>(
    (next, mw) => (q, signal) => mw(q, signal, next),
    core,
  );
}
