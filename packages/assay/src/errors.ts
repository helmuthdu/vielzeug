/** Base class for all Assay errors. Use `instanceof AssayError` to catch any Assay-originated error. */
export class AssayError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a required query has no match. */
export class AssayQueryError extends AssayError {}

/** Thrown by `waitUntil`/`retry`/`waitForEvent` when the timeout elapses. */
export class AssayTimeoutError extends AssayError {}
