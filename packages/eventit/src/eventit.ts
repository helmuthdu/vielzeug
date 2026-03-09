/** -------------------- Core Types -------------------- **/

export type EventMap = Record<string, unknown>;
export type EventKey<T extends EventMap> = keyof T & string;
export type Listener<T> = (payload: T) => void;
export type Unsubscribe = () => void;

export type EventBusOptions<T extends EventMap = EventMap> = {
  /** Custom error handler. If not provided, listener errors are re-thrown. */
  onError?: (err: unknown, event: EventKey<T>) => void;
  /** Called on every emit, before listeners run. Useful for logging and testing. */
  onEmit?: (event: EventKey<T>, payload: unknown) => void;
};

export type EventBus<T extends EventMap> = {
  /** Subscribe to an event. Returns an unsubscribe function. */
  on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>): Unsubscribe;
  /** Subscribe once — auto-unsubscribes after the first emit. */
  once<K extends EventKey<T>>(event: K, listener: Listener<T[K]>): Unsubscribe;
  /** Emit an event, calling all registered listeners synchronously. */
  emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): void;
  /** Remove all listeners for a specific event, or all events if none provided. */
  clear(event?: EventKey<T>): void;
  /** Permanently dispose the bus — clears all listeners; emit and on become no-ops. */
  dispose(): void;
};

export type TestBus<T extends EventMap> = {
  bus: EventBus<T>;
  /** All payloads emitted per event key, in order. */
  emitted: Map<EventKey<T>, unknown[]>;
  /** Clear emitted records without disposing the bus. */
  reset(): void;
  /** Dispose the bus and clear all records. */
  dispose(): void;
};

/** -------------------- Factory -------------------- **/

export function eventBus<T extends EventMap>(options?: EventBusOptions<T>): EventBus<T> {
  const subs = new Map<string, Set<Listener<unknown>>>();
  let disposed = false;

  function on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>): Unsubscribe {
    if (disposed) return () => {};
    let set = subs.get(event);
    if (!set) subs.set(event, (set = new Set()));
    set.add(listener as Listener<unknown>);
    return () => {
      subs.get(event)?.delete(listener as Listener<unknown>);
    };
  }

  function once<K extends EventKey<T>>(event: K, listener: Listener<T[K]>): Unsubscribe {
    const unsub = on(event, (payload) => {
      unsub();
      listener(payload);
    });
    return unsub;
  }

  function emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): void {
    if (disposed) return;
    const payload = (args as unknown[])[0];
    options?.onEmit?.(event, payload);
    const set = subs.get(event);
    if (!set?.size) return;
    for (const listener of [...set]) {
      try {
        listener(payload);
      } catch (err) {
        if (options?.onError) options.onError(err, event);
        else throw err;
      }
    }
  }

  function clear(event?: EventKey<T>): void {
    if (event !== undefined) subs.delete(event);
    else subs.clear();
  }

  function dispose(): void {
    disposed = true;
    subs.clear();
  }

  return { on, once, emit, clear, dispose };
}

/** -------------------- Test Utilities -------------------- **/

export function testEventBus<T extends EventMap>(options?: Omit<EventBusOptions<T>, 'onEmit'>): TestBus<T> {
  const emitted = new Map<EventKey<T>, unknown[]>();

  const bus = eventBus<T>({
    ...options,
    onEmit(event, payload) {
      const list = emitted.get(event) ?? [];
      list.push(payload);
      emitted.set(event, list);
    },
  });

  return {
    bus,
    emitted,
    reset: () => emitted.clear(),
    dispose(): void {
      emitted.clear();
      bus.dispose();
    },
  };
}
