import { error as logError } from './_dev';
import { assertPositiveFinite } from './ttl';
import type { AnySchema, VaultStore } from './types';

/**
 * Schedules periodic `pruneExpired()` calls. Returns a `stop` function.
 *
 * Pass `signal: store.disposalSignal` to auto-cancel when the store is torn down.
 * Pass `onError` to handle non-disposal failures explicitly; without it, errors
 * are logged via the dev channel and the schedule continues.
 *
 * ```ts
 * const stop = scheduleExpiredPrune(db, {
 *   interval: ttl.hours(1),
 *   signal: db.disposalSignal,
 * });
 * ```
 */
export function scheduleExpiredPrune<S extends AnySchema>(
  adapter: Pick<VaultStore<S>, 'pruneExpired'>,
  options: {
    interval: number;
    onError?: (err: unknown) => void;
    signal?: AbortSignal;
  },
): () => void {
  assertPositiveFinite(options.interval, 'scheduleExpiredPrune: interval');

  const id = setInterval(() => {
    void adapter.pruneExpired().catch((err) => {
      if (options.onError) options.onError(err);
      else logError('scheduleExpiredPrune: pruneExpired() threw — pass onError to handle this.', err);
    });
  }, options.interval);

  const stop = (): void => clearInterval(id);

  options.signal?.addEventListener('abort', stop, { once: true });

  return stop;
}
