/**
 * Structured context carried by `SourcererError`.
 * Discriminated on `kind` — narrow with `error.context?.kind` to access typed fields.
 *
 * @example
 * ```ts
 * if (source.meta.error?.context?.kind === 'remote') {
 *   console.log('Failed page', source.meta.error.context.page);
 * }
 * ```
 */
export type SourcererErrorContext =
  | Readonly<{ kind: 'cursor'; limit: number; search?: string }>
  | Readonly<{ kind: 'infinite'; limit: number; page: number; search?: string }>
  | Readonly<{ kind: 'remote'; limit: number; page: number; search?: string }>;

/**
 * Base class for all sourcerer errors. Catch with `instanceof SourcererError` to handle any
 * sourcerer-originated error regardless of specific subtype.
 *
 * Carries the original cause, structured context, and the attempt number.
 *
 * @example
 * ```ts
 * if (source.meta.error) {
 *   console.error(source.meta.error.message, source.meta.error.context);
 * }
 * ```
 */
export class SourcererError extends Error {
  readonly #opts: {
    readonly attempt?: number;
    readonly cause?: unknown;
    readonly context?: SourcererErrorContext;
  };

  constructor(
    message: string,
    opts: {
      readonly attempt?: number;
      readonly cause?: unknown;
      readonly context?: SourcererErrorContext;
    } = {},
  ) {
    super(message, opts.cause !== undefined ? { cause: opts.cause } : undefined);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
    this.#opts = opts;
  }

  get attempt(): number {
    return this.#opts.attempt ?? 0;
  }

  /** Context bag for the error — safe to log. */
  get context(): SourcererErrorContext | undefined {
    return this.#opts.context;
  }

  static is(err: unknown): err is SourcererError {
    return err instanceof SourcererError;
  }
}

/** Thrown by `ready()` when the source timed out waiting for the first successful fetch. */
export class SourceTimeoutError extends SourcererError {
  /** The configured timeout in milliseconds. */
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Source.ready() timed out after ${timeoutMs}ms`);
    this.timeoutMs = timeoutMs;
  }
}

/** Thrown by `ready()` when the source is disposed while waiting. */
export class SourceDisposedError extends SourcererError {
  constructor() {
    super('Source disposed while waiting for ready()');
  }
}
