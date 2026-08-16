/** Base class for all scout errors. Use `instanceof ScoutError` to catch any scout-originated error. */
export class ScoutError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a method is called on a disposed search state instance. */
export class ScoutDisposedError extends ScoutError {}

/** Thrown when an index, search, or reactive search receives an invalid configuration. */
export class ScoutConfigurationError extends ScoutError {}
