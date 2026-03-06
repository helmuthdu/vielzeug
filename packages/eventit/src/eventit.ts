/** -------------------- Core Types -------------------- **/

export type EventMap = Record<string, unknown>;
export type EventKey<T extends EventMap> = string & keyof T;
export type EventListener<T> = (payload: T) => void;
export type Unsubscribe = () => void;

export type EventBusOptions = {
  /** Maximum number of listeners per event before a warning is printed. Default: 100 */
  maxListeners?: number;
  /** Custom error handler for listener errors. If not provided, errors are re-thrown. */
  onError?: (err: unknown, event: string) => void;
};

export type EventBus<T extends EventMap> = {
  /** Subscribe to an event. Returns an unsubscribe function. */
  on<K extends EventKey<T>>(event: K, listener: EventListener<T[K]>): Unsubscribe;
  /** Subscribe to an event once — auto-unsubscribes after the first emit. */
  once<K extends EventKey<T>>(event: K, listener: EventListener<T[K]>): Unsubscribe;
  /** Remove a specific listener, or all listeners for an event if none is provided. */
  off<K extends EventKey<T>>(event: K, listener?: EventListener<T[K]>): void;
  /** Emit an event, calling all registered listeners synchronously. */
  emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): void;
  /** Remove all listeners for a specific event, or all events if none is provided. */
  clear(event?: EventKey<T>): void;
  /** Returns true if the event has at least one active listener. */
  has<K extends EventKey<T>>(event: K): boolean;
  /** Returns the number of listeners registered for an event. */
  listenerCount<K extends EventKey<T>>(event: K): number;
};

export type TestEventBus<T extends EventMap> = {
  bus: EventBus<T>;
  emitted: Map<EventKey<T>, unknown[]>;
  dispose: () => void;
};

/** -------------------- EventBus Implementation -------------------- **/

class EventBusImpl<T extends EventMap> {
  private readonly listeners = new Map<string, Set<EventListener<unknown>>>();
  private readonly maxListeners: number;
  private readonly onError?: (err: unknown, event: string) => void;

  constructor(options?: EventBusOptions) {
    this.maxListeners = options?.maxListeners ?? 100;
    this.onError = options?.onError;
  }

  on<K extends EventKey<T>>(event: K, listener: EventListener<T[K]>): Unsubscribe {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    if (set.size >= this.maxListeners) {
      console.warn(
        `[eventit] Max listeners (${this.maxListeners}) reached for event "${event}". Possible memory leak.`,
      );
    }
    set.add(listener as EventListener<unknown>);
    return () => this.off(event, listener);
  }

  once<K extends EventKey<T>>(event: K, listener: EventListener<T[K]>): Unsubscribe {
    const wrapper: EventListener<T[K]> = (payload) => {
      this.off(event, wrapper);
      listener(payload);
    };
    return this.on(event, wrapper);
  }

  off<K extends EventKey<T>>(event: K, listener?: EventListener<T[K]>): void {
    if (listener === undefined) {
      this.listeners.delete(event);
      return;
    }
    this.listeners.get(event)?.delete(listener as EventListener<unknown>);
  }

  emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): void {
    const payload = args[0] as unknown;
    const set = this.listeners.get(event);
    if (!set?.size) return;
    for (const listener of [...set]) {
      try {
        listener(payload);
      } catch (err) {
        if (this.onError) {
          this.onError(err, event);
        } else {
          throw err;
        }
      }
    }
  }

  clear(event?: EventKey<T>): void {
    if (event !== undefined) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  has<K extends EventKey<T>>(event: K): boolean {
    return (this.listeners.get(event)?.size ?? 0) > 0;
  }

  listenerCount<K extends EventKey<T>>(event: K): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

/** -------------------- Factory -------------------- **/

export function createEventBus<T extends EventMap>(options?: EventBusOptions): EventBus<T> {
  return new EventBusImpl<T>(options) as EventBus<T>;
}

/** -------------------- Test Utilities -------------------- **/

export function createTestEventBus<T extends EventMap>(): TestEventBus<T> {
  const bus = createEventBus<T>();
  const emitted = new Map<EventKey<T>, unknown[]>();
  let disposed = false;

  const testBus: EventBus<T> = {
    clear: (event?) => bus.clear(event),
    // biome-ignore lint/suspicious/noExplicitAny: intentional any for tracking wrapper
    emit: (event: any, ...args: any[]) => {
      const payload = args[0];
      if (!disposed) {
        if (!emitted.has(event)) emitted.set(event, []);
        emitted.get(event)!.push(payload);
      }
      // biome-ignore lint/suspicious/noExplicitAny: intentional any for tracking wrapper
      (bus.emit as any)(event, payload);
    },
    has: (event) => bus.has(event),
    listenerCount: (event) => bus.listenerCount(event),
    off: (event, listener?) => bus.off(event, listener),
    on: (event, listener) => bus.on(event, listener),
    once: (event, listener) => bus.once(event, listener),
  };

  return {
    bus: testBus,
    dispose: () => {
      disposed = true;
      emitted.clear();
      bus.clear();
    },
    emitted,
  };
}
