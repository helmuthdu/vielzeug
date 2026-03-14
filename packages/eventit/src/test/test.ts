import type { Bus, BusOptions, EventKey, EventMap } from '../eventit';

import { createBus } from '../eventit';

/** A test bus is a regular bus with typed emission recording on top. */
export type TestBus<T extends EventMap> = Bus<T> & {
  /** Snapshot of all payloads emitted for the given event key, in order. */
  emitted<K extends EventKey<T>>(event: K): T[K][];
  /** Clear emitted records without disposing the bus. */
  reset(): void;
};

export function createTestBus<T extends EventMap>(options?: Omit<BusOptions<T>, 'onEmit'>): TestBus<T> {
  const records = new Map<string, unknown[]>();

  const bus = createBus<T>({
    ...options,
    onEmit(event, payload) {
      let list = records.get(event);

      if (!list) {
        list = [];
        records.set(event, list);
      }

      list.push(payload);
    },
  });

  function emitted<K extends EventKey<T>>(event: K): T[K][] {
    return [...(records.get(event) ?? [])] as T[K][];
  }

  function dispose(): void {
    records.clear();
    bus.dispose();
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
