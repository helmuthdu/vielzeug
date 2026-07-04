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

/**
 * Reserved for future disposal-sensitive APIs on `ChartHandle`. Currently, calling
 * `dispose()` more than once is a documented no-op rather than an error — no code path
 * throws this yet.
 */
export class PrismDisposedError extends PrismError {}

/** Thrown when a chart is given a structurally invalid configuration it cannot render at all (e.g. a non-Element `container`). Recoverable issues like empty or malformed data emit a dev-mode warning instead — see the package docs for details. */
export class PrismRenderError extends PrismError {}
