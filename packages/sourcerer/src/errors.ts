/** Base class for all sourcerer errors. Use `instanceof SourcererError` to catch any sourcerer-originated error. */
export class SourcererError extends Error {
  protected static readonly errorName: string = 'SourcererError';

  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = (new.target as typeof SourcererError).errorName;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a source is configured or queried with invalid arguments. */
export class SourcererConfigurationError extends SourcererError {
  protected static override readonly errorName = 'SourcererConfigurationError';
}

export class SourcererDisposedError extends SourcererError {
  protected static override readonly errorName = 'SourcererDisposedError';

  constructor(message = 'Sourcerer source disposed') {
    super(message);
  }
}
