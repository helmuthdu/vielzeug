import type {
  Bus,
  BusOptions,
  EmissionErrorContext,
  EventKey,
  EventMap,
  EventStream,
  Listener,
  SubscribeOptions,
  Unsubscribe,
  WaitAnyResult,
} from './types';

export class BusDisposedError extends Error {
  override name = 'BusDisposedError';
  constructor() {
    super('Bus is disposed');
  }
}

// Module-scoped noop — shared across all bus instances to avoid per-bus allocation.
const noop = () => {};

/**
 * Returns a signal that aborts as soon as either `a` or `b` aborts.
 * If only `a` is provided, returns `a` directly.
 * Registers and cleans up its own event listeners — no leaks when neither signal fires.
 *
 * @example
 * const signal = combineSignals(timeoutSignal, bus.disposalSignal);
 * bus.on('event', handler, { signal });
 */
export function combineSignals(a: AbortSignal, b?: AbortSignal): AbortSignal {
  if (!b) return a;

  if (a.aborted) return a;

  if (b.aborted) return b;

  const ctrl = new AbortController();
  const onA = (): void => ctrl.abort(a.reason);
  const onB = (): void => ctrl.abort(b.reason);

  a.addEventListener('abort', onA, { once: true });
  b.addEventListener('abort', onB, { once: true });
  ctrl.signal.addEventListener(
    'abort',
    () => {
      a.removeEventListener('abort', onA);
      b.removeEventListener('abort', onB);
    },
    { once: true },
  );

  return ctrl.signal;
}

// Each registration gets a unique Entry object, allowing the same listener function
// to be registered multiple times independently (aligns with Node EventEmitter / mitt).
type Entry = { fn: Listener<unknown>; unsub: () => void };
type WildcardEntry = { fn: (event: string, payload: unknown) => void; unsub: () => void };

type RegisterEntryOpts = { offLog: string; onLog: string; onRemove?: () => void };

// makeEventStream wraps a generator with AsyncDisposable + filter/map operators.
// Module-scoped (not inside createBus) — no per-emit allocation.
function makeEventStream<V>(gen: AsyncGenerator<V>, onDispose: () => Promise<void>): EventStream<V> {
  // filter and map create derived generators that iterate `gen`. Disposing the parent (via
  // onDispose) cascades to close derived generators through the for-await protocol: when gen
  // receives a done result, the for-await loop inside the derived generator exits normally.
  const filterFn = (pred: (v: V) => boolean): EventStream<V> => {
    async function* fg(): AsyncGenerator<V> {
      for await (const value of gen) {
        if (pred(value)) yield value;
      }
    }

    return makeEventStream(fg(), onDispose);
  };

  const mapFn = <U>(fn: (v: V) => U): EventStream<U> => {
    async function* mg(): AsyncGenerator<U> {
      for await (const value of gen) {
        yield fn(value);
      }
    }

    return makeEventStream<U>(mg(), onDispose);
  };

  return Object.assign(gen, {
    filter: filterFn as EventStream<V>['filter'],
    map: mapFn,
    [Symbol.asyncDispose]: onDispose,
  }) as unknown as EventStream<V>;
}

