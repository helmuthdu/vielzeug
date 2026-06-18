import type { Bus, BusOptions, EventKey, EventMap, SubscribeOptions } from '..';
import type { InternalBusOptions } from '../bus';

import { makeBusDelegate } from '../_delegate';
import { createBus } from '../bus';

/** A test bus is a regular bus with typed emission recording on top. */
export type TestBus<T extends EventMap> = Bus<T> & {
  /** Returns a snapshot of all payloads dispatched across every recorded event, keyed by event name. */
  allEmitted(): { [K in EventKey<T>]?: T[K][] };
  /** Snapshot of all payloads that were successfully dispatched for the given event key, in order. */
  emitted<K extends EventKey<T>>(event: K): T[K][];
  /** Number of times the given event was successfully dispatched. Shorthand for `emitted(event).length`. */
  emittedCount<K extends EventKey<T>>(event: K): number;
  /** Unsubscribe all listeners for the given event. Emission records are preserved. */
  removeAllListeners<K extends EventKey<T>>(event: K): void;
  /** Clear emitted records without disposing the bus. */
  reset(): void;
};

export function createTestBus<T extends EventMap>(options?: BusOptions<T>): TestBus<T> {
  const records = new Map<string, unknown[]>();
  const unsubs = new Map<string, Set<() => void>>();

  const bus = createBus<T>({
    ...options,
    _onDispatch: (event: EventKey<T>, payload: unknown) => {
      const list = records.get(event);

      if (list) list.push(payload);
      else records.set(event, [payload]);
    },
  } as InternalBusOptions<T>);

  function allEmitted(): { [K in EventKey<T>]?: T[K][] } {
    const result: { [K in EventKey<T>]?: T[K][] } = {};

    for (const [key, list] of records) {
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
    bus.dispose();
    records.clear();
  }

  const delegate = makeBusDelegate<T>(bus) as TestBus<T>;

  const originalOn = delegate.on.bind(delegate);

  delegate.on = <K extends EventKey<T>>(event: K, listener: (payload: T[K]) => void, opts?: SubscribeOptions) => {
    const unsub = originalOn(event, listener, opts);
    const key = event as string;
    let set = unsubs.get(key);

    if (!set) {
      set = new Set();
      unsubs.set(key, set);
    }

    set.add(unsub);

    return unsub;
  };

  function removeAllListeners<K extends EventKey<T>>(event: K): void {
    const key = event as string;
    const set = unsubs.get(key);

    if (!set) return;

    for (const unsub of set) unsub();

    set.clear();
  }

  delegate.allEmitted = allEmitted;
  delegate.dispose = dispose;
  delegate.emitted = emitted;
  delegate.emittedCount = emittedCount;
  delegate.removeAllListeners = removeAllListeners;
  delegate.reset = () => records.clear();
  delegate[Symbol.dispose] = dispose;

  return delegate;
}
