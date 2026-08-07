import type { Bus, BusOptions, EventKey, EventMap } from '..';
import type { InternalBusOptions } from '../bus';

import { isUnsafeObjectKey } from '../_prototype';
import { createBus } from '../bus';

/** A test bus is a regular bus with typed emission recording on top. */
export type TestBus<T extends EventMap> = Bus<T> & {
  /** Returns a snapshot of all payloads dispatched across every recorded event, keyed by event name. */
  allEmitted(): { [K in EventKey<T>]?: T[K][] };
  /** Snapshot of all payloads that were successfully dispatched for the given event key, in order. */
  emitted<K extends EventKey<T>>(event: K): T[K][];
  /** Number of times the given event was successfully dispatched. Shorthand for `emitted(event).length`. */
  emittedCount<K extends EventKey<T>>(event: K): number;
  /** Clear emitted records without disposing the bus. */
  reset(): void;
};

export function createTestBus<T extends EventMap = Record<string, unknown>>(options?: BusOptions<T>): TestBus<T> {
  const records = new Map<string, unknown[]>();
  const bus = createBus<T>({
    ...options,
    _onDispatch: (event: EventKey<T>, payload: unknown) => {
      const list = records.get(event);

      if (list) list.push(payload);
      else records.set(event, [payload]);
    },
  } as InternalBusOptions<T>);
  const disposeBus = bus.dispose;

  function allEmitted(): { [K in EventKey<T>]?: T[K][] } {
    const result: { [K in EventKey<T>]?: T[K][] } = {};

    for (const [key, list] of records) {
      if (isUnsafeObjectKey(key)) continue;

      (result as Record<string, unknown[]>)[key] = [...list];
    }

    return result;
  }

  function emitted<K extends EventKey<T>>(event: K): T[K][] {
    return [...(records.get(event) ?? [])] as T[K][];
  }

  function emittedCount<K extends EventKey<T>>(event: K): number {
    return records.get(event)?.length ?? 0;
  }

  function dispose(): void {
    disposeBus();
    records.clear();
  }

  return Object.assign(bus, {
    allEmitted,
    dispose,
    emitted,
    emittedCount,
    reset: () => records.clear(),
    [Symbol.dispose]: dispose,
  }) as TestBus<T>;
}
