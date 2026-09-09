/** Base class for all familiar errors. Use `instanceof FamiliarError` to catch any familiar-originated error. */
export class FamiliarError extends Error {
  protected static readonly errorName: string = 'FamiliarError';

  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = (new.target as typeof FamiliarError).errorName;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when invalid options are passed to a Familiar pool factory. */
export class FamiliarInvalidOptionsError extends FamiliarError {
  protected static override readonly errorName = 'FamiliarInvalidOptionsError';
}

/** Thrown when run() is called and the queue is full (`onFull='reject'`). */
export class FamiliarQueueFullError extends FamiliarError {
  protected static override readonly errorName = 'FamiliarQueueFullError';
  /** The configured `maxQueue` value. */
  readonly maxQueue: number;

  constructor(maxQueue: number) {
    super(`Queue is full (maxQueue=${maxQueue})`);
    this.maxQueue = maxQueue;
  }
}

/** Thrown when the task function throws. The original error is available as `.cause`. */
export class FamiliarTaskError extends FamiliarError {
  protected static override readonly errorName = 'FamiliarTaskError';
}

/** Thrown when a task or operation is rejected because the worker was terminated. */
export class FamiliarTerminatedError extends FamiliarError {
  protected static override readonly errorName = 'FamiliarTerminatedError';

  constructor(message = 'Worker was terminated') {
    super(message);
  }
}

/** Thrown when a task exceeds its timeout or `drain()` times out. */
export class FamiliarTimeoutError extends FamiliarError {
  protected static override readonly errorName = 'FamiliarTimeoutError';
  /** The configured timeout in milliseconds. */
  readonly timeoutMs: number;

  constructor(timeoutMs: number, operation = 'Task') {
    super(`${operation} timed out after ${timeoutMs}ms`);
    this.timeoutMs = timeoutMs;
  }
}

/** Thrown when the Worker API is unavailable or an unhandled error occurs in the worker thread. */
export class FamiliarRuntimeError extends FamiliarError {
  protected static override readonly errorName = 'FamiliarRuntimeError';
}
