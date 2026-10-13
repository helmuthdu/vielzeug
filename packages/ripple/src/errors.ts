export class RippleError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** User code that never settles: a computed cycle or a runaway flush loop. */
export class RippleCycleError extends RippleError {}

/** Any operation against a disposed runtime, scope, resource, or bridge. */
export class RippleDisposedError extends RippleError {}
