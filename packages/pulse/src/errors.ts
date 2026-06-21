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
}

/**
 * Thrown when a WebSocket connection cannot be established or is lost
 * without triggering auto-reconnect (budget exhausted, or reconnect disabled).
 */
export class ConnectionError extends PulseError {
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
export class TimeoutError extends PulseError {
  readonly event: string;

  constructor(event: string, opts?: ErrorOptions) {
    super(`Timed out waiting for "${event}"`, opts);
    this.event = event;
  }
}

/**
 * Thrown when `wait()` is aborted via an AbortSignal before the event fires.
 */
export class AbortError extends PulseError {
  constructor(opts?: ErrorOptions) {
    super('Aborted', opts);
  }
}

/**
 * Thrown when a method is called on a disposed Pulse instance or channel.
 */
export class DisposedError extends PulseError {
  constructor(target = 'Pulse') {
    super(`${target} instance is disposed`);
  }
}

/**
 * Thrown when the server sends a frame that cannot be parsed or violates
 * the wire protocol schema.
 */
export class ProtocolError extends PulseError {
  readonly raw: unknown;

  constructor(message: string, raw?: unknown) {
    super(message);
    this.raw = raw;
  }
}
