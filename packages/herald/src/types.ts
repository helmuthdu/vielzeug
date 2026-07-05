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

/**
 * A middleware function called in sequence during `emit()`, before any listeners run.
 * Call `next()` to continue the chain. Omitting `next()` prevents all listeners from running.
 *
 * @example
 * const rateLimit: Middleware<Events> = (event, payload, next) => {
 *   if (shouldAllow(event)) next();
 * };
 */
export type Middleware<T extends EventMap = EventMap> = (
  event: EventKey<T>,
  payload: unknown,
  next: () => void,
) => void;

/**
 * Custom logger injected via `BusOptions.logger`.
 * Both methods are optional — omit one to silence that level.
 */
export type BusLogger = {
  debug?: (msg: string) => void;
  warn?: (msg: string) => void;
};

export type BusOptions<T extends EventMap = EventMap> = {
  /**
   * Custom logger for `debug` and `warn` output.
   * Provide `logger.debug` to enable subscription/emission/disposal logging with `[herald:*]` prefixes.
   * Omit to disable all debug output. Pass `{}` to silence warnings too.
   *
   * Prefer `debugBus()` from `@vielzeug/herald/devtools` over wiring this manually — it passes
   * `console.debug` for you and is tree-shaken from production bundles.
   *
   * **Note:** Event key strings appear in log messages — do not encode sensitive data in event names.
   */
  logger?: BusLogger;
  /**
   * Warn when a single event's active listener count exceeds this threshold.
   * Output goes to `logger.warn` (default: `console.warn`).
   * Useful for detecting listener leaks during development. Default: no check.
   */
  maxListeners?: number;
  /**
   * Middleware functions run in order on every `emit()`, before listeners run.
   * Each receives `(event, payload, next)` — call `next()` to proceed, or omit to block dispatch.
   */
  middleware?: readonly Middleware<T>[];
  /**
   * Optional display name for this bus instance.
   * Appears in debug log prefixes and in `BusDisposedError` messages.
   * Useful when running multiple buses concurrently to identify which bus produced a log or error.
   *
   * **Note:** The name is embedded in `BusDisposedError` messages and debug logs — avoid using
   * sensitive or user-derived values that could leak via error trackers or log aggregators.
   */
  name?: string;
  /**
   * If provided, listener errors are forwarded here instead of re-thrown.
   * Receives a structured `EmissionErrorContext` with the error, event key, payload, and timestamp.
   *
   * **Note:** every registered listener (specific and wildcard) for an emission always runs,
   * regardless of `onError` — a throwing listener never prevents the rest from being called.
   */
  onError?: (context: EmissionErrorContext<T>) => void;
  /**
   * Called on every emit before middleware and listeners. Throw to reject the payload.
   * On throw with `onError` configured, the error is forwarded and `emit()` returns 0.
   * On throw without `onError`, the error propagates to the `emit()` caller.
   * Receives the typed payload — use it to perform runtime validation with full type information.
   */
  validatePayload?: <K extends EventKey<T>>(event: K, payload: T[K]) => void;
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
  PipeableKey<S, T> | { from: EventKey<S>; to: EventKey<T> };

/**
 * An `AsyncGenerator` extended with `AsyncDisposable`. Returned by `bus.events()`.
 *
 * Use `await using` for guaranteed cleanup, or call `[Symbol.asyncDispose]()` explicitly.
 * Compose with standard async-generator utilities (e.g. `for await` + `break`) or
 * user-space operators as needed.
 *
 * @example
 * await using stream = bus.events('count');
 * for await (const n of stream) { ... } // subscription cleaned up automatically
 */
export type EventStream<T> = AsyncGenerator<T> & AsyncDisposable;

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
  /**
   * Emit an event, calling all registered listeners synchronously.
   * Returns the total number of listeners that were invoked (specific + wildcard).
   * Returns `0` if the bus is disposed, if a middleware blocked dispatch, or if `validatePayload` rejected.
   *
   * @remarks **Listener throws:** every listener still runs even if an earlier one throws. Without
   * `onError` configured, the first thrown error is rethrown once every listener has been called —
   * it never short-circuits the rest of the broadcast. With `onError` configured, errors are
   * forwarded per-listener and `emit()` never throws for a listener failure.
   */
  emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [payload: T[K]]): number;
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
   * @remarks **Cleanup:** Returns an `EventStream` — use `await using` for guaranteed cleanup:
   * ```ts
   * await using stream = bus.events('event');
   * for await (const val of stream) { ... }
   * ```
   */
  events<K extends EventKey<T>>(event: K, options?: { maxBuffer?: number; signal?: AbortSignal }): EventStream<T[K]>;
  /**
   * Number of active specific-event listeners for a given event key.
   * Does not include wildcard (`onAny`) listeners — use `wildcardCount()` for those.
   * When called without an argument, returns the total across all specific-event listeners.
   */
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
   * receiving the event name and payload. Returns an unsubscribe function.
   *
   * - `opts.signal` — auto-unsubscribe when the signal aborts.
   * - `opts.once` — auto-unsubscribe after the first invocation.
   *
   * Useful for cross-cutting concerns like logging, analytics, and tracing.
   *
   * @example
   * bus.onAny((event, payload) => logger.debug('dispatched', { event, payload }));
   */
  onAny(listener: (event: EventKey<T>, payload: unknown) => void, opts?: SubscribeOptions): Unsubscribe;
  /**
   * Subscribe once — auto-unsubscribes after the first emit. Stops early when the signal aborts.
   * Convenience wrapper around `bus.on(event, listener, { once: true, signal: opts?.signal })`.
   */
  once<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, opts?: { signal?: AbortSignal }): Unsubscribe;
  /**
   * Resolve on the next emit of the given event.
   * Rejects with `BusDisposedError` if the bus is disposed before the event fires,
   * or with the signal's reason if the signal aborts.
   */
  wait<K extends EventKey<T>>(event: K, opts?: { signal?: AbortSignal }): Promise<T[K]>;
  /**
   * Resolve when any of the listed events (minimum 2) fires first.
   * Returns a typed `{ event, payload }` discriminated union — the winning event name is narrowed to a literal.
   * Rejects with `BusDisposedError` if the bus is disposed, or with the signal's reason if the signal aborts.
   */
  waitAny<const K extends readonly [EventKey<T>, EventKey<T>, ...EventKey<T>[]]>(
    events: K,
    opts?: { signal?: AbortSignal },
  ): Promise<WaitAnyResult<T, K>>;
  /**
   * Number of active wildcard (`onAny`) listeners.
   * These fire on every emission regardless of event key.
   */
  wildcardCount(): number;
};

