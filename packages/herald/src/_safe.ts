/**
 * Result of a {@link callSafely} invocation. Discriminated on `threw` so a caller can tell
 * "didn't throw" apart from "threw `undefined`" — inspecting `err` alone can't make that call.
 *
 * @internal
 */
export type SafeCallResult = { err: unknown; threw: true } | { threw: false };

/**
 * Calls `fn()`, guarding against a throw.
 *
 * - If `fn()` throws and `onError` is provided, forwards the error to `onError` and reports
 *   `{ threw: false }` — the caller treats this call as handled.
 * - If `fn()` throws and no `onError` is provided, the error is **not** rethrown here — it is
 *   returned as `{ threw: true, err }` so the caller can decide when (or whether) to rethrow,
 *   e.g. after finishing a batch of independent calls.
 *
 * @internal
 */
export function callSafely(fn: () => void, onError?: (err: unknown) => void): SafeCallResult {
  try {
    fn();

    return { threw: false };
  } catch (err) {
    if (onError) {
      onError(err);

      return { threw: false };
    }

    return { err, threw: true };
  }
}
