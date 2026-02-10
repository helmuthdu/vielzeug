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
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, reject, resolve };
}
