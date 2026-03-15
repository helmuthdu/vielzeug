/** -------------------- Core Types -------------------- **/

export type EventMap = Record<string, unknown>;
export type EventKey<T extends EventMap> = keyof T & string;
export type Listener<T> = (payload: T) => void;
export type Unsubscribe = () => void;

export type BusOptions<T extends EventMap = EventMap> = {
  /** Called on every emit before listeners run. Useful for logging/tracing. */
  onEmit?: <K extends EventKey<T>>(event: K, payload: T[K]) => void;
  /** If provided, listener errors are forwarded here instead of re-thrown. */
  onError?: <K extends EventKey<T>>(err: unknown, event: K, payload: T[K]) => void;
};

export class BusDisposedError extends Error {
  constructor() {
    super('Bus is disposed');
    this.name = 'BusDisposedError';
  }
}

export type Bus<T extends EventMap> = {
  /** Alias for dispose() — enables the `using` keyword for automatic cleanup. */
  [Symbol.dispose](): void;
  /** Permanently dispose the bus — clears all listeners; pending waits are rejected. Idempotent. */
  dispose(): void;
  /** Whether the bus has been permanently disposed. */
  readonly disposed: boolean;
  /** Emit an event, calling all registered listeners synchronously. */
  emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): void;
  /** Async-iterate over all future emits of an event. Terminates when the bus is disposed or signal aborts. */
  events<K extends EventKey<T>>(event: K, signal?: AbortSignal): AsyncGenerator<T[K]>;
  /** Number of active listeners for a given event, or total for all events if omitted. */
  listenerCount(event?: EventKey<T>): number;
  /** Subscribe to an event. Returns an unsubscribe function. Stops automatically when signal aborts. */
  on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): Unsubscribe;
  /** Subscribe once — auto-unsubscribes after the first emit. Stops early when signal aborts. */
  once<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): Unsubscribe;
  /** Resolve on the next emit. Rejects if the bus is disposed or signal aborts. */
  wait<K extends EventKey<T>>(event: K, signal?: AbortSignal): Promise<T[K]>;
};

/** -------------------- Factory -------------------- **/

export function createBus<T extends EventMap>(options?: BusOptions<T>): Bus<T> {
  const subs = new Map<string, Set<Listener<unknown>>>();
  const pending = new Set<(err: unknown) => void>();
  let disposed = false;

  function on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): Unsubscribe {
    if (disposed || signal?.aborted) return () => {};

    const l = listener as Listener<unknown>;
    let set = subs.get(event);

    if (!set) {
      set = new Set();
      subs.set(event, set);
    }

    set.add(l);
    function unsub() {
      const s = subs.get(event);

      s?.delete(l);

      if (s?.size === 0) subs.delete(event);

      signal?.removeEventListener('abort', unsub);
    }
    signal?.addEventListener('abort', unsub, { once: true });

    return unsub;
  }

  function once<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): Unsubscribe {
    let unsub: Unsubscribe = () => {};
    const wrapper = (payload: T[K]) => {
      unsub();
      listener(payload);
    };

    unsub = on(event, wrapper as Listener<T[K]>, signal);

    return unsub;
  }

  function wait<K extends EventKey<T>>(event: K, signal?: AbortSignal): Promise<T[K]> {
    if (disposed) return Promise.reject(new BusDisposedError());

    if (signal?.aborted) return Promise.reject(signal.reason);

    return new Promise<T[K]>((resolve, reject) => {
      function onDispose(reason: unknown) {
        signal?.removeEventListener('abort', onAbort);
        reject(reason);
      }
      function onAbort() {
        pending.delete(onDispose);
        unsub();
        reject(signal!.reason);
      }

      const unsub = once(event, (payload) => {
        pending.delete(onDispose);
        signal?.removeEventListener('abort', onAbort);
        resolve(payload);
      });

      pending.add(onDispose);
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  async function* events<K extends EventKey<T>>(event: K, signal?: AbortSignal): AsyncGenerator<T[K]> {
    while (true) {
      try {
        yield await wait(event, signal);
      } catch (err) {
        if (disposed || signal?.aborted) return;

        throw err;
      }
    }
  }

  function emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): void {
    if (disposed) return;

    const payload = (args as unknown[])[0];

    options?.onEmit?.(event, payload as T[K]);

    const set = subs.get(event);

    if (!set?.size) return;

    for (const listener of [...set]) {
      try {
        listener(payload);
      } catch (err) {
        if (options?.onError) options.onError(err, event, payload as T[K]);
        else throw err;
      }
    }
  }

  function listenerCount(event?: EventKey<T>): number {
    if (event !== undefined) return subs.get(event)?.size ?? 0;

    let total = 0;

    for (const set of subs.values()) total += set.size;

    return total;
  }

  function dispose(): void {
    if (disposed) return;

    disposed = true;

    const err = new BusDisposedError();

    for (const reject of pending) reject(err);
    pending.clear();
    subs.clear();
  }

  return {
    dispose,
    get disposed() {
      return disposed;
    },
    emit,
    events,
    listenerCount,
    on,
    once,
    [Symbol.dispose]: dispose,
    wait,
  };
}
