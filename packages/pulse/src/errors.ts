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
 * Thrown when `wait()` times out before the server event arrives.
 */
export class PulseTimeoutError extends PulseError {
  readonly event: string;

  constructor(event: string, opts?: ErrorOptions) {
    super(`Timed out waiting for "${event}"`, opts);
    this.event = event;
  }
}

/**
 * Thrown when a room scope's `joined` promise times out before the server
 * confirms membership, or when an AbortSignal fires before confirmation.
 */
export class PulseRoomTimeoutError extends PulseError {
  readonly room: string;

  constructor(room: string, opts?: ErrorOptions) {
    super(`Timed out waiting for room "${room}"`, opts);
    this.room = room;
  }
}

/**
 * Thrown when `wait()` is aborted via an AbortSignal before the event fires,
 * or when a room scope's join is aborted before the server confirms.
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
