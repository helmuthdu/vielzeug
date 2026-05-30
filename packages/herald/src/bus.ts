import type { Bus, BusOptions, EventKey, EventMap, Listener, WaitAnyResult } from './types';

export class BusDisposedError extends Error {
  override name = 'BusDisposedError';
  constructor() {
    super('Bus is disposed');
  }
}

// Module-scoped noop — shared across all bus instances to avoid per-bus allocation.
const noop = () => {};

// Each registration gets a unique Entry object, allowing the same listener function
// to be registered multiple times independently (aligns with Node EventEmitter / mitt).
type Entry = { fn: Listener<unknown>; unsub: () => void };

export function createBus<T extends EventMap>(options?: BusOptions<T>): Bus<T> {
  // Per-event set of Entry objects. Set identity prevents accidental dedup of entries;
  // the same fn can appear in multiple entries with independent lifetimes.
  const listeners = new Map<string, Set<Entry>>();
  const disposeController = new AbortController();
  const debug = options?.debug ?? false;

  function mergeSignal(signal?: AbortSignal): AbortSignal {
    return signal ? AbortSignal.any([disposeController.signal, signal]) : disposeController.signal;
  }

  function onWithSignal<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal: AbortSignal): () => void {
    if (signal.aborted) return noop;

    let set = listeners.get(event);

    if (!set) {
      set = new Set();
      listeners.set(event, set);
    }

    // Capture the set reference so unsub can safely delete from it even after
    // the event key has been removed from the outer map.
    const capturedSet = set;

    // Boolean guard makes unsub idempotent without relying on set.size — a second
    // call after re-registration would otherwise see an empty capturedSet and
    // incorrectly delete the newly created event key from the outer map.
    let called = false;

    function unsub() {
      if (called) return;

      called = true;
      capturedSet.delete(entry);

      if (capturedSet.size === 0) listeners.delete(event);

      signal.removeEventListener('abort', unsub);

      if (debug) console.debug(`[herald:sub] off("${event}") — ${capturedSet.size} listener(s) remaining`);
    }

    // Function declaration is hoisted, so `entry` can reference `unsub` directly.
    // No placeholder needed.
    const entry: Entry = { fn: listener as Listener<unknown>, unsub };

    set.add(entry);
    signal.addEventListener('abort', unsub, { once: true });

    if (debug) console.debug(`[herald:sub] on("${event}") — ${set.size} listener(s)`);

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

  // Inner generator — receives already-validated maxBuffer from the public events() wrapper.
  async function* eventsGenerator<K extends EventKey<T>>(
    event: K,
    maxBuffer: number,
    signal: AbortSignal | undefined,
  ): AsyncGenerator<T[K]> {
    const activeSignal = mergeSignal(signal);

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

  // Public events() — validates maxBuffer synchronously so callers get an immediate
  // RangeError at call time rather than on the first .next() iteration.
  function events<K extends EventKey<T>>(
    event: K,
    opts?: { maxBuffer?: number; signal?: AbortSignal },
  ): AsyncGenerator<T[K]> {
    const maxBuffer = opts?.maxBuffer ?? Infinity;

    if (maxBuffer <= 0) throw new RangeError('maxBuffer must be a positive number');

    return eventsGenerator(event, maxBuffer, opts?.signal);
  }

  function emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): void {
    if (disposeController.signal.aborted) return;

    const payload = (args as unknown[])[0];

    const set = listeners.get(event);

    // Log before onDispatch so debug output announces the emit first.
    if (debug) console.debug(`[herald:emit] emit("${event}") — ${set?.size ?? 0} listener(s)`);

    options?.onDispatch?.(event, payload as T[K]);

    if (!set?.size) return;

    for (const entry of [...set]) {
      try {
        entry.fn(payload);
      } catch (err) {
        if (options?.onError) options.onError(err, event, payload as T[K]);
        else throw err;
      }
    }
  }

  function listenerCount(event?: EventKey<T>): number {
    if (event !== undefined) return listeners.get(event)?.size ?? 0;

    let total = 0;

    for (const set of listeners.values()) total += set.size;

    return total;
  }

  function removeAllListeners(event?: EventKey<T>): void {
    if (event !== undefined) {
      const set = listeners.get(event);

      if (set) {
        for (const entry of [...set]) entry.unsub();
      }
    } else {
      for (const set of [...listeners.values()]) {
        for (const entry of [...set]) entry.unsub();
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

    if (debug) console.debug('[herald:lifecycle] dispose()');

    disposeController.abort(new BusDisposedError());
    // disposeController.abort() fires all unsub handlers synchronously, which
    // removes every entry and deletes empty keys. By here listeners is already
    // empty. clear() is a cheap defensive measure against any future code path
    // that bypasses the signal (e.g. a direct listeners.set() before a guard).
    listeners.clear();
  }

  return {
    get disposalSignal() {
      return disposeController.signal;
    },
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
