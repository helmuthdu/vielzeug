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

/**
 * Constructed internally when a transport function throws during log entry emission.
 * Never thrown/propagated to the caller — the logger catches the underlying error, wraps it here
 * (available as `.cause`), and reports it via a dev-only warning so the failing transport cannot
 * crash the caller of `log.info()`/etc. or prevent sibling transports from receiving the entry.
 */
export class RuneTransportError extends RuneError {
  constructor(cause: unknown) {
    super('Transport threw an unhandled error', { cause: cause instanceof Error ? cause : undefined });
  }
}
