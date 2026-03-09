/** -------------------- Core Types -------------------- **/

export type EventMap = Record<string, unknown>;
export type EventKey<T extends EventMap> = keyof T & string;
export type Listener<T> = (payload: T) => void;
export type Unsubscribe = () => void;

export type BusOptions<T extends EventMap = EventMap> = {
  /** Called on every emit before listeners run. Useful for logging/tracing. */
  onEmit?: (event: EventKey<T>, payload: unknown) => void;
  /** If provided, listener errors are forwarded here instead of re-thrown. */
  onError?: (err: unknown, event: EventKey<T>, payload: unknown) => void;
};

export type Bus<T extends EventMap> = {
  /** Whether the bus has been permanently disposed. */
  readonly disposed: boolean;
  /** Subscribe to an event. Returns an unsubscribe function. Stops automatically when signal aborts. */
  on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): Unsubscribe;
  /** Subscribe once — auto-unsubscribes after the first emit. Stops early when signal aborts. */
  once<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): Unsubscribe;
  /** Resolve on the next emit. Rejects if the bus is disposed or signal aborts. */
  wait<K extends EventKey<T>>(event: K, signal?: AbortSignal): Promise<T[K]>;
  /** Async-iterate over all future emits of an event. Terminates when the bus is disposed or signal aborts. */
  events<K extends EventKey<T>>(event: K, signal?: AbortSignal): AsyncGenerator<T[K]>;
  /** Emit an event, calling all registered listeners synchronously. */
  emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): void;
  /** Permanently dispose the bus — clears all listeners; pending waits are rejected. Idempotent. */
  dispose(): void;
  /** Alias for dispose() — enables the `using` keyword for automatic cleanup. */
  [Symbol.dispose](): void;
};

/** -------------------- Factory -------------------- **/

const ERR_DISPOSED = 'Bus is disposed';

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
      subs.get(event)?.delete(l);
      signal?.removeEventListener('abort', unsub);
    }
    signal?.addEventListener('abort', unsub, { once: true });
    return unsub;
  }

  function once<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): Unsubscribe {
    let unsub: Unsubscribe;
    const wrapper = (payload: T[K]) => {
      unsub();
      listener(payload);
    };
    unsub = on(event, wrapper as Listener<T[K]>, signal);
    return unsub;
  }

  function wait<K extends EventKey<T>>(event: K, signal?: AbortSignal): Promise<T[K]> {
    if (disposed) return Promise.reject(new Error(ERR_DISPOSED));
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
      yield await wait(event, signal);
    }
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
        if (options?.onError) options.onError(err, event, payload);
        else throw err;
      }
    }
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    const err = new Error(ERR_DISPOSED);
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
    on,
    once,
    wait,
    [Symbol.dispose]: dispose,
  };
}
