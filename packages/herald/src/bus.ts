import { anySignal } from '@vielzeug/arsenal';

import type {
  Bus,
  BusOptions,
  EmissionErrorContext,
  EventKey,
  EventMap,
  Listener,
  PipeEntry,
  PipeableKey,
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

// Each registration gets a unique Entry object, allowing the same listener function
// to be registered multiple times independently (aligns with Node EventEmitter / mitt).
type Entry = { fn: Listener<unknown>; unsub: () => void };
type WildcardEntry = { fn: (event: string, payload: unknown) => void; unsub: () => void };

export function createBus<T extends EventMap>(options?: BusOptions<T>): Bus<T> {
  // Per-event set of Entry objects. Set identity prevents accidental dedup of entries;
  // the same fn can appear in multiple entries with independent lifetimes.
  const listeners = new Map<string, Set<Entry>>();
  const wildcards = new Set<WildcardEntry>();
  const disposeController = new AbortController();
  const debug = options?.debug ?? false;
  const maxListeners = options?.maxListeners;

  function mergeSignal(signal?: AbortSignal): AbortSignal {
    return anySignal(disposeController.signal, signal) ?? disposeController.signal;
  }

  // R1: Shared subscription lifecycle. Eliminates the 35-line duplication between onWithSignal and
  // onAnyWithSignal: idempotent-guard, entry insertion, signal wiring, debug logging, maxListeners.
  function registerEntry<E extends { unsub: () => void }>(
    container: Set<E>,
    makeEntry: (unsub: () => void) => E,
    signal: AbortSignal,
    onLog: string,
    offLog: string,
    onRemove?: () => void,
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

      if (debug) console.debug(`[herald:sub] ${offLog} — ${container.size} listener(s) remaining`);
    }

    // Function declaration is hoisted so `entry` can reference `unsub` directly.
    const entry = makeEntry(unsub);

    container.add(entry);
    signal.addEventListener('abort', unsub, { once: true });

    if (debug) console.debug(`[herald:sub] ${onLog} — ${container.size} listener(s)`);

    if (maxListeners !== undefined && container.size > maxListeners) {
      console.warn(
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

    return registerEntry(
      capturedSet,
      (unsub) => ({ fn: listener as Listener<unknown>, unsub }),
      signal,
      `on("${event}")`,
      `off("${event}")`,
      () => {
        if (capturedSet.size === 0) listeners.delete(event);
      },
    );
  }

  function onAnyWithSignal(listener: (event: EventKey<T>, payload: unknown) => void, signal: AbortSignal): () => void {
    return registerEntry(
      wildcards,
      (unsub) => ({ fn: listener as (event: string, payload: unknown) => void, unsub }),
      signal,
      'onAny',
      'onAny off',
    );
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

  function on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, opts?: SubscribeOptions): () => void {
    const signal = mergeSignal(opts?.signal);

    if (opts?.once) return onceWithSignal(event, listener, signal);

    return onWithSignal(event, listener, signal);
  }

  function once<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): () => void {
    return onceWithSignal(event, listener, mergeSignal(signal));
  }

  function onAny(listener: (event: EventKey<T>, payload: unknown) => void, signal?: AbortSignal): () => void {
    return onAnyWithSignal(listener, mergeSignal(signal));
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

  // events() subscribes eagerly — the listener is registered when events() is called, not when
  // the first .next() runs. This ensures events emitted before iteration begins are buffered.
  // maxBuffer is validated synchronously so callers get a RangeError at call time.
  function events<K extends EventKey<T>>(
    event: K,
    opts?: { maxBuffer?: number; signal?: AbortSignal },
  ): AsyncGenerator<T[K]> & AsyncDisposable {
    const maxBuffer = opts?.maxBuffer ?? Infinity;

    if (maxBuffer <= 0) throw new RangeError('maxBuffer must be a positive number');

    const activeSignal = mergeSignal(opts?.signal);

    if (activeSignal.aborted) {
      const empty = (async function* (): AsyncGenerator<T[K]> {})();

      return Object.assign(empty, { [Symbol.asyncDispose]: async (): Promise<void> => {} });
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

    // R5: Named function for readable stack traces instead of an anonymous IIFE.
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

    // R3: AsyncDisposable support — `await using stream = bus.events(...)` tears down cleanly.
    // unsub() is called directly here because gen.return() only runs the finally block when the
    // generator has been started (at least one next() call). The unsub guard makes it idempotent.
    return Object.assign(gen, {
      [Symbol.asyncDispose]: async (): Promise<void> => {
        unsub();
        await gen.return(undefined as unknown as T[K]);
      },
    });
  }

  function emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): void {
    if (disposeController.signal.aborted) return;

    const payload = (args as unknown[])[0];
    const timestamp = Date.now();

    const set = listeners.get(event);

    // R2: Include wildcard count so the total is never misleadingly 0 when only wildcards exist.
    if (debug) {
      const specific = set?.size ?? 0;
      const wild = wildcards.size;

      console.debug(
        `[herald:emit] emit("${event}") — ${specific + wild} listener(s) (${specific} specific, ${wild} wildcard)`,
      );
    }

    options?.onDispatch?.(event, payload);

    // R6: callSafe avoids duplicating try/catch/onError across specific and wildcard loops.
    // R4/F5: onError receives a structured EmissionErrorContext instead of positional args.
    function callSafe(fn: () => void): void {
      try {
        fn();
      } catch (err) {
        if (options?.onError) {
          const context: EmissionErrorContext<T> = { err, event, payload, timestamp };

          options.onError(context);
        } else {
          throw err;
        }
      }
    }

    if (set?.size) {
      for (const entry of [...set]) callSafe(() => entry.fn(payload));
    }

    // Wildcard listeners run after event-specific listeners
    if (wildcards.size) {
      for (const entry of [...wildcards]) callSafe(() => entry.fn(event, payload));
    }
  }

  function listenerCount(event?: EventKey<T>): number {
    if (event !== undefined) return listeners.get(event)?.size ?? 0;

    let total = 0;

    for (const set of listeners.values()) total += set.size;

    total += wildcards.size;

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
    signal?: AbortSignal,
  ): Promise<WaitAnyResult<T, K>> {
    const activeSignal = mergeSignal(signal);

    if (activeSignal.aborted) return Promise.reject(activeSignal.reason);

    return new Promise<WaitAnyResult<T, K>>((resolve, reject) => {
      const raceController = new AbortController();
      const raceSignal = anySignal(activeSignal, raceController.signal)!;

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

  // F1: pipe() as a first-class instance method — lets consumers pipe without importing pipeEvents.
  // Implemented inline to avoid circular imports (pipe.ts → bus.ts → pipe.ts).
  function pipe<U extends EventMap>(
    target: Bus<U>,
    entries: readonly [PipeEntry<T, U>, ...PipeEntry<T, U>[]],
    pipeSignalArg?: AbortSignal,
  ): Unsubscribe {
    // Stop when target disposes or when the caller's signal fires.
    const pipeSignal = anySignal(target.disposalSignal, pipeSignalArg) ?? target.disposalSignal;

    // Cast needed: emit's conditional rest args (void vs payload) cannot be resolved in a generic
    // context. At runtime, passing undefined for void events is safe — the bus ignores it.
    const emitTarget = target.emit as (event: EventKey<U>, payload?: unknown) => void;

    const unsubs = entries.map((entry) => {
      if (typeof entry === 'string') {
        const key = entry as PipeableKey<T, U>;

        return on(key as EventKey<T>, (payload) => emitTarget(key as unknown as EventKey<U>, payload), {
          signal: pipeSignal,
        });
      }

      const { from, to } = entry as { from: EventKey<T>; to: EventKey<U> };

      return on(from, (payload) => emitTarget(to, payload), { signal: pipeSignal });
    });

    return () => unsubs.forEach((u) => u());
  }

  function dispose(): void {
    if (disposeController.signal.aborted) return;

    if (debug) console.debug('[herald:lifecycle] dispose()');

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
    pipe,
    removeAllListeners,
    [Symbol.dispose]: dispose,
    wait,
    waitAny,
  };
}
