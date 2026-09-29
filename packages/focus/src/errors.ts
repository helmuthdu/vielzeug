/** Base class for all focus errors. Use `instanceof FocusError` to catch any focus-originated error. */
export class FocusError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when navigation options are invalid, such as a non-positive typeahead delay or a key assigned to two actions. */
export class FocusConfigError extends FocusError {}
