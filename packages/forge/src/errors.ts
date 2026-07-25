/** Base class for all forge errors. Use `instanceof ForgeError` to catch any forge-originated error. */
export class ForgeError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
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
  /** @param op The public method name that was called (e.g. `'set'`) — included in the
   * message so a stack trace tells you *what* to guard, not just *that* it's disposed. */
  constructor(op?: string) {
    super(op ? `Cannot call ${op}() on a disposed form` : 'Cannot modify a disposed form');
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
