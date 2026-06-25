/** Base class for all wayfinder errors. Use `instanceof WayfinderError` to catch any router-originated error. */
export class WayfinderError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is WayfinderError {
    return err instanceof WayfinderError;
  }
}

/** Thrown when any router method is called after the router has been disposed. */
export class WayfinderDisposedError extends WayfinderError {
  constructor() {
    super('Router is disposed');
  }
}
