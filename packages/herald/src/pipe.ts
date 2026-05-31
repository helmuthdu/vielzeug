import type { Bus, EventMap, PipeEntry } from './types';

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
 * This is a standalone convenience function. For piping from a bus you own, the instance method
 * `source.pipe(target, entries, signal)` is equivalent and requires no import.
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
): () => void {
  // R1: Delegate to source.pipe() — eliminates the duplicate pipe logic that lived here before.
  return source.pipe(target, entries, signal);
}
