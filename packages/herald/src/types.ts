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
   * Middleware functions run in order on every `emit()`, before `onDispatch` and listeners.
   * Each receives `(event, payload, next)` — call `next()` to proceed, or omit to block dispatch.
   */
  middleware?: readonly Middleware<T>[];
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
  /**
   * Called on every emit before middleware and listeners. Throw to reject the payload.
   * On throw with `onError` configured, the error is forwarded and `emit()` returns 0.
   * On throw without `onError`, the error propagates to the `emit()` caller.
   */
  validatePayload?: (event: EventKey<T>, payload: unknown) => void;
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

/**
 * An `AsyncGenerator` extended with `AsyncDisposable` and chainable `filter` / `map` operators.
 * Returned by `bus.events()`.
 *
 * @remarks `filter` and `map` create a derived stream that reads from the same underlying
 * subscription. Cleanup (unsubscribing from the bus) happens when:
 * - The original `gen.return()` is called (e.g. `break` from `for await`), or
 * - `stream[Symbol.asyncDispose]()` is called (e.g. `await using`).
 *
 * @example
 * for await (const n of bus.events('count').filter(n => n > 0).map(n => n * 2)) { ... }
 *
 * @example
 * await using evens = bus.events('count').filter(n => n % 2 === 0);
 * for await (const n of evens) { ... } // subscription cleaned up automatically
 *
 * @remarks **Sibling streams:** Calling `.filter()` or `.map()` on the same base stream twice creates
 * sibling streams that share the same underlying subscription and disposal handle. Disposing one sibling
 * terminates the shared subscription and closes the other. For independent lifecycles, call
 * `bus.events()` separately for each stream.
 */
export type EventStream<T> = AsyncGenerator<T> &
  AsyncDisposable & {
    filter<U extends T>(pred: (value: T) => value is U): EventStream<U>;
    filter(pred: (value: T) => boolean): EventStream<T>;
    map<U>(fn: (value: T) => U): EventStream<U>;
  };

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
   *
   * @remarks **Operators:** Chain `.filter()` and `.map()` to transform the stream without a
   * separate iteration loop.
   */
  events<K extends EventKey<T>>(event: K, options?: { maxBuffer?: number; signal?: AbortSignal }): EventStream<T[K]>;
  /**
   * Number of active listeners for a given event — including wildcard (`onAny`) listeners that
   * will fire for every emission of that event. When called without an argument, returns the total
   * across all events (each wildcard counted once).
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
  wait<K extends EventKey<T>>(event: K, opts?: { signal?: AbortSignal }): Promise<T[K]>;
  /**
   * Resolve when any of the listed events (minimum 2) fires first.
   * Returns a typed `{ event, payload }` discriminated union — the winning event name is narrowed to a literal.
   * Rejects if the bus is disposed or signal aborts before any event fires.
   */
  waitAny<const K extends readonly [EventKey<T>, EventKey<T>, ...EventKey<T>[]]>(
    events: K,
    opts?: { signal?: AbortSignal },
  ): Promise<WaitAnyResult<T, K>>;
};

/** Map of event names to their initial values for `createBehaviorBus`. */
export type BehaviorInitial<T extends EventMap> = {
  [K in EventKey<T>]?: T[K];
};

/** Options for `createBehaviorBus` — extends standard `BusOptions` with replay configuration. */
export type BehaviorBusOptions<T extends EventMap = EventMap> = BusOptions<T> & {
  /**
   * Number of most-recent emitted values to replay to new subscribers via `on()` or `once()`.
   * Defaults to `1` (last value only). Set to a higher number to replay a window of history.
   * `events()`, `wait()`, and `waitAny()` are not affected.
   */
  replay?: number;
};

/**
 * A bus that remembers the last emitted value(s) for each event.
 * New subscribers immediately receive current value(s) via `on()` and `once()`.
 */
export type BehaviorBus<T extends EventMap> = Bus<T> & {
  /**
   * Returns the most recently emitted value for the given event, or `undefined` if no value has
   * been emitted yet (and no initial value was provided).
   */
  current<K extends EventKey<T>>(event: K): T[K] | undefined;
};
