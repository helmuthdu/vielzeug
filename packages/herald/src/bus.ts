import { warn } from './_dev';
import { BusDisposedError } from './errors';
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

// Module-scoped noop: shared across all bus instances to avoid per-bus allocation.
const noop = () => {};

type Entry = { fn: Listener<unknown>; unsub: () => void };
type WildcardEntry = { fn: (event: string, payload: unknown) => void; unsub: () => void };

export function createBus<T extends EventMap = Record<string, unknown>>(options?: BusOptions): Bus<T> {
  const listeners = new Map<string, Set<Entry>>();
  const wildcards = new Set<WildcardEntry>();
  const tappers = new Set<(event: HeraldEvent<T>) => void>();
  const disposeController = new AbortController();
  const busName = options?.name;
  const maxListeners = options?.maxListeners;
  const busTag = busName ? ` (${busName})` : '';

  function emitTap(event: HeraldEvent<T>): void {
    for (const tapper of tappers) {
      try {
        tapper(event);
      } catch {
        // Observability must not affect bus behavior.
      }
    }
  }

  function subscriptionSignal(signal?: AbortSignal): AbortSignal {
    return signal ? AbortSignal.any([disposeController.signal, signal]) : disposeController.signal;
  }

  function register<E extends { unsub: () => void }>(
    container: Set<E>,
    makeEntry: (unsub: () => void) => E,
    signal: AbortSignal,
    label: string,
    tapEvents: { readonly subscribe: HeraldEvent<T>; readonly unsubscribe: HeraldEvent<T> },
  ): Unsubscribe {
    if (signal.aborted) return noop;

    let called = false;

    function unsub(): void {
      if (called) return;

      called = true;
      container.delete(entry);
      signal.removeEventListener('abort', unsub);
      emitTap(tapEvents.unsubscribe);
    }

    const entry = makeEntry(unsub);

    container.add(entry);
    signal.addEventListener('abort', unsub, { once: true });
    emitTap(tapEvents.subscribe);

    if (maxListeners !== undefined && container.size > maxListeners) {
      warn(
        `${label} has ${container.size} listeners, exceeding maxListeners (${maxListeners}). Possible memory leak.${busTag}`,
      );
    }

    return unsub;
  }

  function onScoped<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal: AbortSignal): Unsubscribe {
    let set = listeners.get(event);

    if (!set) {
      set = new Set();
      listeners.set(event, set);
    }

    return register(set, (unsub) => ({ fn: listener as Listener<unknown>, unsub }), signal, `on("${event}")`, {
      subscribe: { event, type: 'subscribe' },
      unsubscribe: { event, type: 'unsubscribe' },
    });
  }

  function onAnyScoped(listener: (event: EventKey<T>, payload: unknown) => void, signal: AbortSignal): Unsubscribe {
    return register(
      wildcards,
      (unsub) => ({ fn: listener as (event: string, payload: unknown) => void, unsub }),
      signal,
      'onAny',
      {
        subscribe: { type: 'subscribe-any' },
        unsubscribe: { type: 'unsubscribe-any' },
      },
    );
  }

  // The wrapper calls `unsub` only when the listener runs, which is always after the
  // assignment completed; no indirection object is needed.
  function onceScoped<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal: AbortSignal): Unsubscribe {
    const unsub = onScoped(
      event,
      (payload) => {
        unsub();
        listener(payload);
      },
      signal,
    );

    return unsub;
  }

  function on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, opts?: SubscribeOptions): Unsubscribe {
    return onScoped(event, listener, subscriptionSignal(opts?.signal));
  }

  function once<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, opts?: SubscribeOptions): Unsubscribe {
    return onceScoped(event, listener, subscriptionSignal(opts?.signal));
  }

  function onAny(listener: (event: EventKey<T>, payload: unknown) => void, opts?: SubscribeOptions): Unsubscribe {
    return onAnyScoped(listener, subscriptionSignal(opts?.signal));
  }

  // `signal` must already combine bus disposal with any caller-provided signal.
  function waitScoped<K extends EventKey<T>>(event: K, signal: AbortSignal): Promise<T[K]> {
    if (signal.aborted) return Promise.reject(signal.reason);

    return new Promise<T[K]>((resolve, reject) => {
      const onAbort = (): void => {
        reject(signal.reason);
      };

      onceScoped(
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

  function wait<K extends EventKey<T>>(event: K, opts?: SubscribeOptions): Promise<T[K]> {
    return waitScoped(event, subscriptionSignal(opts?.signal));
  }

  function waitAny<const K extends readonly EventKey<T>[]>(
    eventList: K,
    opts?: SubscribeOptions,
  ): Promise<WaitAnyResult<T, K>> {
    if (eventList.length === 0) {
      throw new TypeError('waitAny() requires at least one event name');
    }

    // One-shot `wait()` per event sharing one signal: an internal controller aborts the
    // loser subscriptions once one resolves, and `Promise.race` provides the settled-once
    // winner/loser semantics, rejection with the composite signal's reason included.
    const raceController = new AbortController();
    const raceSignal = AbortSignal.any([subscriptionSignal(opts?.signal), raceController.signal]);
    const waiters = eventList.map((event) => waitScoped(event, raceSignal).then((payload) => ({ event, payload })));

    // Losers reject through the cleanup abort: keep every rejection observed.
    for (const waiter of waiters) waiter.catch(noop);

    return Promise.race(waiters).then((result) => {
      raceController.abort();
      return result as WaitAnyResult<T, K>;
    });
  }

  function dispatch(event: EventKey<T>, payload: unknown): void {
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

  // Empty sets stay in `listeners` after their last listener leaves (removing them eagerly
  // on unsubscribe is what previously corrupted re-registered listeners); filter here instead.
  function eventNames(): EventKey<T>[] {
    const active: EventKey<T>[] = [];

    for (const [event, set] of listeners) {
      if (set.size > 0) active.push(event as EventKey<T>);
    }

    return active;
  }

  function tap(handler: (event: HeraldEvent<T>) => void, opts?: SubscribeOptions): Unsubscribe {
    const signal = subscriptionSignal(opts?.signal);

    if (signal.aborted) return noop;

    tappers.add(handler);

    const onAbort = (): void => {
      tappers.delete(handler);
    };

    signal.addEventListener('abort', onAbort, { once: true });

    return () => {
      tappers.delete(handler);
      signal.removeEventListener('abort', onAbort);
    };
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
