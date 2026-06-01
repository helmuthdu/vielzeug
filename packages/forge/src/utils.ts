export { isPlainObject, flattenPaths as flattenValues, unflattenPaths as unflattenValues } from '@vielzeug/arsenal';

export { isSafePath as isSafeKey } from '@vielzeug/arsenal';

/**
 * Merges multiple AbortSignals into one that aborts when any of them aborts.
 * Nullish values are silently ignored.
 * Returns `undefined` when no non-null signals are provided.
 *
 * @internal Inlined here — `anySignal` was removed from `@vielzeug/arsenal`.
 */
export function anySignal(...signals: ReadonlyArray<AbortSignal | null | undefined>): AbortSignal | undefined {
  const active = signals.filter((s): s is AbortSignal => s != null);

  if (active.length === 0) return undefined;

  if (active.length === 1) return active[0];

  return AbortSignal.any(active);
}
