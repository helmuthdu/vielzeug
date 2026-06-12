import type { Bus, EventMap } from './types';

/**
 * Creates a mutable delegation object that forwards every Bus<T> method and getter to `bus`.
 * Callers can overwrite individual properties on the returned object to override specific
 * behaviour (e.g. `delegate.emit = customEmit`) without repeating the full delegation boilerplate
 * for the remaining ~14 methods.
 *
 * Getters (`disposed`, `disposalSignal`) are defined via `Object.defineProperty` so they remain
 * live — reading them always queries the underlying bus rather than snapshotting the value at
 * creation time.
 *
 * @internal Not re-exported from the public index.
 */
export function makeBusDelegate<T extends EventMap>(bus: Bus<T>): Bus<T> {
  type BusMethods<T extends EventMap> = Omit<Bus<T>, 'disposed' | 'disposalSignal'>;

  const delegate = {
    dispose: () => bus.dispose(),
    emit: bus.emit,
    eventNames: bus.eventNames,
    events: bus.events,
    listenerCount: bus.listenerCount,
    on: bus.on,
    onAny: bus.onAny,
    once: bus.once,
    removeAllListeners: bus.removeAllListeners,
    [Symbol.dispose]: () => bus.dispose(),
    wait: bus.wait,
    waitAny: bus.waitAny,
  } satisfies BusMethods<T> as Bus<T>; // satisfies catches any missing method; cast is safe — getters added below.

  Object.defineProperty(delegate, 'disposalSignal', {
    configurable: true,
    enumerable: true,
    get: () => bus.disposalSignal,
  });

  Object.defineProperty(delegate, 'disposed', {
    configurable: true,
    enumerable: true,
    get: () => bus.disposed,
  });

  return delegate;
}
