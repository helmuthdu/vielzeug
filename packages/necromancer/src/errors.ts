/** Base class for errors raised by `@vielzeug/necromancer`. */
export class NecromancerError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** Narrows an unknown error to any Necromancer-originated error. */
  static is(error: unknown): error is NecromancerError {
    return error instanceof NecromancerError;
  }
}

/** Thrown when a Necromancer-owned option is invalid. */
export class NecromancerConfigError extends NecromancerError {}

/** Thrown when the runtime does not implement the Web Animations API. */
export class NecromancerUnsupportedError extends NecromancerError {}
