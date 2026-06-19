/** Cleanup / unsubscribe function returned by `subscribe()`. */
export type Unsubscribe = () => void;

/**
 * Observer passed to a producer or `subscribe()`.
 * `error` and `complete` are optional — omit them to ignore those signals.
 */
export type Observer<T> = {
  complete?: () => void;
  error?: (err: unknown) => void;
  next: (value: T) => void;
};

/**
 * Producer function passed to `flux()`.
 * Called once per `subscribe()` invocation (cold by default).
 * Return a cleanup function (or nothing) — it is called on unsubscribe.
 */
export type Producer<T> = (observer: Observer<T>) => Unsubscribe | void;

/**
 * A pipeable operator: a function that takes a source `Flux<A>` and returns a new `Flux<B>`.
 *
 * @example
 * const double: Operator<number, number> = (source) =>
 *   source.pipe(map((n) => n * 2));
 */
export type Operator<A = unknown, B = unknown> = (source: Flux<A>) => Flux<B>;

/** Options accepted by the `flux()` factory. Reserved for future use. */
export type FluxOptions = Record<never, never>;

/**
 * The core stream primitive. Lazy (cold) by default — each `subscribe()` invocation
 * starts its own producer. Use `.pipe(share())` to multicast to many subscribers.
 */
export interface Flux<T> {
  /** `true` after `dispose()` is called. New subscriptions are no-ops after disposal. */
  readonly disposed: boolean;
  /** AbortSignal that aborts when `dispose()` is called. */
  readonly disposalSignal: AbortSignal;
  /** Permanently terminates this stream and cancels all active subscriptions. */
  dispose(): void;
  /**
   * Apply one or more operators in sequence. Each operator receives the output
   * of the previous one as its input, forming a pipeline.
   */
  pipe<B>(op1: Operator<T, B>): Flux<B>;
  pipe<B, C>(op1: Operator<T, B>, op2: Operator<B, C>): Flux<C>;
  pipe<B, C, D>(op1: Operator<T, B>, op2: Operator<B, C>, op3: Operator<C, D>): Flux<D>;
  pipe<B, C, D, E>(op1: Operator<T, B>, op2: Operator<B, C>, op3: Operator<C, D>, op4: Operator<D, E>): Flux<E>;
  pipe(...operators: Operator[]): Flux<unknown>;
  /**
   * Subscribe to values emitted by this stream.
   * Accepts either a full `Observer<T>` object or a plain `next` function.
   * Returns an unsubscribe function — call it to stop receiving values.
   */
  subscribe(observerOrNext: Observer<T> | ((value: T) => void)): Unsubscribe;
  /** ES2026 `using` compatible disposal. Delegates to `dispose()`. */
  [Symbol.dispose](): void;
}
