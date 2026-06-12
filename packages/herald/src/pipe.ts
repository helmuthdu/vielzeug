import type { Bus, EventKey, EventMap, PipeEntry, PipeableKey, Unsubscribe } from './types';

import { combineSignals } from './bus';

/**
 * Forward selected events from `source` to `target`.
 *
 * Each entry in the `entries` array is either:
 * - A **string key** — forward the event under the same name. Source and target need not share the
 *   same event map type; only the listed keys must exist in both with compatible payload types.
 * - A **`{ from, to }` object** — forward the event under a different name on the target bus,
 *   enabling cross-domain event translation.
 *
 * The pipe tears down automatically when either bus is disposed, or when the provided `signal`
 * aborts. Call the returned function to stop piping manually at any time.
 *
 * @example
 * const unpipe = pipeEvents(featureBus, auditBus, ['user:login', 'user:logout']);
 * unpipe(); // stop piping
 *
 * @example
 * pipeEvents(authBus, appBus, [{ from: 'auth:login', to: 'user:authenticated' }]);
 */
export function pipeEvents<S extends EventMap, T extends EventMap>(
  source: Bus<S>,
  target: Bus<T>,
  entries: readonly [PipeEntry<S, T>, ...PipeEntry<S, T>[]],
  signal?: AbortSignal,
): Unsubscribe {
  if (entries.length === 0) throw new RangeError('pipeEvents() requires at least one entry');

  // Stop when target disposes or when the caller's signal fires.
  const pipeSignal = combineSignals(target.disposalSignal, signal);

  // Cast needed: emit's conditional rest args (void vs payload) cannot be resolved in a generic
  // context. At runtime, passing undefined for void events is safe — the bus ignores it.
  const emitTarget = target.emit as unknown as (event: EventKey<T>, payload?: unknown) => void;

  const unsubs = entries.map((entry) => {
    if (typeof entry === 'string') {
      const key = entry as PipeableKey<S, T>;

      return source.on(key as EventKey<S>, (payload) => emitTarget(key as unknown as EventKey<T>, payload), {
        signal: pipeSignal,
      });
    }

    const { from, to } = entry as { from: EventKey<S>; to: EventKey<T> };

    return source.on(from, (payload) => emitTarget(to, payload), { signal: pipeSignal });
  });

  return () => unsubs.forEach((u) => u());
}
