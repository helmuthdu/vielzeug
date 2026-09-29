export type EventMap = object;
export type EventKey<T extends EventMap> = Extract<keyof T, string>;
export type Listener<T> = (payload: T) => void;
export type Unsubscribe = () => void;

/**
 * Options for a single-event subscription. Passed as the third argument to `bus.on()`.
 */
export type SubscribeOptions = {
  /** Auto-remove the listener when this signal aborts. */
  signal?: AbortSignal;
};

/**
 * Runtime events emitted by {@link Bus.tap}.
 * Subscribe via `bus.tap(handler)` — handler errors are swallowed.
 */
export type HeraldEvent<T extends EventMap = EventMap> =
  | { readonly event: EventKey<T>; readonly listeners: number; readonly payload: unknown; readonly type: 'emit' }
  | { readonly event: EventKey<T>; readonly type: 'subscribe' }
  | { readonly event: EventKey<T>; readonly type: 'unsubscribe' }
  | { readonly type: 'subscribe-any' }
  | { readonly type: 'unsubscribe-any' }
  | { readonly error: unknown; readonly event: EventKey<T>; readonly type: 'error' }
  | { readonly type: 'dispose' };

export type BusOptions = {
  /**
   * Warn when a single event's active listener count exceeds this threshold.
   * Useful for detecting listener leaks during development. Default: no check.
   */
  maxListeners?: number;
  /**
   * Optional display name for this bus instance.
   * Appears in `BusDisposedError` messages.
   */
  name?: string;
};

/** Discriminated-union result type for `waitAny`. */
export type WaitAnyResult<T extends EventMap, K extends readonly EventKey<T>[]> = {
  [I in keyof K]: K[I] extends EventKey<T> ? { event: K[I]; payload: T[K[I]] } : never;
}[number];

export type Bus<T extends EventMap> = {
  /** Alias for dispose() — enables the `using` keyword for automatic cleanup. */
  [Symbol.dispose](): void;
  /**
   * Signal that fires when the bus is disposed.
   * Use to tie other lifecycles (subscriptions, pipes, timers) to this bus's lifetime.
   */
  readonly disposalSignal: AbortSignal;
  /** Permanently dispose the bus — clears all listeners; pending waits are rejected. Idempotent. */
  dispose(): void;
  /** Whether the bus has been permanently disposed. */
  readonly disposed: boolean;
  /**
   * Emit an event, calling all registered listeners synchronously.
   * Returns `void`. Every listener runs even if an earlier one throws; listener errors are reported
   * through `tap` as `error` events, then the first error is rethrown after dispatch.
   */
  emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): void;
  /** Returns the list of event names that currently have at least one active listener. */
  eventNames(): EventKey<T>[];
  /**
   * Number of active specific-event listeners for a given event key.
   * Does not include wildcard (`onAny`) listeners — use `wildcardCount()` for those.
   * When called without an argument, returns the total across all specific-event listeners.
   */
  listenerCount(event?: EventKey<T>): number;
  /**
   * Subscribe to an event. Returns an unsubscribe function.
   * `opts.signal` auto-unsubscribes when the signal aborts.
   */
  on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, opts?: SubscribeOptions): Unsubscribe;
  /**
   * Subscribe to **all** events. The listener is called after event-specific listeners on every emit,
   * receiving the event name and payload. Returns an unsubscribe function.
   */
  onAny(listener: (event: EventKey<T>, payload: unknown) => void, opts?: SubscribeOptions): Unsubscribe;
  /**
   * Subscribe once — auto-unsubscribes after the first emit. Stops early when the signal aborts.
   */
  once<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, opts?: { signal?: AbortSignal }): Unsubscribe;
  /**
   * Resolve on the next emit of the given event.
   * Rejects with `BusDisposedError` if the bus is disposed before the event fires,
   * or with the signal's reason if the signal aborts.
   */
  wait<K extends EventKey<T>>(event: K, opts?: { signal?: AbortSignal }): Promise<T[K]>;
  /**
   * Resolve when any of the listed events fires first. Accepts one or more event keys.
   * Returns a typed `{ event, payload }` discriminated union.
   * Rejects with `BusDisposedError` if the bus is disposed, or with the signal's reason if the signal aborts.
   */
  waitAny<const K extends readonly EventKey<T>[]>(
    events: K,
    opts?: { signal?: AbortSignal },
  ): Promise<WaitAnyResult<T, K>>;
  /**
   * Number of active wildcard (`onAny`) listeners.
   */
  wildcardCount(): number;
  /**
   * Observe runtime events (emit, subscribe, unsubscribe, error, dispose) without
   * affecting bus behavior. Handler errors are swallowed. Returns an unsubscribe function.
   */
  tap(handler: (event: HeraldEvent<T>) => void, options?: { signal?: AbortSignal }): Unsubscribe;
};
