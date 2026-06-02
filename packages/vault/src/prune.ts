import type { Adapter, AnySchema } from './types';

import { VaultDisposedError } from './errors';

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
  options: { interval: number },
): () => void {
  let active = true;
  const id = setInterval(() => {
    if (!active) return;

    void adapter.pruneExpired().catch((err) => {
      if (err instanceof VaultDisposedError) {
        active = false;
        clearInterval(id);
      }
    });
  }, options.interval);

  return () => {
    active = false;
    clearInterval(id);
  };
}
