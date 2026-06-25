/** Base class for all rune errors. Use `instanceof RuneError` to catch any rune-originated error. */
export class RuneError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is RuneError {
    return err instanceof RuneError;
  }
}

/** Thrown when a transport function throws an unhandled error during log entry emission. */
export class RuneTransportError extends RuneError {
  constructor(cause: unknown) {
    super('Transport threw an unhandled error', { cause: cause instanceof Error ? cause : undefined });
  }
}