/** Map of event names to their initial values for `createBehaviorBus`. */
export type BehaviorInitial<T extends EventMap> = {
  [K in EventKey<T>]?: T[K];
};

/** Options for `createBehaviorBus` — extends standard `BusOptions`. */
export type BehaviorBusOptions<T extends EventMap = EventMap> = BusOptions<T>;

/**
 * A bus that remembers the last emitted value for each event.
 * New subscribers immediately receive the current value via `on()` and `once()`.
 */
export type BehaviorBus<T extends EventMap> = Bus<T> & {
  /**
   * Returns the most recently emitted value for the given event, or `undefined` if no value has
   * been emitted yet (and no initial value was provided).
   */
  current<K extends EventKey<T>>(event: K): T[K] | undefined;
  /**
   * Clear the current value for a specific event, or for all events when called without arguments.
   * After reset, new subscribers will not receive a replayed value until the next emit.
   * Does not affect active subscriptions or the disposed state of the bus.
   *
   * @example
   * bus.reset('count');   // clear only 'count'
   * bus.reset();          // clear all buffers
   */
  reset(event?: EventKey<T>): void;
  /**
   * Returns a plain object snapshot of the most recently emitted value for every currently
   * buffered event. Events with no value in the buffer are omitted from the result.
   *
   * Useful for serialization, hydration, and debugging multiple channels at once.
   *
   * @example
   * const bus = createBehaviorBus<{ theme: string; zoom: number }>({ theme: 'light', zoom: 1 });
   * bus.snapshot(); // { theme: 'light', zoom: 1 }
   * bus.emit('theme', 'dark');
   * bus.snapshot(); // { theme: 'dark', zoom: 1 }
   */
  snapshot(): Partial<T>;
};
