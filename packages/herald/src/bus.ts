import { warn as _internalWarn } from './_dev';
import { BusDisposedError, HeraldConfigError } from './errors';
import type {
  Bus,
  BusOptions,
  EventKey,
  EventMap,
  HeraldEvent,
  Listener,
  SubscribeOptions,
  Unsubscribe,
  WaitAnyResult,
} from './types';

// Module-scoped noop — shared across all bus instances to avoid per-bus allocation.
/** @internal */
export const noop = () => {};

type Entry = { fn: Listener<unknown>; unsub: () => void };
type WildcardEntry = { fn: (event: string, payload: unknown) => void; unsub: () => void };

type RegisterEntryOpts<T extends EventMap> = {
  event?: EventKey<T>;
  onLog: string;
  onRemove?: () => void;
  wildcard?: boolean;
};

export function createBus<T extends EventMap = Record<string, unknown>>(options?: BusOptions<T>): Bus<T> {
  const listeners = new Map<string, Set<Entry>>();
  const wildcards = new Set<WildcardEntry>();
  const tappers = new Set<(event: HeraldEvent<T>) => void>();
  const disposeController = new AbortController();
  const busName = options?.name;
  const maxListeners = options?.maxListeners;
  const busTag = busName ? ` (${busName})` : '';

  function emitTap(event: HeraldEvent<T>): void {
    if (tappers.size === 0) return;
    for (const tapper of tappers) {
      try {
        tapper(event);
      } catch {
        // Observability must not affect bus behavior.
      }
    }
  }

  function doWarn(msg: string): void {
    _internalWarn(msg);
  }

  function createSubscriptionScope(signal?: AbortSignal): AbortSignal {
    return signal ? AbortSignal.any([disposeController.signal, signal]) : disposeController.signal;
  }

  function registerEntry<E extends { unsub: () => void }>(
    container: Set<E>,
    makeEntry: (unsub: () => void) => E,
    signal: AbortSignal,
    { event, onLog, onRemove, wildcard }: RegisterEntryOpts<T>,
  ): () => void {
    if (signal.aborted) return noop;

    let called = false;

    function unsub() {
      if (called) return;

      called = true;
      container.delete(entry);
      onRemove?.();
      signal.removeEventListener('abort', unsub);

      if (event !== undefined) emitTap({ event, type: 'unsubscribe' });
      else if (wildcard) emitTap({ type: 'unsubscribe-any' });
    }

    const entry = makeEntry(unsub);

    container.add(entry);
    signal.addEventListener('abort', unsub, { once: true });

    if (event !== undefined) emitTap({ event, type: 'subscribe' });
    else if (wildcard) emitTap({ type: 'subscribe-any' });

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

    const capturedSet = set;

    return registerEntry(capturedSet, (unsub) => ({ fn: listener as Listener<unknown>, unsub }), signal, {
      event,
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
      { onLog: 'onAny', onRemove, wildcard: true },
    );
  }

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
    const signal = createSubscriptionScope(opts?.signal);

    if (opts?.once) return onceWithSignal(event, listener, signal);

    return onWithSignal(event, listener, signal);
  }

  function once<K extends EventKey<T>>(
    event: K,
    listener: Listener<T[K]>,
    opts?: { signal?: AbortSignal },
  ): () => void {
    const signal = createSubscriptionScope(opts?.signal);

    return onceWithSignal(event, listener, signal);
  }

  function onAny(listener: (event: EventKey<T>, payload: unknown) => void, opts?: SubscribeOptions): () => void {
    const signal = createSubscriptionScope(opts?.signal);

    if (opts?.once) return onAnyWithOnce(listener, signal);

    return onAnyWithSignal(listener, signal);
  }

  function wait<K extends EventKey<T>>(event: K, opts?: { signal?: AbortSignal }): Promise<T[K]> {
    const signal = createSubscriptionScope(opts?.signal);

    if (signal.aborted) return Promise.reject(signal.reason);

    return new Promise<T[K]>((resolve, reject) => {
      const onAbort = () => {
        reject(signal.reason);
      };

      onceWithSignal(
        event,
        (payload) => {
          signal.removeEventListener('abort', onAbort);
          resolve(payload);
        },
        signal,
      );

      signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  function dispatch(event: EventKey<T>, payload: unknown): void {
    options?._onDispatch?.(event, payload);

    let count = 0;
    let firstError: { value: unknown } | undefined;
    const set = listeners.get(event);

    if (set?.size) {
      for (const entry of [...set]) {
        try {
          entry.fn(payload);
        } catch (err) {
          firstError ??= { value: err };
          emitTap({ error: err, event, type: 'error' });
        }

        count++;
      }
    }

    if (wildcards.size) {
      for (const entry of [...wildcards]) {
        try {
          entry.fn(event, payload);
        } catch (err) {
          firstError ??= { value: err };
          emitTap({ error: err, event, type: 'error' });
        }

        count++;
      }
    }

    emitTap({ event, listeners: count, payload, type: 'emit' });

    if (firstError) throw firstError.value;
  }

  function emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): void {
    if (disposeController.signal.aborted) return;

    const payload = (args as unknown[])[0];

    dispatch(event, payload);
  }

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

  function tap(handler: (event: HeraldEvent<T>) => void, opts?: { signal?: AbortSignal }): () => void {
    if (disposeController.signal.aborted) return noop;

    const signal = createSubscriptionScope(opts?.signal);

    if (signal.aborted) return noop;

    tappers.add(handler);

    const onAbort = () => tappers.delete(handler);

    signal.addEventListener('abort', onAbort, { once: true });

    return () => {
      tappers.delete(handler);
      signal.removeEventListener('abort', onAbort);
    };
  }

  function waitAny<K extends readonly [EventKey<T>, EventKey<T>, ...EventKey<T>[]]>(
    eventList: K,
    opts?: { signal?: AbortSignal },
  ): Promise<WaitAnyResult<T, K>> {
    if (eventList.length < 2) throw new HeraldConfigError('waitAny() requires at least 2 event keys');

    const activeSignal = createSubscriptionScope(opts?.signal);

    if (activeSignal.aborted) return Promise.reject(activeSignal.reason);

    return new Promise<WaitAnyResult<T, K>>((resolve, reject) => {
      const raceController = new AbortController();
      const raceSignal = AbortSignal.any([activeSignal, raceController.signal]);
      const unsubs: Unsubscribe[] = [];
      let settled = false;

      function cleanup(): void {
        activeSignal.removeEventListener('abort', onAbort);
        raceController.abort();
        for (const unsub of unsubs) unsub();
      }

      function onAbort(): void {
        if (settled) return;

        settled = true;
        cleanup();
        reject(activeSignal.reason);
      }

      activeSignal.addEventListener('abort', onAbort, { once: true });

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
            raceSignal,
          ),
        );
      }
    });
  }

  function dispose(): void {
    if (disposeController.signal.aborted) return;

    emitTap({ type: 'dispose' });
    disposeController.abort(new BusDisposedError(busName));
    listeners.clear();
    wildcards.clear();
    tappers.clear();
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
    listenerCount,
    on,
    onAny,
    once,
    [Symbol.dispose]: dispose,
    tap,
    wait,
    waitAny,
    wildcardCount,
  };
}
