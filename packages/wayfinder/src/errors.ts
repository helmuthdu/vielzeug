/** Base class for all wayfinder errors. Use `instanceof WayfinderError` to catch any router-originated error. */
export class WayfinderError extends Error {
  constructor(message = 'an unexpected error occurred', opts?: ErrorOptions) {
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

/** Thrown when a route or path definition is malformed. */
export class WayfinderRouteError extends WayfinderError {}

/** Thrown when the router detects an infinite redirect loop. */
export class WayfinderRedirectLoopError extends WayfinderError {
  constructor() {
    super('Redirect loop detected');
  }
}

/** Thrown on API misuse (e.g. calling next() multiple times). */
export class WayfinderApiError extends WayfinderError {}
