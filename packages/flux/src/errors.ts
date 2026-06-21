export class FluxError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'FluxError';
  }
}

export class FluxTimeoutError extends FluxError {
  /** The timeout duration in milliseconds that was exceeded. */
  readonly ms: number;

  constructor(ms: number) {
    super(`[@vielzeug/flux] Timeout after ${ms}ms`);
    this.name = 'FluxTimeoutError';
    this.ms = ms;
  }
}
