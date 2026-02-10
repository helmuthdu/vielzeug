/**
 * Creates a Promise that can be aborted using an AbortController.
 *
 * @example
 * ```ts
 * const slowFn = () => new Promise(resolve => setTimeout(() => resolve('slow'), 10000));
 * const fastFn = () => new Promise(resolve => setTimeout(() => resolve('fast'), 5000));
 *
 * predict(slowFn); // rejects after 7 seconds
 * predict(fastFn); // resolves with 'fast' after 5 seconds
 * ```
 *
 * @param fn - The function to execute, which receives an AbortSignal.
 * @param options - The options for the abortable function.
 * @param [options.signal] - The AbortSignal to use for aborting the Promise.
 * @param [options.timeout=7000] - The timeout in milliseconds after which the Promise will be aborted.
 *
 * @returns - A Promise that resolves with the result of the callback or rejects if aborted.
 */
export function predict<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: { signal?: AbortSignal; timeout?: number } = {},
): Promise<T> {
  const { signal, timeout = 7000 } = options;
  const abortSignal = signal ? AbortSignal.any([AbortSignal.timeout(timeout), signal]) : AbortSignal.timeout(timeout);

  return Promise.race([
    fn(abortSignal),
    new Promise<never>((_, reject) => {
      abortSignal.addEventListener('abort', () => reject(new Error('Operation aborted')), { once: true });
    }),
  ]);
}
