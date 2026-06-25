export class FluxError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is FluxError {
    return err instanceof FluxError;
  }
}

export class FluxTimeoutError extends FluxError {
  /** The timeout duration in milliseconds that was exceeded. */
  readonly ms: number;

  constructor(ms: number) {
    super(`Timeout after ${ms}ms`);
    this.ms = ms;
  }
}
