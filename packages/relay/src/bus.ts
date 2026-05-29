import type { Bus, BusOptions, EventKey, EventMap, Listener, WaitAnyResult } from './types';

export class BusDisposedError extends Error {
  override name = 'BusDisposedError';
  constructor() {
    super('Bus is disposed');
  }
}

export function createBus<T extends EventMap>(options?: BusOptions<T>): Bus<T> {
  // Per-event map of listener fn → unsub, enabling O(1) add/remove/lookup by function identity.
  const listeners = new Map<string, Map<Listener<unknown>, () => void>>();
  const disposeController = new AbortController();
  const noop = () => {};

  function mergeSignal(signal?: AbortSignal): AbortSignal {
    return signal ? AbortSignal.any([disposeController.signal, signal]) : disposeController.signal;
  }

  function onWithSignal<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal: AbortSignal): () => void {
    if (signal.aborted) return noop;

    const l = listener as Listener<unknown>;
    let map = listeners.get(event);

    if (!map) {
      map = new Map();
      listeners.set(event, map);
    }

    // Return existing unsub for duplicate registration — deduplicates delivery while preserving cancel capability.
    const existing = map.get(l);

    if (existing) return existing;

    function unsub() {
      const m = listeners.get(event);

      m?.delete(l);

      if (m?.size === 0) listeners.delete(event);

      signal.removeEventListener('abort', unsub);
    }

    map.set(l, unsub);
    signal.addEventListener('abort', unsub, { once: true });

    return unsub;
  }

  function onceWithSignal<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal: AbortSignal): () => void {
    let unsub: () => void = noop;

    unsub = onWithSignal(
      event,
      (payload) => {
        unsub();
        listener(payload);
      },
      signal,
    );

    return unsub;
  }

  function on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): () => void {
    return onWithSignal(event, listener, mergeSignal(signal));
  }

  function once<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): () => void {
    return onceWithSignal(event, listener, mergeSignal(signal));
  }

  function wait<K extends EventKey<T>>(event: K, signal?: AbortSignal): Promise<T[K]> {
    const activeSignal = mergeSignal(signal);

    if (activeSignal.aborted) return Promise.reject(activeSignal.reason);

    return new Promise<T[K]>((resolve, reject) => {
      function onAbort() {
        reject(activeSignal.reason);
      }

      onceWithSignal(
        event,
        (payload) => {
          activeSignal.removeEventListener('abort', onAbort);
          resolve(payload);
        },
        activeSignal,
      );

      activeSignal.addEventListener('abort', onAbort, { once: true });
    });
  }

  async function* events<K extends EventKey<T>>(
    event: K,
    options?: { maxBuffer?: number; signal?: AbortSignal },
  ): AsyncGenerator<T[K]> {
    const activeSignal = mergeSignal(options?.signal);
    const maxBuffer = options?.maxBuffer ?? Infinity;

    if (maxBuffer <= 0) throw new RangeError('maxBuffer must be a positive number');

    if (activeSignal.aborted) return;

    const queue: T[K][] = [];
    let wake: (() => void) | undefined;

    const unsub = onWithSignal(
      event,
      (payload) => {
        if (queue.length >= maxBuffer) queue.shift();

        queue.push(payload);
        wake?.();
      },
      activeSignal,
    );

    try {
      while (!activeSignal.aborted) {
        if (queue.length) {
          yield queue.shift()!;
          continue;
        }

        const { promise, resolve } = Promise.withResolvers<void>();
        const abortHandler = (): void => {
          resolve();
        };

        wake = resolve;
        activeSignal.addEventListener('abort', abortHandler, { once: true });
        await promise;
        activeSignal.removeEventListener('abort', abortHandler);
        wake = undefined;
      }
    } finally {
      unsub();
    }
  }

  function emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): void {
    if (disposeController.signal.aborted) return;

    const payload = (args as unknown[])[0];

    options?.onDispatch?.(event, payload as T[K]);

    const map = listeners.get(event);

    if (!map?.size) return;

    for (const fn of [...map.keys()]) {
      try {
        fn(payload);
      } catch (err) {
        if (options?.onError) options.onError(err, event, payload as T[K]);
        else throw err;
      }
    }
  }

  function listenerCount(event?: EventKey<T>): number {
    if (event !== undefined) return listeners.get(event)?.size ?? 0;

    let total = 0;

    for (const map of listeners.values()) total += map.size;

    return total;
  }

  function removeAllListeners(event?: EventKey<T>): void {
    if (event !== undefined) {
      const map = listeners.get(event);

      if (map) {
        for (const unsub of [...map.values()]) unsub();
      }
    } else {
      for (const map of [...listeners.values()]) {
        for (const unsub of [...map.values()]) unsub();
      }
    }
  }

  function eventNames(): EventKey<T>[] {
    return [...listeners.keys()] as EventKey<T>[];
  }

  function waitAny<K extends readonly [EventKey<T>, EventKey<T>, ...EventKey<T>[]]>(
    eventList: K,
    signal?: AbortSignal,
  ): Promise<WaitAnyResult<T, K>> {
    const activeSignal = mergeSignal(signal);

    if (activeSignal.aborted) return Promise.reject(activeSignal.reason);

    return new Promise<WaitAnyResult<T, K>>((resolve, reject) => {
      const raceController = new AbortController();
      const raceSignal = AbortSignal.any([activeSignal, raceController.signal]);

      function onAbort() {
        reject(activeSignal.reason);
      }

      activeSignal.addEventListener('abort', onAbort, { once: true });

      for (const event of eventList) {
        onceWithSignal(
          event as EventKey<T>,
          (payload) => {
            activeSignal.removeEventListener('abort', onAbort);
            raceController.abort();
            resolve({ event, payload } as WaitAnyResult<T, K>);
          },
          raceSignal,
        );
      }
    });
  }

  function dispose(): void {
    if (disposeController.signal.aborted) return;

    disposeController.abort(new BusDisposedError());
    listeners.clear();
  }

  return {
    dispose,
    get disposed() {
      return disposeController.signal.aborted;
    },
    emit,
    eventNames,
    events,
    listenerCount,
    on,
    once,
    removeAllListeners,
    [Symbol.dispose]: dispose,
    wait,
    waitAny,
  };
}
