import type { Adapter, AnySchema } from './types';

/**
 * Schedules periodic calls to `adapter.pruneExpired()` using `setInterval`.
 * Returns a `stop` function to cancel the schedule.
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
  const id = setInterval(() => {
    void adapter.pruneExpired();
  }, options.interval);

  return () => clearInterval(id);
}
