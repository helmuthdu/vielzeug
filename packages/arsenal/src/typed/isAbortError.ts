/**
 * Returns `true` if the given value is an `AbortError` — i.e. an `Error` whose
 * `name` is `'AbortError'`, as thrown by `AbortController` / `AbortSignal`.
 *
 * @example
 * ```ts
 * try {
 *   await fetch(url, { signal });
 * } catch (err) {
 *   if (isAbortError(err)) return; // request was cancelled — ignore
 *   throw err;
 * }
 * ```
 *
 * @param value - The value to test.
 * @returns `true` when `value` is an `Error` with `name === 'AbortError'`.
 */
export function isAbortError(value: unknown): value is Error {
  return value instanceof Error && value.name === 'AbortError';
}
