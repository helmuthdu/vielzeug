/** Base class for all ink errors. Use `instanceof InkError` to catch any ink-originated error. */
export class InkError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when ink options are invalid, such as a negative `tolerance`, a `tension` outside `[0, 1]`, or a non-positive `baseWidth`. */
export class InkConfigError extends InkError {}
