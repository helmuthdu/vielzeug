/** Base class for all familiar errors. Use `instanceof FamiliarError` to catch any familiar-originated error. */
export class FamiliarError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is FamiliarError {
    return err instanceof FamiliarError;
  }
}

/** Thrown when invalid options are passed to `createWorker` or `createModuleWorker`. */
export class FamiliarInvalidOptionsError extends FamiliarError {}

/** Thrown when run() is called and the queue is full (`onFull='reject'`). */
export class FamiliarQueueFullError extends FamiliarError {
  /** The configured `maxQueue` value. */
  readonly maxQueue: number;

  constructor(maxQueue: number) {
    super(`Queue is full (maxQueue=${maxQueue})`);
    this.maxQueue = maxQueue;
  }
}

/** Thrown when the task function throws. The original error is available as `.cause`. */
export class FamiliarTaskError extends FamiliarError {}

/** Thrown when a task or operation is rejected because the worker was terminated. */
export class FamiliarTerminatedError extends FamiliarError {
  constructor(message = 'Worker was terminated') {
    super(message);
  }
}

/** Thrown when a task exceeds its timeout or `drain()` times out. */
export class FamiliarTimeoutError extends FamiliarError {
  /** The configured timeout in milliseconds. */
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Task timed out after ${timeoutMs}ms`);
    this.timeoutMs = timeoutMs;
  }
}

/** Thrown when the Worker API is unavailable or an unhandled error occurs in the worker thread. */
export class FamiliarRuntimeError extends FamiliarError {}
