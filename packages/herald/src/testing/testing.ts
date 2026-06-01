import type { Bus, BusOptions, EventKey, EventMap } from '..';

import { createBus } from '..';
import { makeBusDelegate } from '../_delegate';

/** A test bus is a regular bus with typed emission recording on top. */
export type TestBus<T extends EventMap> = Bus<T> & {
  /** Snapshot of all payloads emitted for the given event key, in order. */
  emitted<K extends EventKey<T>>(event: K): T[K][];
  /** Number of times the given event has been emitted. Shorthand for `emitted(event).length`. */
  emittedCount<K extends EventKey<T>>(event: K): number;
  /** Clear emitted records without disposing the bus. */
  reset(): void;
};

export function createTestBus<T extends EventMap>(options?: BusOptions<T>): TestBus<T> {
  const records = new Map<string, unknown[]>();
  const bus = createBus<T>(options);

  function record(event: EventKey<T>, payload: unknown): void {
    const list = records.get(event);

    if (list) list.push(payload);
    else records.set(event, [payload]);
  }

  function emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): number {
    if (!bus.disposed) record(event, (args as unknown[])[0]);

    return (bus.emit as (event: EventKey<T>, payload?: unknown) => number)(event, (args as unknown[])[0]);
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

  // Use makeBusDelegate to avoid enumerating every Bus<T> method. Override only what differs.
  const delegate = makeBusDelegate<T>(bus) as TestBus<T>;

  delegate.dispose = dispose;
  delegate.emit = emit as Bus<T>['emit'];
  delegate.emitted = emitted;
  delegate.emittedCount = emittedCount;
  delegate.reset = () => records.clear();
  delegate[Symbol.dispose] = dispose;

  return delegate;
}
