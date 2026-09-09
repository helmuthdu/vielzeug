/** Base class for all forge errors. Use `instanceof ForgeError` to catch any forge-originated error. */
export class ForgeError extends Error {
  protected static readonly errorName: string = 'ForgeError';

  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = (new.target as typeof ForgeError).errorName;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when any method is called on a disposed form. */
export class ForgeDisposedError extends ForgeError {
  protected static override readonly errorName = 'ForgeDisposedError';

  /** @param op The public method name that was called (e.g. `'set'`) — included in the
   * message so a stack trace tells you *what* to guard, not just *that* it's disposed. */
  constructor(op?: string) {
    super(op ? `Cannot call ${op}() on a disposed form` : 'Cannot modify a disposed form');
  }
}

/** Thrown when form configuration or value structure is invalid. */
export class ForgeConfigError extends ForgeError {
  protected static override readonly errorName = 'ForgeConfigError';
}

/** Thrown when `submit()` is called while a submission is already in progress. */
export class ForgeSubmitError extends ForgeError {
  protected static override readonly errorName = 'ForgeSubmitError';
}

/** Wraps unexpected exceptions from a form validator without converting validation failures into exceptions. */
export class ForgeValidationError extends ForgeError {
  protected static override readonly errorName = 'ForgeValidationError';
}
