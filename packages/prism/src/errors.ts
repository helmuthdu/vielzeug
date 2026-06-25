/** Base class for all prism errors. Use `instanceof PrismError` to catch any prism-originated error. */
export class PrismError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is PrismError {
    return err instanceof PrismError;
  }
}

/** Thrown when a method is called on a disposed chart instance. */
export class PrismDisposedError extends PrismError {}

/** Thrown when the chart fails to render due to an invalid configuration or missing data. */
export class PrismRenderError extends PrismError {}
