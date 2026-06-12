/**
 * Thrown when a response body fails schema validation (via the `schema` option).
 * Distinct from `HttpError` so callers can separately handle network failures
 * vs. data contract violations without inspecting the error shape.
 */
export class SchemaValidationError extends Error {
  /** The raw (pre-validation) response body that failed parsing. */
  readonly data: unknown;

  constructor(cause: unknown, data: unknown) {
    super(`[@vielzeug/courier] ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
    this.data = data;
  }

  static is(err: unknown): err is SchemaValidationError {
    return err instanceof SchemaValidationError;
  }
}

export class HttpError extends Error {
  readonly kind: 'abort' | 'http' | 'network' | 'timeout';
  readonly url: string;
  readonly method: string;
  readonly status?: number;
  readonly data?: unknown;
  readonly headers?: Headers;

  private static classifyKind(opts: {
    aborted?: boolean;
    cause?: unknown;
    signalReason?: unknown;
    status?: number;
  }): 'abort' | 'http' | 'network' | 'timeout' {
    // Signal reason is authoritative: checked first so a custom transport that
    // throws a generic Error on abort still yields 'timeout' when the signal
    // itself carries a TimeoutError reason. We check .name rather than
    // instanceof DOMException because AbortSignal.timeout() sets reason to the
    // *native* Node.js DOMException which may differ from the environment's
    // global DOMException (e.g. jsdom), causing instanceof checks to fail.
    // DOMException extends Error per spec, so `instanceof Error` is intentionally
    // broad — it catches both plain Errors and native DOMExceptions without
    // relying on the environment's DOMException constructor identity.
    if (opts.signalReason instanceof Error && opts.signalReason.name === 'TimeoutError') {
      return 'timeout';
    }

    if (opts.cause instanceof DOMException) {
      return opts.cause.name === 'TimeoutError' ? 'timeout' : 'abort';
    }

    if ((opts.cause instanceof Error && opts.cause.name === 'AbortError') || opts.aborted) {
      return 'abort';
    }

    if (opts.status !== undefined) {
      return 'http';
    }

    return 'network';
  }

  constructor(opts: {
    aborted?: boolean;
    cause?: unknown;
    data?: unknown;
    headers?: Headers;
    message: string;
    method: string;
    signalReason?: unknown;
    status?: number;
    url: string;
  }) {
    super(`[@vielzeug/courier] ${opts.message}`, { cause: opts.cause });
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
    this.url = opts.url;
    this.method = opts.method;
    this.status = opts.status;
    this.data = opts.data;
    this.headers = opts.headers;
    this.kind = HttpError.classifyKind(opts);
  }

  /** True when the request failed due to a timeout (`AbortSignal.timeout`). */
  get isTimeout(): boolean {
    return this.kind === 'timeout';
  }

  /** True when the request was cancelled via an `AbortSignal`. */
  get isAborted(): boolean {
    return this.kind === 'abort';
  }

  static fromResponse(res: Response, data: unknown, method: string, url: string): HttpError {
    return new HttpError({
      data,
      headers: res.headers,
      message: res.statusText || `HTTP ${res.status}`,
      method,
      status: res.status,
      url,
    });
  }

  static fromCause(cause: unknown, method: string, url: string, signal?: AbortSignal): HttpError {
    const message = cause instanceof Error ? cause.message : String(cause);

    return new HttpError({
      aborted: signal?.aborted,
      cause,
      message,
      method,
      signalReason: signal?.reason,
      url,
    });
  }

  static is(err: unknown, status?: number): err is HttpError {
    return err instanceof HttpError && (status === undefined || err.status === status);
  }
}
