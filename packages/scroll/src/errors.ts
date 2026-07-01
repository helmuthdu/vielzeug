/** Base class for all scroll errors. */
export class ScrollError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is ScrollError {
    return err instanceof ScrollError;
  }
}

/** Thrown when a virtual-list index is out of bounds. */
export class ScrollRangeError extends ScrollError {}
