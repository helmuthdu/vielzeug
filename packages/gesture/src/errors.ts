/** Base class for all gesture errors. Use `instanceof GestureError` to catch any gesture-originated error. */
export class GestureError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when gesture options are invalid, such as a negative `activationDistance` or an unknown `axis`. */
export class GestureConfigError extends GestureError {}
