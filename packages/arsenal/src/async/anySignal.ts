/**
 * Merges multiple `AbortSignal` values into a single signal that aborts when
 * **any** of the provided signals aborts (logical OR).
 *
 * - Nullish values (`null` / `undefined`) are silently ignored.
 * - Returns `undefined` when no non-null signals are provided.
 * - Returns the single signal directly when exactly one non-null signal is given
 *   (no wrapper allocation).
 *
 * @example
 * ```ts
 * // Combine timeout and external cancellation
 * const signal = anySignal(AbortSignal.timeout(5000), externalSignal);
 *
 * // Variadic — compose a disposal signal with per-call signals
 * const combined = anySignal(disposeSignal, callSignal, extraSignal);
 * ```
 *
 * @param signals - Signals to merge. Nullish entries are ignored.
 * @returns A merged `AbortSignal`, or `undefined` if no signals were provided.
 */
export function anySignal(...signals: ReadonlyArray<AbortSignal | null | undefined>): AbortSignal | undefined {
  const active = signals.filter((s): s is AbortSignal => s != null);

  if (active.length === 0) return undefined;

  if (active.length === 1) return active[0];

  return AbortSignal.any(active);
}
