/** Base class for all Assay errors. Use `instanceof AssayError` to catch any Assay-originated error. */
export class AssayError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is AssayError {
    return err instanceof AssayError;
  }
}

/** Thrown by `waitFor`/`waitForEvent` when a condition is not met within the timeout. */
export class AssayTimeoutError extends AssayError {}
