/**
 * Base class for all pulse errors.
 * Use `instanceof PulseError` to catch any pulse-originated error in one branch.
 */
export class PulseError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is PulseError {
    return err instanceof PulseError;
  }
}

/**
 * Thrown when a WebSocket connection cannot be established or is lost
 * without triggering auto-reconnect (budget exhausted, or reconnect disabled).
 */
export class PulseConnectionError extends PulseError {
  readonly url: string;

  constructor(message: string, url: string, opts?: ErrorOptions) {
    super(message, opts);
    this.url = url;
  }
}

/**
 * Thrown when `wait()` or `join()`/`leave()` times out before receiving a
 * server response, or when an AbortSignal fires before the event arrives.
 */
export class PulseTimeoutError extends PulseError {
  readonly event: string;

  constructor(event: string, opts?: ErrorOptions) {
    super(`Timed out waiting for "${event}"`, opts);
    this.event = event;
  }
}

/**
 * Thrown when `wait()` is aborted via an AbortSignal before the event fires.
 */
export class PulseAbortError extends PulseError {
  constructor(opts?: ErrorOptions) {
    super('Aborted', opts);
  }
}

/**
 * Thrown when a method is called on a disposed Pulse instance or channel.
 */
export class PulseDisposedError extends PulseError {
  constructor(target = 'Pulse', opts?: ErrorOptions) {
    super(`${target} instance is disposed`, opts);
  }
}

/**
 * Thrown when the server sends a frame that cannot be parsed or violates
 * the wire protocol schema.
 */
export class PulseProtocolError extends PulseError {
  readonly raw: unknown;

  constructor(message: string, raw?: unknown, opts?: ErrorOptions) {
    super(message, opts);
    this.raw = raw;
  }
}
