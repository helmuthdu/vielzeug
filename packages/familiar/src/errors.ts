export type WorkerErrorCode = 'invalid_options' | 'queue_full' | 'task' | 'terminated' | 'timeout' | 'worker';

/** Base class for all worker errors. Use instanceof checks against subclasses for specificity. */
export class WorkerError extends Error {
  readonly code: WorkerErrorCode;

  constructor(code: WorkerErrorCode, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
    this.code = code;
  }

  override toString(): string {
    return `[@vielzeug/familiar] ${this.name}: ${this.message}`;
  }

  static is(err: unknown): err is WorkerError {
    return err instanceof WorkerError;
  }
}

/** Thrown when a task exceeds its timeout or close() times out. */
export class WorkerTimeoutError extends WorkerError {
  /** The configured timeout in milliseconds. */
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super('timeout', `Task timed out after ${timeoutMs}ms`);
    this.timeoutMs = timeoutMs;
  }
}

/** Thrown when the task function throws. The original error is available as .cause. */
export class WorkerTaskError extends WorkerError {
  constructor(message: string, cause?: unknown) {
    super('task', message, cause);
  }
}

/** Thrown when run() is called and the queue is full (onFull='reject'). */
export class WorkerQueueFullError extends WorkerError {
  /** The configured maxQueue value. */
  readonly maxQueue: number;

  constructor(maxQueue: number) {
    super('queue_full', `Queue is full (maxQueue=${maxQueue})`);
    this.maxQueue = maxQueue;
  }
}

/** Thrown when a task or operation is rejected because the worker was terminated. */
export class WorkerTerminatedError extends WorkerError {
  constructor(message = 'Worker was terminated') {
    super('terminated', message);
  }
}

/** Thrown when the Worker API is unavailable or an unhandled error occurs in the worker thread. */
export class WorkerRuntimeError extends WorkerError {
  constructor(message: string, cause?: unknown) {
    super('worker', message, cause);
  }
}

/** Thrown when invalid options are passed to createWorker or createModuleWorker. */
export class WorkerInvalidOptionsError extends WorkerError {
  constructor(message: string) {
    super('invalid_options', message);
  }
}
