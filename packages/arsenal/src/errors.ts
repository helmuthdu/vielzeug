/** Base class for all arsenal errors. Use `instanceof ArsenalError` to catch any arsenal-originated error. */
export class ArsenalError extends Error {
  constructor(message = 'an unexpected error occurred', opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is ArsenalError {
    return err instanceof ArsenalError;
  }
}
