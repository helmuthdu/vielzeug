import { warn as _internalWarn } from './_dev';
import { callSafely, type SafeCallResult } from './_safe';
import { BusDisposedError, HeraldConfigError } from './errors';
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

// Module-scoped noop — shared across all bus instances to avoid per-bus allocation.
// @internal — exported only for sibling internal modules; stripped from public declarations via stripInternal.
/** @internal */
export const noop = () => {};

/** @internal */
export type SignalScope = { dispose(): void; signal: AbortSignal };

/** @internal */
export function createSignalScope(...candidates: Array<AbortSignal | undefined>): SignalScope {
  const signals = candidates.filter((signal): signal is AbortSignal => signal !== undefined);

  if (signals.length === 1) return { dispose: noop, signal: signals[0]! };

  const aborted = signals.find((signal) => signal.aborted);

  if (aborted) return { dispose: noop, signal: aborted };

  const controller = new AbortController();
  const listeners = new Map<AbortSignal, () => void>();
  let disposed = false;

  function dispose(): void {
    if (disposed) return;

    disposed = true;
    for (const [signal, listener] of listeners) signal.removeEventListener('abort', listener);
    listeners.clear();
  }

  for (const signal of signals) {
    const listener = () => {
      controller.abort(signal.reason);
      dispose();
    };

    listeners.set(signal, listener);
    signal.addEventListener('abort', listener, { once: true });
  }

  return { dispose, signal: controller.signal };
}

/**
 * Returns a signal that aborts as soon as any provided signal aborts.
 * Input listeners remain active until one input aborts; use signal-owning APIs for early cleanup.
 */
export function combineSignals(first: AbortSignal, ...rest: AbortSignal[]): AbortSignal {
  return createSignalScope(first, ...rest).signal;
}

// Each registration gets a unique Entry object, allowing the same listener function
// to be registered multiple times independently (aligns with Node EventEmitter / mitt).
type Entry = { fn: Listener<unknown>; unsub: () => void };
type WildcardEntry = { fn: (event: string, payload: unknown) => void; unsub: () => void };

type RegisterEntryOpts = { offLog: string; onLog: string; onRemove?: () => void };

// makeEventStream wraps an AsyncGenerator with AsyncDisposable.
function makeEventStream<V>(gen: AsyncGenerator<V>, onDispose: () => Promise<void>): EventStream<V> {
  return Object.assign(gen, {
    [Symbol.asyncDispose]: onDispose,
  }) as unknown as EventStream<V>;
}

/** @internal */
export type InternalBusOptions<T extends EventMap> = BusOptions<T> & {
  /** @internal Called after middleware passes, before listeners run. Used by TestBus. */
  _onDispatch?: (event: EventKey<T>, payload: unknown) => void;
};

export function createBus<T extends EventMap = Record<string, unknown>>(options?: BusOptions<T>): Bus<T> {
  return createBusInternal(options);
}

