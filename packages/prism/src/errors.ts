/** Base class for all prism errors. Use `instanceof PrismError` to catch any prism-originated error. */
export class PrismError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a chart is given a structurally invalid configuration it cannot render at all (e.g. a non-Element `container`). Recoverable issues like empty or malformed data emit a dev-mode warning instead — see the package docs for details. */
export class PrismRenderError extends PrismError {}
