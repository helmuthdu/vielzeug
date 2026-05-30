import type {
  BehaviorBus,
  BehaviorInitial,
  BusOptions,
  EventKey,
  EventMap,
  Listener,
  SubscribeOptions,
  Unsubscribe,
} from './types';

import { createBus } from './bus';

/**
 * Creates a bus that replays the last known value for each event to new subscribers.
 *
 * When a listener subscribes via `on()` or `once()`, it immediately receives the current value
 * for that event (if one has been emitted or was provided as an initial value).
 * `events()`, `wait()`, and `waitAny()` behave like a regular bus — no replay.
 *
 * @param initial - Optional map of event names to their starting values.
 * @param options - Standard bus options forwarded to the underlying `createBus` call.
 *
 * @example
 * const bus = createBehaviorBus<{ count: number }>({ count: 0 });
 * bus.on('count', (n) => console.log(n)); // logs 0 immediately
 * bus.emit('count', 1);
 * bus.on('count', (n) => console.log(n)); // logs 1 immediately (latest value)
 */
export function createBehaviorBus<T extends EventMap>(
  initial?: BehaviorInitial<T>,
  options?: BusOptions<T>,
): BehaviorBus<T> {
  const current = new Map<string, unknown>(Object.entries(initial ?? {}));
  const userOnDispatch = options?.onDispatch;

  const bus = createBus<T>({
    ...options,
    onDispatch(event: EventKey<T>, payload: unknown) {
      current.set(event, payload);
      userOnDispatch?.(event, payload);
    },
  });

  function getCurrent<K extends EventKey<T>>(event: K): T[K] | undefined {
    return current.get(event as string) as T[K] | undefined;
  }

  // F2: Override on() to replay the current value to new subscribers.
  function on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, opts?: SubscribeOptions): Unsubscribe {
    // Don't replay or subscribe if the bus is disposed or the caller's signal is already aborted.
    if (bus.disposed || opts?.signal?.aborted) return () => {};

    if (current.has(event as string)) {
      listener(current.get(event as string) as T[K]);

      // Already fired — no future subscription needed when once is true.
      if (opts?.once) return () => {};
    }

    return bus.on(event, listener, opts);
  }

  function once<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): Unsubscribe {
    return on(event, listener, { once: true, signal });
  }

  function dispose(): void {
    bus.dispose();
    current.clear();
  }

  // Explicit delegation — avoids object spread snapshotting getters at creation time.
  return {
    current: getCurrent,
    get disposalSignal() {
      return bus.disposalSignal;
    },
    dispose,
    get disposed() {
      return bus.disposed;
    },
    emit: bus.emit,
    eventNames: bus.eventNames,
    events: bus.events,
    listenerCount: bus.listenerCount,
    on,
    onAny: bus.onAny,
    once,
    pipe: bus.pipe,
    removeAllListeners: bus.removeAllListeners,
    [Symbol.dispose]: dispose,
    wait: bus.wait,
    waitAny: bus.waitAny,
  };
}
