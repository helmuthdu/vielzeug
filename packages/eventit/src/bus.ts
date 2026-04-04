import type { Bus, BusOptions, EventKey, EventMap, Listener } from './types';

import { BusDisposedError } from './errors';

export function createBus<T extends EventMap>(options?: BusOptions<T>): Bus<T> {
  const subs = new Map<string, Set<Listener<unknown>>>();
  const disposeController = new AbortController();

  function on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): () => void {
    const mergedSignal = signal ? AbortSignal.any([disposeController.signal, signal]) : disposeController.signal;

    try {
      mergedSignal.throwIfAborted();
    } catch {
      return () => {};
    }

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

      mergedSignal.removeEventListener('abort', unsub);
    }
    mergedSignal.addEventListener('abort', unsub, { once: true });

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
    const mergedSignal = signal ? AbortSignal.any([disposeController.signal, signal]) : disposeController.signal;

    try {
      mergedSignal.throwIfAborted();
    } catch (err) {
      return Promise.reject(err);
    }

    return new Promise<T[K]>((resolve, reject) => {
      function onAbort() {
        unsub();
        reject(mergedSignal.reason);
      }

      const unsub = once(event, (payload) => {
        mergedSignal.removeEventListener('abort', onAbort);
        resolve(payload);
      });

      mergedSignal.addEventListener('abort', onAbort, { once: true });
    });
  }

  async function* events<K extends EventKey<T>>(event: K, signal?: AbortSignal): AsyncGenerator<T[K]> {
    const queue: T[K][] = [];
    let wake: (() => void) | undefined;
    const mergedSignal = signal ? AbortSignal.any([disposeController.signal, signal]) : disposeController.signal;

    if (mergedSignal.aborted) return;

    const unsub = on(event, (payload) => {
      queue.push(payload);
      wake?.();
    });

    try {
      while (!mergedSignal.aborted) {
        if (queue.length) {
          yield queue.shift()!;
          continue;
        }

        const { promise, resolve } = Promise.withResolvers<void>();
        const abortHandler = (): void => {
          resolve();
        };

        wake = resolve;
        mergedSignal.addEventListener('abort', abortHandler, { once: true });
        await promise;
        mergedSignal.removeEventListener('abort', abortHandler);
        wake = undefined;
      }
    } finally {
      unsub();
    }
  }

  function emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): void {
    if (disposeController.signal.aborted) return;

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
    if (disposeController.signal.aborted) return;

    disposeController.abort(new BusDisposedError());
    subs.clear();
  }

  return {
    dispose,
    get disposed() {
      return disposeController.signal.aborted;
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
