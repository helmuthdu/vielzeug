/**
 * Creates a deferred promise with resolve and reject methods exposed.
 * Useful for creating promises that are resolved/rejected externally.
 *
 * @example
 * ```ts
 * const deferred = defer<string>();
 *
 * setTimeout(() => {
 *   deferred.resolve('Done!');
 * }, 1000);
 *
 * const result = await deferred.promise; // 'Done!'
 * ```
 *
 * @returns Object with promise and resolve/reject methods
 */
export function defer<T = void>(): {
  promise: Promise<T>;
  reject: (reason?: unknown) => void;
  resolve: (value: T | PromiseLike<T>) => void;
} {
  const { promise, reject, resolve } = Promise.withResolvers<T>();

  return { promise, reject, resolve };
}
