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
  const userOnEmit = options?.onEmit;
  const { onEmit: _, ...busOptions } = options ?? {};
  const bus = createBus<T>(busOptions);

  function record<K extends EventKey<T>>(event: K, payload: T[K]): void {
    let list = records.get(event);

    if (!list) {
      list = [];
      records.set(event, list);
    }

    list.push(payload);
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
    userOnEmit?.(event, payload);
    bus.emit(event, ...args);
  }

  const overrides = {
    dispose,
    emit,
    emitted,
    reset: () => records.clear(),
    [Symbol.dispose]: dispose,
  };

  return new Proxy(bus, {
    get(target, prop, receiver) {
      if (prop in overrides) return Reflect.get(overrides, prop, receiver);

      return Reflect.get(target, prop, receiver);
    },
  }) as TestBus<T>;
}
