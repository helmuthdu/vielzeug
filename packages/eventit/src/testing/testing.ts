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
    onDispatch<K extends EventKey<T>>(event: K, payload: T[K]) {
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

  return {
    ...bus,
    dispose,
    get disposed() {
      return bus.disposed;
    },
    emitted,
    reset: () => records.clear(),
    [Symbol.dispose]: dispose,
  };
}