export function createBus<T extends EventMap>(options?: BusOptions<T>): Bus<T> {
  // Per-event set of Entry objects. Set identity prevents accidental dedup of entries;
  // the same fn can appear in multiple entries with independent lifetimes.
  const listeners = new Map<string, Set<Entry>>();
  const wildcards = new Set<WildcardEntry>();
  const disposeController = new AbortController();
  const maxListeners = options?.maxListeners;
  const logDebug = options?.logger?.debug;
  const hasLogger = options?.logger !== undefined;
  const logWarn = options?.logger?.warn ?? (hasLogger ? undefined : (msg: string) => console.warn(msg));

  function mergeSignal(signal?: AbortSignal): AbortSignal {
    return combineSignals(disposeController.signal, signal);
  }

  // callSafe is defined once per bus (not per emit) — avoids re-allocating on every emission.
  // Captures options.onError via closure. Used in emit() for both specific and wildcard loops.
  function callSafe(fn: () => void, event: EventKey<T>, payload: unknown, timestamp: number): void {
    try {
      fn();
    } catch (err) {
      if (options?.onError) {
        options.onError({ err, event, payload, timestamp } as EmissionErrorContext<T>);
      } else {
        throw err;
      }
    }
  }

  // registerEntry opts object — self-documenting call sites.
  function registerEntry<E extends { unsub: () => void }>(
    container: Set<E>,
    makeEntry: (unsub: () => void) => E,
    signal: AbortSignal,
    { offLog, onLog, onRemove }: RegisterEntryOpts,
  ): () => void {
    if (signal.aborted) return noop;

    // Boolean guard makes unsub idempotent — a second call after re-registration would
    // otherwise see an empty container and incorrectly delete the outer map entry.
    let called = false;

    function unsub() {
      if (called) return;

      called = true;
      container.delete(entry);
      onRemove?.();
      signal.removeEventListener('abort', unsub);

      logDebug?.(`[herald:sub] ${offLog} — ${container.size} listener(s) remaining`);
    }

    // Function declaration is hoisted so `entry` can reference `unsub` directly.
    const entry = makeEntry(unsub);

    container.add(entry);
    signal.addEventListener('abort', unsub, { once: true });

    logDebug?.(`[herald:sub] ${onLog} — ${container.size} listener(s)`);

    if (maxListeners !== undefined && container.size > maxListeners) {
      logWarn?.(
        `[herald:warn] ${onLog} has ${container.size} listeners, exceeding maxListeners (${maxListeners}). Possible memory leak.`,
      );
    }

    return unsub;
  }

  function onWithSignal<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal: AbortSignal): () => void {
    let set = listeners.get(event);

    if (!set) {
      set = new Set();
      listeners.set(event, set);
    }

    // Capture the set reference so unsub can safely delete from it even after
    // the event key has been removed from the outer map.
    const capturedSet = set;

    return registerEntry(capturedSet, (unsub) => ({ fn: listener as Listener<unknown>, unsub }), signal, {
      offLog: `off("${event}")`,
      onLog: `on("${event}")`,
      onRemove: () => {
        if (capturedSet.size === 0) listeners.delete(event);
      },
    });
  }

  function onAnyWithSignal(listener: (event: EventKey<T>, payload: unknown) => void, signal: AbortSignal): () => void {
    return registerEntry(
      wildcards,
      (unsub) => ({ fn: listener as (event: string, payload: unknown) => void, unsub }),
      signal,
      { offLog: 'onAny off', onLog: 'onAny' },
    );
  }

  // Use a const ref object to hold the unsub handle — avoids the forward-reference that
  // TypeScript cannot prove safe with `const unsub = f(() => unsub)`. The `ref` binding never
  // changes (only its property is mutated), satisfying prefer-const. By the time the inner
  // callback fires (only possible after onWithSignal returns), ref.unsub is the real handle.
  function onceWithSignal<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal: AbortSignal): () => void {
    const ref = { unsub: noop as Unsubscribe };

    ref.unsub = onWithSignal(
      event,
      (payload) => {
        ref.unsub();
        listener(payload);
      },
      signal,
    );

    return ref.unsub;
  }

  // onAny with once — fires the wildcard listener exactly once, then auto-removes.
  function onAnyWithOnce(listener: (event: EventKey<T>, payload: unknown) => void, signal: AbortSignal): () => void {
    const ref = { unsub: noop as Unsubscribe };

    ref.unsub = onAnyWithSignal((event, payload) => {
      ref.unsub();
      listener(event, payload);
    }, signal);

    return ref.unsub;
  }

  function on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, opts?: SubscribeOptions): () => void {
    const signal = mergeSignal(opts?.signal);

    if (opts?.once) return onceWithSignal(event, listener, signal);

    return onWithSignal(event, listener, signal);
  }

  // once() and onAny() take an options object — consistent with on(), extensible for future options.
  function once<K extends EventKey<T>>(
    event: K,
    listener: Listener<T[K]>,
    opts?: { signal?: AbortSignal },
  ): () => void {
    return onceWithSignal(event, listener, mergeSignal(opts?.signal));
  }

  function onAny(listener: (event: EventKey<T>, payload: unknown) => void, opts?: SubscribeOptions): () => void {
    const signal = mergeSignal(opts?.signal);

    if (opts?.once) return onAnyWithOnce(listener, signal);

    return onAnyWithSignal(listener, signal);
  }

  function wait<K extends EventKey<T>>(event: K, opts?: { signal?: AbortSignal }): Promise<T[K]> {
    const activeSignal = mergeSignal(opts?.signal);

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

  // events() subscribes eagerly — the listener is registered when events() is called, not when
  // the first .next() runs. This ensures events emitted before iteration begins are buffered.
  // maxBuffer is validated synchronously so callers get a RangeError at call time.
  function events<K extends EventKey<T>>(
    event: K,
    opts?: { maxBuffer?: number; signal?: AbortSignal },
  ): EventStream<T[K]> {
    const maxBuffer = opts?.maxBuffer ?? Infinity;

    if (maxBuffer <= 0) throw new RangeError('maxBuffer must be a positive number');

    const activeSignal = mergeSignal(opts?.signal);

    if (activeSignal.aborted) {
      const empty = (async function* (): AsyncGenerator<T[K]> {})();

      return makeEventStream(empty, async (): Promise<void> => {});
    }

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

    async function* generate(): AsyncGenerator<T[K]> {
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

    const gen = generate();

    // Symbol.asyncDispose calls unsub() directly because gen.return() only runs the finally
    // block when the generator has been started (at least one next() call). The unsub guard
    // (called = false in registerEntry) makes this idempotent.
    return makeEventStream(gen, async (): Promise<void> => {
      unsub();
      await gen.return(undefined as T[K]);
    });
  }

  // dispatch is defined at createBus() scope (once per bus, not per emit call) — consistent with
  // callSafe. Receives event/payload/timestamp as arguments so it can be invoked from both the
  // direct path and the middleware chain without capturing per-emit locals in a closure.
  function dispatch(event: EventKey<T>, payload: unknown, timestamp: number): number {
    let count = 0;
    const set = listeners.get(event);

    if (set?.size) {
      for (const entry of [...set]) {
        callSafe(() => entry.fn(payload), event, payload, timestamp);
        count++;
      }
    }

    if (wildcards.size) {
      for (const entry of [...wildcards]) {
        callSafe(() => entry.fn(event, payload), event, payload, timestamp);
        count++;
      }
    }

    return count;
  }

  // emit() returns the number of listeners invoked (specific + wildcard).
  // Returns 0 if bus is disposed, middleware blocked dispatch, or validatePayload rejected.
  // validatePayload runs first, then middleware, then listeners.
  function emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): number {
    if (disposeController.signal.aborted) return 0;

    const payload = (args as unknown[])[0];
    const timestamp = Date.now();

    if (options?.validatePayload) {
      try {
        options.validatePayload(event, payload as T[K]);
      } catch (err) {
        if (options?.onError) {
          options.onError({ err, event, payload, timestamp } as EmissionErrorContext<T>);

          return 0;
        }

        throw err;
      }
    }

    if (logDebug) {
      const specific = listeners.get(event)?.size ?? 0;
      const wild = wildcards.size;

      logDebug(
        `[herald:emit] emit("${event}") — ${specific + wild} listener(s) (${specific} specific, ${wild} wildcard)`,
      );
    }

    // Middleware pipeline — each middleware calls next() to proceed.
    const middleware = options?.middleware;

    if (middleware?.length) {
      let dispatched = 0;
      let i = 0;

      function next(): void {
        if (i < middleware!.length) middleware![i++](event, payload, next);
        else dispatched = dispatch(event, payload, timestamp);
      }

      next();

      return dispatched;
    }

    return dispatch(event, payload, timestamp);
  }

  // listenerCount(event) includes wildcard listeners — they fire on every emission of that event.
  // listenerCount() (no arg) = sum(specific per event) + wildcards (wildcards counted once).
  function listenerCount(event?: EventKey<T>): number {
    if (event !== undefined) return (listeners.get(event)?.size ?? 0) + wildcards.size;

    let total = wildcards.size;

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

      for (const entry of [...wildcards]) entry.unsub();
    }
  }

  function eventNames(): EventKey<T>[] {
    return [...listeners.keys()] as EventKey<T>[];
  }

  function waitAny<K extends readonly [EventKey<T>, EventKey<T>, ...EventKey<T>[]]>(
    eventList: K,
    opts?: { signal?: AbortSignal },
  ): Promise<WaitAnyResult<T, K>> {
    const activeSignal = mergeSignal(opts?.signal);

    if (activeSignal.aborted) return Promise.reject(activeSignal.reason);

    return new Promise<WaitAnyResult<T, K>>((resolve, reject) => {
      const raceController = new AbortController();
      const raceSignal = combineSignals(activeSignal, raceController.signal);

      function onAbort() {
        raceController.abort();
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

    logDebug?.('[herald:lifecycle] dispose()');

    disposeController.abort(new BusDisposedError());
    // disposeController.abort() fires all unsub handlers synchronously, which
    // removes every entry and deletes empty keys. By here both maps are already
    // empty. clear() is a cheap defensive measure against any future code path
    // that bypasses the signal (e.g. a direct listeners.set() before a guard).
    listeners.clear();
    wildcards.clear();
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
    onAny,
    once,
    removeAllListeners,
    [Symbol.dispose]: dispose,
    wait,
    waitAny,
  };
}
