/** Base class for errors raised by `@vielzeug/bard`. */
export class BardError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when fetching or decoding an asset fails; the original failure is the `cause`. */
export class BardLoadError extends BardError {}

/** Thrown when a method is called after `dispose()`. */
export class BardDisposedError extends BardError {}

/** Thrown when the runtime provides neither Web Audio nor the required API. */
export class BardUnsupportedError extends BardError {}