/** @internal */
export function createBusInternal<T extends EventMap = Record<string, unknown>>(
  options?: InternalBusOptions<T>,
): Bus<T> {
  // Per-event set of Entry objects. Set identity prevents accidental dedup of entries;
  // the same fn can appear in multiple entries with independent lifetimes.
  const listeners = new Map<string, Set<Entry>>();
  const wildcards = new Set<WildcardEntry>();
  const disposeController = new AbortController();
  const busName = options?.name;
  const maxListeners = options?.maxListeners;
  const rawDebug = options?.logger?.debug;
  const logDebug = rawDebug && busName ? (msg: string) => rawDebug(`${msg} (${busName})`) : rawDebug;
  const hasLogger = options?.logger !== undefined;
  const customLogWarn = options?.logger?.warn;
  const busTag = busName ? ` (${busName})` : '';

  function doWarn(msg: string): void {
    if (customLogWarn) {
      customLogWarn(msg);
    } else if (!hasLogger) {
      _internalWarn(msg);
    }
  }

  function createSubscriptionScope(signal?: AbortSignal): SignalScope {
    return signal
      ? createSignalScope(disposeController.signal, signal)
      : { dispose: noop, signal: disposeController.signal };
  }

  // callSafe is defined once per bus (not per emit) — avoids re-allocating on every emission.
  // Captures options.onError via closure. Used in emit() for both specific and wildcard loops.
  // Does not rethrow directly — see dispatch(), which continues the broadcast to every remaining
  // listener (including wildcards) before rethrowing the first captured error, if any.
  function callSafe(fn: () => void, event: EventKey<T>, payload: unknown, timestamp: number): SafeCallResult {
    const onError = options?.onError
      ? (err: unknown) => options.onError?.({ err, event, payload, timestamp } as EmissionErrorContext<T>)
      : undefined;

    return callSafely(fn, onError);
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
      doWarn(
        `${onLog} has ${container.size} listeners, exceeding maxListeners (${maxListeners}). Possible memory leak.${busTag}`,
      );
    }

    return unsub;
  }

  function onWithSignal<K extends EventKey<T>>(
    event: K,
    listener: Listener<T[K]>,
    signal: AbortSignal,
    onRemove?: () => void,
  ): () => void {
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

        onRemove?.();
      },
    });
  }

  function onAnyWithSignal(
    listener: (event: EventKey<T>, payload: unknown) => void,
    signal: AbortSignal,
    onRemove?: () => void,
  ): () => void {
    return registerEntry(
      wildcards,
      (unsub) => ({ fn: listener as (event: string, payload: unknown) => void, unsub }),
      signal,
      { offLog: 'onAny off', onLog: 'onAny', onRemove },
    );
  }

  // Use a const ref object to hold the unsub handle — avoids the forward-reference that
  // TypeScript cannot prove safe with `const unsub = f(() => unsub)`. The `ref` binding never
  // changes (only its property is mutated), satisfying prefer-const. By the time the inner
  // callback fires (only possible after onWithSignal returns), ref.unsub is the real handle.
  function onceWithSignal<K extends EventKey<T>>(
    event: K,
    listener: Listener<T[K]>,
    signal: AbortSignal,
    onRemove?: () => void,
  ): () => void {
    const ref = { unsub: noop as Unsubscribe };

    ref.unsub = onWithSignal(
      event,
      (payload) => {
        ref.unsub();
        listener(payload);
      },
      signal,
      onRemove,
    );

    return ref.unsub;
  }

  // onAny with once — fires the wildcard listener exactly once, then auto-removes.
  function onAnyWithOnce(
    listener: (event: EventKey<T>, payload: unknown) => void,
    signal: AbortSignal,
    onRemove?: () => void,
  ): () => void {
    const ref = { unsub: noop as Unsubscribe };

    ref.unsub = onAnyWithSignal(
      (event, payload) => {
        ref.unsub();
        listener(event, payload);
      },
      signal,
      onRemove,
    );

    return ref.unsub;
  }

  function on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, opts?: SubscribeOptions): () => void {
    const scope = createSubscriptionScope(opts?.signal);

    if (opts?.once) return onceWithSignal(event, listener, scope.signal, scope.dispose);

    return onWithSignal(event, listener, scope.signal, scope.dispose);
  }

  function once<K extends EventKey<T>>(
    event: K,
    listener: Listener<T[K]>,
    opts?: { signal?: AbortSignal },
  ): () => void {
    const scope = createSubscriptionScope(opts?.signal);

    return onceWithSignal(event, listener, scope.signal, scope.dispose);
  }

  function onAny(listener: (event: EventKey<T>, payload: unknown) => void, opts?: SubscribeOptions): () => void {
    const scope = createSubscriptionScope(opts?.signal);

    if (opts?.once) return onAnyWithOnce(listener, scope.signal, scope.dispose);

    return onAnyWithSignal(listener, scope.signal, scope.dispose);
  }

  function wait<K extends EventKey<T>>(event: K, opts?: { signal?: AbortSignal }): Promise<T[K]> {
    const scope = createSubscriptionScope(opts?.signal);

    if (scope.signal.aborted) return Promise.reject(scope.signal.reason);

    return new Promise<T[K]>((resolve, reject) => {
      const onAbort = () => {
        scope.dispose();
        reject(scope.signal.reason);
      };

      onceWithSignal(
        event,
        (payload) => {
          scope.signal.removeEventListener('abort', onAbort);
          scope.dispose();
          resolve(payload);
        },
        scope.signal,
      );

      scope.signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  // events() subscribes eagerly — the listener is registered when events() is called, not when
  // the first .next() runs. This ensures events emitted before iteration begins are buffered.
  // maxBuffer is validated synchronously so callers get a HeraldConfigError at call time.
  function events<K extends EventKey<T>>(
    event: K,
    opts?: { maxBuffer?: number; signal?: AbortSignal },
  ): EventStream<T[K]> {
    const maxBuffer = opts?.maxBuffer ?? Infinity;

    if (!(maxBuffer > 0)) throw new HeraldConfigError('maxBuffer must be a positive number');

    const scope = createSubscriptionScope(opts?.signal);
    const activeSignal = scope.signal;

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
      scope.dispose,
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
      await gen.return(undefined as unknown as T[K]);
    });
  }

  // dispatch is defined at createBus() scope (once per bus, not per emit call) — consistent with
  // callSafe. Receives event/payload/timestamp as arguments so it can be invoked from both the
  // direct path and the middleware chain without capturing per-emit locals in a closure.
  function dispatch(event: EventKey<T>, payload: unknown, timestamp: number): number {
    options?._onDispatch?.(event, payload);

    let count = 0;
    // Only the first unforwarded error is kept — every listener still runs (see callSafe's
    // doc comment) — then it's rethrown once the whole broadcast (specific + wildcard) is done.
    let firstError: { err: unknown } | undefined;
    const set = listeners.get(event);

    if (set?.size) {
      for (const entry of [...set]) {
        const result = callSafe(() => entry.fn(payload), event, payload, timestamp);

        if (result.threw && !firstError) firstError = { err: result.err };

        count++;
      }
    }

    if (wildcards.size) {
      for (const entry of [...wildcards]) {
        const result = callSafe(() => entry.fn(event, payload), event, payload, timestamp);

        if (result.threw && !firstError) firstError = { err: result.err };

        count++;
      }
    }

    if (firstError) throw firstError.err;

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

    const middleware = options?.middleware;

    if (!middleware?.length) return dispatch(event, payload, timestamp);

    const middlewareList = middleware;

    function run(index: number): number {
      const current = middlewareList[index];

      if (!current) return dispatch(event, payload, timestamp);

      let result = 0;
      let continued = false;
      let synchronous = true;

      current(event, payload, () => {
        if (!synchronous || continued) return;

        continued = true;
        result = run(index + 1);
      });

      synchronous = false;

      return result;
    }

    return run(0);
  }

  // listenerCount counts specific-event listeners only.
  // wildcardCount() is the separate accessor for onAny listeners.
  function listenerCount(event?: EventKey<T>): number {
    if (event !== undefined) return listeners.get(event)?.size ?? 0;

    let total = 0;

    for (const set of listeners.values()) total += set.size;

    return total;
  }

  function wildcardCount(): number {
    return wildcards.size;
  }

  function eventNames(): EventKey<T>[] {
    return [...listeners.keys()] as EventKey<T>[];
  }

  function waitAny<K extends readonly [EventKey<T>, EventKey<T>, ...EventKey<T>[]]>(
    eventList: K,
    opts?: { signal?: AbortSignal },
  ): Promise<WaitAnyResult<T, K>> {
    if (eventList.length < 2) throw new HeraldConfigError('waitAny() requires at least 2 event keys');

    const activeScope = createSubscriptionScope(opts?.signal);

    if (activeScope.signal.aborted) return Promise.reject(activeScope.signal.reason);

    return new Promise<WaitAnyResult<T, K>>((resolve, reject) => {
      const raceController = new AbortController();
      const raceScope = createSignalScope(activeScope.signal, raceController.signal);
      const unsubs: Unsubscribe[] = [];
      let settled = false;

      function cleanup(): void {
        activeScope.signal.removeEventListener('abort', onAbort);
        raceController.abort();
        raceScope.dispose();
        activeScope.dispose();
        for (const unsub of unsubs) unsub();
      }

      function onAbort(): void {
        if (settled) return;

        settled = true;
        cleanup();
        reject(activeScope.signal.reason);
      }

      activeScope.signal.addEventListener('abort', onAbort, { once: true });

      for (const event of eventList) {
        unsubs.push(
          onceWithSignal(
            event as EventKey<T>,
            (payload) => {
              if (settled) return;

              settled = true;
              cleanup();
              resolve({ event, payload } as WaitAnyResult<T, K>);
            },
            raceScope.signal,
          ),
        );
      }
    });
  }

  function dispose(): void {
    if (disposeController.signal.aborted) return;

    logDebug?.('[herald:lifecycle] dispose()');

    disposeController.abort(new BusDisposedError(busName));
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
    [Symbol.dispose]: dispose,
    wait,
    waitAny,
    wildcardCount,
  };
}
