/**
 * Run `fn`; if it throws synchronously, route the error to `onError` instead of letting
 * it escape uncaught. Used by operators to guard user-supplied callbacks (`map`'s `fn`,
 * `filter`'s `predicate`, etc.) so a throw becomes a normal `observer.error()` call
 * instead of an unhandled exception.
 * @internal
 */
export function guard(fn: () => void, onError?: (err: unknown) => void): void {
  try {
    fn();
  } catch (err) {
    onError?.(err);
  }
}
