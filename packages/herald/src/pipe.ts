import type { Bus, EventKey, EventMap } from './types';

/**
 * Forward selected events from `source` to `target`.
 *
 * The pipe tears down automatically when either bus is disposed, or when the provided `signal`
 * aborts. Call the returned function to stop piping manually at any time.
 *
 * @example
 * const unsub = pipeEvents(sourceBus, targetBus, ['userLogin', 'userLogout']);
 * // Later:
 * unsub(); // stop piping
 *
 * @example
 * // Scoped to a request lifetime
 * const controller = new AbortController();
 * pipeEvents(appBus, requestBus, ['config'], controller.signal);
 * controller.abort(); // stop when request ends
 */
export function pipeEvents<T extends EventMap>(
  source: Bus<T>,
  target: Bus<T>,
  events: readonly [EventKey<T>, ...EventKey<T>[]],
  signal?: AbortSignal,
): () => void {
  // The pipe stops when the target bus is disposed, or when the external signal fires.
  // Source bus disposal is handled by source.on()'s internal merge with the source disposal signal.
  const pipeSignal = signal ? AbortSignal.any([target.disposalSignal, signal]) : target.disposalSignal;

  // Cast needed: emit's conditional rest args (void vs payload) cannot be resolved in a generic
  // context. At runtime, passing undefined for void events is safe — the bus ignores it.
  const emitTarget = target.emit as (event: EventKey<T>, payload?: unknown) => void;

  const unsubs = events.map((event) => source.on(event, (payload) => emitTarget(event, payload), pipeSignal));

  return () => unsubs.forEach((u) => u());
}
