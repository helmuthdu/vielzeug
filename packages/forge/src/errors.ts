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

/** Thrown by `submitOrThrow()` when validation fails. */
export class ForgeValidationError extends ForgeError {
  readonly errors: Record<string, string>;

  constructor(errors: Record<string, string>) {
    super('Form validation failed');
    this.errors = errors;
  }
}
