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
  const { onDispatch: _, ...busOptions } = options ?? {};
  const bus = createBus<T>(busOptions);

  function record<K extends EventKey<T>>(event: K, payload: T[K]): void {
    const list = records.get(event);

    if (list) list.push(payload);
    else records.set(event, [payload]);
  }

  function emitted<K extends EventKey<T>>(event: K): T[K][] {
    return [...(records.get(event) ?? [])] as T[K][];
  }

  function dispose(): void {
    bus.dispose();
    records.clear();
  }

  function emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): void {
    if (bus.disposed) return;

    const payload = (args as unknown[])[0] as T[K];

    record(event, payload);
    userOnDispatch?.(event, payload);
    bus.emit(event, ...args);
  }

  return {
    dispose,
    get disposed() {
      return bus.disposed;
    },
    emit,
    emitted,
    eventNames: () => bus.eventNames(),
    events: (event, signal) => bus.events(event, signal),
    listenerCount: (event) => bus.listenerCount(event),
    on: (event, listener, signal) => bus.on(event, listener, signal),
    once: (event, listener, signal) => bus.once(event, listener, signal),
    removeAllListeners: (event) => bus.removeAllListeners(event),
    reset: () => records.clear(),
    [Symbol.dispose]: dispose,
    wait: (event, signal) => bus.wait(event, signal),
    waitAny: (events, signal) => bus.waitAny(events, signal),
  };
}
