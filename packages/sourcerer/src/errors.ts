/** Base class for all sourcerer errors. Use `instanceof SourcererError` to catch any sourcerer-originated error. */
export class SourcererError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a source is configured or queried with invalid arguments. */
export class SourcererConfigurationError extends SourcererError {}
