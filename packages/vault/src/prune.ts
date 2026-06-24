import type { Adapter, AnySchema } from './types';

import { warn } from './_warn';
import { VaultDisposedError, VaultError } from './errors';

/**
 * Schedules periodic calls to `adapter.pruneExpired()` using `setInterval`.
 * Returns a `stop` function to cancel the schedule.
 *
 * The schedule auto-cancels if the adapter is disposed — no need to call `stop()`
 * in a dispose handler when the adapter lifetime matches the schedule lifetime.
 *
 * ```ts
 * const stopPrune = scheduleExpiredPrune(db, { interval: ttl.hours(1) });
 * // later...
 * stopPrune();
 * ```
 */
export function scheduleExpiredPrune<S extends AnySchema>(
  adapter: Pick<Adapter<S>, 'pruneExpired'>,
  options: {
    interval: number;
    /**
     * Called when `pruneExpired()` throws an error that is NOT a `VaultDisposedError`.
     * `VaultDisposedError` always stops the schedule automatically.
     * Without this callback, non-disposal errors are silently swallowed.
     */
    onError?: (err: unknown) => void;
    /**
     * When aborted, stops the schedule. Useful for tying the schedule lifetime
     * to an adapter's `disposalSignal`:
     * ```ts
     * scheduleExpiredPrune(db, { interval: ttl.hours(1), signal: db.disposalSignal });
     * ```
     */
    signal?: AbortSignal;
  },
): () => void {
  if (!Number.isFinite(options.interval) || options.interval <= 0) {
    throw new VaultError('scheduleExpiredPrune: interval must be a finite positive number');
  }

  let active = true;

  const stop = (): void => {
    active = false;
    clearInterval(id);
  };

  options.signal?.addEventListener('abort', stop, { once: true });

  const id = setInterval(() => {
    if (!active) return;

    void adapter.pruneExpired().catch((err) => {
      if (err instanceof VaultDisposedError) {
        active = false;
        clearInterval(id);
      } else if (options.onError) {
        options.onError(err);
      } else {
        warn(`scheduleExpiredPrune: pruneExpired() threw — pass onError to handle this. ${String(err)}`);
      }
    });
  }, options.interval);

  return stop;
}
