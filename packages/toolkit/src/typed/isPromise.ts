/**
 * Determines if the passed value is a Promise (or any thenable).
 *
 * @example
 * ```ts
 * isPromise(new Promise((resolve) => resolve(1))); // true
 * isPromise(asyncFn()); // true  (calling it returns a Promise)
 * isPromise(async () => {}); // false (the function itself is not a Promise)
 * isPromise(() => {}); // false
 * ```
 *
 * @param arg - The argument to be checked.
 *
 * @returns `true` if the value is a thenable, else `false`.
 */
export function isPromise(arg: unknown): arg is Promise<unknown> {
  return typeof arg === 'object' && arg !== null && typeof (arg as { then?: unknown }).then === 'function';
}
