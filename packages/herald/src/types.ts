export type EventMap = Record<string, unknown>;
export type EventKey<T extends EventMap> = keyof T & string;
export type Listener<T> = (payload: T) => void;
export type Unsubscribe = () => void;

export type BusOptions<T extends EventMap = EventMap> = {
  /**
   * Enable debug-mode logging to `console.debug`.
   * Logs subscription registrations/removals, emissions, and disposal with `[herald:*]` prefixes.
   * For payload inspection, prefer the `onDispatch` hook instead.
   */
  debug?: boolean;
  /** Called on every emit, before listeners run. Useful for logging/tracing all dispatches. */
  onDispatch?: <K extends EventKey<T>>(event: K, payload: T[K]) => void;
  /** If provided, listener errors are forwarded here instead of re-thrown. */
  onError?: <K extends EventKey<T>>(err: unknown, event: K, payload: T[K]) => void;
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
   *
   * @example
   * // Stop piping when the target bus is disposed
   * source.on('event', handler, target.disposalSignal);
   */
  readonly disposalSignal: AbortSignal;
  /** Permanently dispose the bus — clears all listeners; pending waits are rejected. Idempotent. */
  dispose(): void;
  /** Whether the bus has been permanently disposed. */
  readonly disposed: boolean;
  /** Emit an event, calling all registered listeners synchronously. */
  emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): void;
  /** Returns the list of event names that currently have at least one active listener. */
  eventNames(): EventKey<T>[];
  /**
   * Async-iterate over all future emits of an event. Terminates when the bus is disposed or signal aborts.
   *
   * @remarks **First-yield timing:** The subscription starts on the first iteration (`.next()` call).
   * Events emitted between calling `events()` and the first `next()` are not observed. Call
   * `stream.next()` immediately after creating the generator to avoid missing events.
   *
   * @remarks **Buffer:** Internal buffer is unbounded by default. Pass `maxBuffer` to cap it — oldest
   * values are dropped when the buffer is full. Validation is synchronous: `maxBuffer ≤ 0` throws
   * `RangeError` at call time, before any iteration.
   */
  events<K extends EventKey<T>>(event: K, options?: { maxBuffer?: number; signal?: AbortSignal }): AsyncGenerator<T[K]>;
  /** Number of active listeners for a given event, or total for all events if omitted. */
  listenerCount(event?: EventKey<T>): number;
  /**
   * Subscribe to an event. Returns an unsubscribe function. Stops automatically when signal aborts.
   * The same listener function can be registered multiple times — each registration is independent
   * and receives its own unsubscribe handle.
   */
  on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): Unsubscribe;
  /** Subscribe once — auto-unsubscribes after the first emit. Stops early when signal aborts. */
  once<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): Unsubscribe;
  /** Remove all listeners for a specific event, or for all events if called without an argument. */
  removeAllListeners(event?: EventKey<T>): void;
  /** Resolve on the next emit. Rejects if the bus is disposed or signal aborts. */
  wait<K extends EventKey<T>>(event: K, signal?: AbortSignal): Promise<T[K]>;
  /**
   * Resolve when any of the listed events (minimum 2) fires first.
   * Returns a typed `{ event, payload }` discriminated union — the winning event name is narrowed to a literal.
   * Rejects if the bus is disposed or signal aborts before any event fires.
   */
  waitAny<const K extends readonly [EventKey<T>, EventKey<T>, ...EventKey<T>[]]>(
    events: K,
    signal?: AbortSignal,
  ): Promise<WaitAnyResult<T, K>>;
};
