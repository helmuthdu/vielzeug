/** Base class for all refine errors. Use `instanceof RefineError` to catch any refine-originated error. */
export class RefineError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is RefineError {
    return err instanceof RefineError;
  }
}

/** Thrown when a refine component receives an invalid or unsupported configuration. */
export class RefineConfigError extends RefineError {
  constructor(message: string) {
    super(message);
  }
}
