/** Base class for all forge errors. Use `instanceof ForgeError` to catch any forge-originated error. */
export class ForgeError extends Error {
  constructor(message = 'an unexpected error occurred', opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is ForgeError {
    return err instanceof ForgeError;
  }
}

/** Thrown when any method is called on a disposed form. */
export class ForgeDisposedError extends ForgeError {
  constructor() {
    super('Cannot modify a disposed form');
  }
}

/** Thrown when a form key contains reserved prototype-polluting segments. */
export class ForgeConfigError extends ForgeError {}

/** Thrown when `submit()` is called while a submission is already in progress. */
export class ForgeSubmitError extends ForgeError {}

/** Thrown by `submitOrThrow()` when validation fails. */
export class ForgeValidationError extends ForgeError {
  readonly errors: Record<string, string>;

  constructor(errors: Record<string, string>) {
    super('Form validation failed');
    this.errors = errors;
  }
}
