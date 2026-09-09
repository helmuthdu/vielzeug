export class FluxError extends Error {
  protected static readonly errorName: string = 'FluxError';

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = (new.target as typeof FluxError).errorName;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class FluxTimeoutError extends FluxError {
  protected static override readonly errorName = 'FluxTimeoutError';
  /** The timeout duration in milliseconds that was exceeded. */
  readonly ms: number;

  constructor(ms: number) {
    super(`Timeout after ${ms}ms`);
    this.ms = ms;
  }
}

/** Thrown by `first()` and `last()` when the source completes without emitting any value. */
export class FluxEmptyError extends FluxError {
  protected static override readonly errorName = 'FluxEmptyError';

  constructor(message = 'Stream completed without emitting any value') {
    super(message);
  }
}

/** Thrown when a bounded buffer (`mergeMap`, `concatMap`, `toArray`, async iteration) overflows. */
export class FluxCapacityError extends FluxError {
  protected static override readonly errorName = 'FluxCapacityError';
  /** The configured capacity that was exceeded. */
  readonly capacity: number;

  constructor(capacity: number, message: string) {
    super(message);
    this.capacity = capacity;
  }
}
