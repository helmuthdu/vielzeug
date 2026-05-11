import type { Bus, BusOptions, EventKey, EventMap, Listener, WaitAnyResult } from './types';

export class BusDisposedError extends Error {
  override name = 'BusDisposedError';
  constructor() {
    super('Bus is disposed');
  }
}

export function createBus<T extends EventMap>(options?: BusOptions<T>): Bus<T> {
  const subs = new Map<string, Set<Listener<unknown>>>();
  const disposeController = new AbortController();
  const noop = () => {};

  function mergeSignal(signal?: AbortSignal): AbortSignal {
    return signal ? AbortSignal.any([disposeController.signal, signal]) : disposeController.signal;
  }

  function onWithSignal<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal: AbortSignal): () => void {
    if (signal.aborted) return noop;

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

      signal.removeEventListener('abort', unsub);
    }
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
      onceWithSignal(event, (payload) => resolve(payload), activeSignal);

      activeSignal.addEventListener('abort', () => reject(activeSignal.reason), { once: true });
    });
  }

  async function* events<K extends EventKey<T>>(event: K, signal?: AbortSignal): AsyncGenerator<T[K]> {
    const queue: T[K][] = [];
    let wake: (() => void) | undefined;
    const activeSignal = mergeSignal(signal);

    if (activeSignal.aborted) return;

    const unsub = onWithSignal(
      event,
      (payload) => {
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
    const payload = (args as unknown[])[0];

    const set = subs.get(event);

    if (!set?.size) return;

    options?.onDispatch?.(event, payload as T[K]);

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

  function removeAllListeners(event?: EventKey<T>): void {
    if (event !== undefined) {
      subs.delete(event);
    } else {
      subs.clear();
    }
  }

  function eventNames(): EventKey<T>[] {
    return [...subs.keys()] as EventKey<T>[];
  }

  function waitAny<K extends readonly EventKey<T>[]>(eventList: K, signal?: AbortSignal): Promise<WaitAnyResult<T, K>> {
    const activeSignal = mergeSignal(signal);

    if (activeSignal.aborted) return Promise.reject(activeSignal.reason);

    return new Promise<WaitAnyResult<T, K>>((resolve, reject) => {
      const raceController = new AbortController();
      const raceSignal = AbortSignal.any([activeSignal, raceController.signal]);

      activeSignal.addEventListener('abort', () => reject(activeSignal.reason), { once: true });

      for (const event of eventList) {
        onceWithSignal(
          event as EventKey<T>,
          (payload) => {
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
    subs.clear();
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
