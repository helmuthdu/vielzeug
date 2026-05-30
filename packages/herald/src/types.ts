export type EventMap = Record<string, unknown>;
export type EventKey<T extends EventMap> = keyof T & string;
export type Listener<T> = (payload: T) => void;
export type Unsubscribe = () => void;

/**
 * Options for a single-event subscription. Passed as the third argument to `bus.on()`.
 * Both fields are optional and can be combined freely.
 */
export type SubscribeOptions = {
  /** Auto-remove the listener after its first invocation. Equivalent to calling `bus.once()`. */
  once?: boolean;
  /** Auto-remove the listener when this signal aborts. */
  signal?: AbortSignal;
};

/**
 * Context object passed to `BusOptions.onError` when a listener throws.
 * Provides structured access to the error, the triggering event, and a timestamp.
 */
export type EmissionErrorContext<T extends EventMap = EventMap> = {
  /** The thrown error value. */
  err: unknown;
  /** The event key that triggered the failing listener. */
  event: EventKey<T>;
  /** The payload that was passed to the failing listener. */
  payload: unknown;
  /** Timestamp (ms since epoch) captured at the moment `emit()` was called. */
  timestamp: number;
};

export type BusOptions<T extends EventMap = EventMap> = {
  /**
   * Enable debug-mode logging to `console.debug`.
   * Logs subscription registrations/removals, emissions, and disposal with `[herald:*]` prefixes.
   * For payload inspection, prefer the `onDispatch` hook or `onAny` instead.
   */
  debug?: boolean;
  /**
   * Warn via `console.warn` when a single event's active listener count exceeds this threshold.
   * Useful for detecting listener leaks during development. Default: no check.
   */
  maxListeners?: number;
  /**
   * Called on every emit, before listeners run. Useful for logging/tracing all dispatches.
   * `event` is the string event key; `payload` is `unknown` — runtime values, not narrowed generics.
   */
  onDispatch?: (event: EventKey<T>, payload: unknown) => void;
  /**
   * If provided, listener errors are forwarded here instead of re-thrown.
   * Receives a structured `EmissionErrorContext` with the error, event key, payload, and timestamp.
   */
  onError?: (context: EmissionErrorContext<T>) => void;
};

/** Discriminated-union result type for `waitAny`. */
export type WaitAnyResult<T extends EventMap, K extends readonly EventKey<T>[]> = {
  [I in keyof K]: K[I] extends EventKey<T> ? { event: K[I]; payload: T[K[I]] } : never;
}[number];

/**
 * Keys present in both `S` and `T` where `S[K]` is assignable to `T[K]`.
 * These keys can be forwarded from a source bus to a target bus without a type cast.
 */
export type PipeableKey<S extends EventMap, T extends EventMap> = {
  [K in EventKey<S> & EventKey<T>]: S[K] extends T[K] ? K : never;
}[EventKey<S> & EventKey<T>];

/**
 * A single pipe entry passed to `pipeEvents`:
 * - A `PipeableKey` string — forward the event under the same name.
 * - A `{ from, to }` object — forward the event under a different name on the target bus.
 */
export type PipeEntry<S extends EventMap, T extends EventMap> =
  | PipeableKey<S, T>
  | { from: EventKey<S>; to: EventKey<T> };

export type Bus<T extends EventMap> = {
  /** Alias for dispose() — enables the `using` keyword for automatic cleanup. */
  [Symbol.dispose](): void;
  /**
   * Signal that fires when the bus is disposed.
   * Use to tie other lifecycles (subscriptions, pipes, timers) to this bus's lifetime.
   *
   * @example
   * // Stop piping when the target bus is disposed
   * source.on('event', handler, { signal: target.disposalSignal });
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
   * @remarks **Eager subscription:** The subscription starts when `events()` is called, not when the
   * first iteration begins. Events emitted before the first `await` are buffered and will be yielded.
   *
   * @remarks **Buffer:** Internal buffer is unbounded by default. Pass `maxBuffer` to cap it — oldest
   * values are dropped when the buffer is full. Validation is synchronous: `maxBuffer ≤ 0` throws
   * `RangeError` at call time, before any iteration.
   *
   * @remarks **Cleanup:** Returns an `AsyncDisposable` — use `await using` for guaranteed cleanup:
   * ```ts
   * await using stream = bus.events('event');
   * for await (const val of stream) { ... }
   * ```
   */
  events<K extends EventKey<T>>(
    event: K,
    options?: { maxBuffer?: number; signal?: AbortSignal },
  ): AsyncGenerator<T[K]> & AsyncDisposable;
  /** Number of active listeners for a given event, or total (including `onAny` wildcards) if omitted. */
  listenerCount(event?: EventKey<T>): number;
  /**
   * Subscribe to an event. Returns an unsubscribe function.
   *
   * - `opts.signal` — auto-unsubscribe when the signal aborts.
   * - `opts.once` — auto-unsubscribe after the first invocation (equivalent to `bus.once()`).
   *
   * The same listener function can be registered multiple times — each registration is independent
   * and receives its own unsubscribe handle.
   */
  on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, opts?: SubscribeOptions): Unsubscribe;
  /**
   * Subscribe to **all** events. The listener is called after event-specific listeners on every emit,
   * receiving the event name and payload. Returns an unsubscribe function. Stops automatically when
   * signal aborts. Useful for cross-cutting concerns like logging, analytics, and tracing.
   *
   * @example
   * bus.onAny((event, payload) => logger.debug('dispatched', { event, payload }));
   */
  onAny(listener: (event: EventKey<T>, payload: unknown) => void, signal?: AbortSignal): Unsubscribe;
  /** Subscribe once — auto-unsubscribes after the first emit. Stops early when signal aborts. */
  once<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, signal?: AbortSignal): Unsubscribe;
  /**
   * Forward events from this bus to `target`. The pipe tears down when `target` is disposed
   * or when the optional `signal` aborts.
   *
   * Each entry is either a `PipeableKey` string (forward under the same name) or
   * a `{ from, to }` object (rename during forwarding).
   *
   * @example
   * const stop = bus.pipe(otherBus, ['count', { from: 'greet', to: 'hello' }]);
   * stop(); // manual teardown
   */
  pipe<U extends EventMap>(
    target: Bus<U>,
    entries: readonly [PipeEntry<T, U>, ...PipeEntry<T, U>[]],
    signal?: AbortSignal,
  ): Unsubscribe;
  /**
   * Remove all listeners for a specific event, or for all events (including `onAny` wildcards)
   * if called without an argument.
   */
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

/** Map of event names to their initial values for `createBehaviorBus`. */
export type BehaviorInitial<T extends EventMap> = {
  [K in EventKey<T>]?: T[K];
};

/**
 * A bus that remembers the last emitted value for each event.
 * New subscribers immediately receive the current value (if any) for the event they subscribe to.
 */
export type BehaviorBus<T extends EventMap> = Bus<T> & {
  /**
   * Returns the last emitted value for the given event, or `undefined` if no value has been
   * emitted yet (and no initial value was provided).
   */
  current<K extends EventKey<T>>(event: K): T[K] | undefined;
};
