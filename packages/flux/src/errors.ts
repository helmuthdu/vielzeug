export class FluxError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'FluxError';
  }
}

export class FluxTimeoutError extends FluxError {
  constructor(ms: number) {
    super(`[@vielzeug/flux] Timeout after ${ms}ms`);
    this.name = 'FluxTimeoutError';
  }
}

export class FluxDisposedError extends FluxError {
  constructor() {
    super('[@vielzeug/flux] Stream has been disposed');
    this.name = 'FluxDisposedError';
  }
}

export class FluxBufferOverflowError extends FluxError {
  constructor(strategy: string) {
    super(`[@vielzeug/flux] Buffer overflow (strategy: ${strategy})`);
    this.name = 'FluxBufferOverflowError';
  }
}
