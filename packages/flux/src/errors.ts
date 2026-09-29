export class FluxError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class FluxTimeoutError extends FluxError {
  /** The timeout duration in milliseconds that was exceeded. */
  readonly ms: number;

  constructor(ms: number) {
    super(`Timeout after ${ms}ms`);
    this.ms = ms;
  }
}

/** Thrown by `first()` and `last()` when the source completes without emitting any value. */
export class FluxEmptyError extends FluxError {
  constructor(message = 'Stream completed without emitting any value') {
    super(message);
  }
}

/** Thrown when a bounded buffer (`mergeMap`, `concatMap`, `toArray`, async iteration) overflows. */
export class FluxCapacityError extends FluxError {
  /** The configured capacity that was exceeded. */
  readonly capacity: number;

  constructor(capacity: number, message: string) {
    super(message);
    this.capacity = capacity;
  }
}
