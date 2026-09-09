/**
 * Returns the abort error for the given signal.
 *
 * If the signal has a `reason`, that is returned directly (preserving the
 * original error thrown by `AbortController.abort(reason)`).
 * Otherwise, returns a `DOMException` with `name === 'AbortError'`.
 *
 * @example
 * ```ts
 * const ac = new AbortController();
 * ac.abort();
 * throw abortError(ac.signal); // DOMException { name: 'AbortError' }
 *
 * const ac2 = new AbortController();
 * ac2.abort(new TypeError('custom'));
 * throw abortError(ac2.signal); // TypeError('custom')
 * ```
 *
 * @param signal - The aborted signal to extract the error from.
 * @param message - Fallback AbortError message when the signal has no reason.
 * @returns The abort reason, or a new `DOMException(message, 'AbortError')`.
 */
export function abortError(signal?: AbortSignal, message = 'Aborted'): unknown {
  return signal?.reason ?? new DOMException(message, 'AbortError');
}
