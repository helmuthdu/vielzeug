/** Base class for all Assay errors. Use `instanceof AssayError` to catch any Assay-originated error. */
export class AssayError extends Error {
  protected static readonly errorName: string = 'AssayError';

  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = (new.target as typeof AssayError).errorName;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a required query has no match. */
export class AssayQueryError extends AssayError {
  protected static override readonly errorName = 'AssayQueryError';
}

/** Thrown when an Assay wait reaches its timeout. */
export class AssayTimeoutError extends AssayError {
  protected static override readonly errorName = 'AssayTimeoutError';
}
