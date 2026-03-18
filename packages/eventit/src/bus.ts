import type { Bus, BusOptions, EventKey, EventMap, Listener } from './types';

import { BusDisposedError } from './errors';

export function createBus<T extends EventMap>(options?: BusOptions<T>): Bus<T> {
  const subs = new Map<string, Set<Listener<unknown>>>();
  const pending = new Set<(err: unknown) => void>();
  let disposed = false;

  function on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): () => void {
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

  function once<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): () => void {
    let unsub: () => void = () => {};
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
