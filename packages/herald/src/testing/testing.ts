import type { Bus, BusOptions, EventKey, EventMap } from '..';

import { createBus } from '..';

/** A test bus is a regular bus with typed emission recording on top. */
export type TestBus<T extends EventMap> = Bus<T> & {
  /** Snapshot of all payloads emitted for the given event key, in order. */
  emitted<K extends EventKey<T>>(event: K): T[K][];
  /** Clear emitted records without disposing the bus. */
  reset(): void;
};

export function createTestBus<T extends EventMap>(options?: BusOptions<T>): TestBus<T> {
  const records = new Map<string, unknown[]>();
  const userOnDispatch = options?.onDispatch;

  const bus = createBus<T>({
    ...options,
    onDispatch(event: EventKey<T>, payload: unknown) {
      const list = records.get(event);

      if (list) list.push(payload);
      else records.set(event, [payload]);

      userOnDispatch?.(event, payload);
    },
  });

  function emitted<K extends EventKey<T>>(event: K): T[K][] {
    return [...(records.get(event) ?? [])] as T[K][];
  }

  function dispose(): void {
    bus.dispose();
    records.clear();
  }

  // Explicit delegation — avoids object spread snapshotting getters at creation time.
  // Any getter added to Bus<T> in the future will correctly delegate here without silent bugs.
  return {
    get disposalSignal() {
      return bus.disposalSignal;
    },
    dispose,
    get disposed() {
      return bus.disposed;
    },
    emit: bus.emit,
    emitted,
    eventNames: bus.eventNames,
    events: bus.events,
    listenerCount: bus.listenerCount,
    on: bus.on,
    onAny: bus.onAny,
    once: bus.once,
    pipe: bus.pipe,
    removeAllListeners: bus.removeAllListeners,
    reset: () => records.clear(),
    [Symbol.dispose]: dispose,
    wait: bus.wait,
    waitAny: bus.waitAny,
  };
}
