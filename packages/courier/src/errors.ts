/**
 * Base class for all courier errors.
 * Use `instanceof CourierError` to catch any courier-originated error in one branch.
 * Use `HttpError.is(e, status?)` to check for a specific HTTP status code.
 */
export class CourierError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is CourierError {
    return err instanceof CourierError;
  }
}

/**
 * Thrown when the server responds with a non-2xx HTTP status code.
 * Use `HttpError.is(e, status?)` to narrow to a specific status.
 */
export class CourierHttpError extends CourierError {
  readonly url: string;
  readonly method: string;
  readonly status: number;
  readonly data: unknown;
  readonly headers: Headers;

  constructor(opts: { data: unknown; headers: Headers; message: string; method: string; status: number; url: string }) {
    super(opts.message);
    this.url = opts.url;
    this.method = opts.method;
    this.status = opts.status;
    this.data = opts.data;
    this.headers = opts.headers;
  }

  static fromResponse(res: Response, data: unknown, method: string, url: string): CourierHttpError {
    return new CourierHttpError({
      data,
      headers: res.headers,
      message: res.statusText || `HTTP ${res.status}`,
      method,
      status: res.status,
      url,
    });
  }

  static is(err: unknown, status?: number): err is CourierHttpError {
    return err instanceof CourierHttpError && (status === undefined || err.status === status);
  }
}

/**
 * Thrown when a fetch fails due to a network-level error (DNS, TCP, CORS, etc.)
 * with no HTTP response. Distinct from `HttpError` so callers never need to check
 * for a missing `status` field.
 */
export class CourierNetworkError extends CourierError {
  readonly url: string;
  readonly method: string;

  constructor(opts: { cause?: unknown; message: string; method: string; url: string }) {
    super(opts.message, { cause: opts.cause });
    this.url = opts.url;
    this.method = opts.method;
  }
}

/**
 * Thrown when a request is aborted via `AbortSignal.timeout()` or a caller-supplied
 * timeout option. Distinct from `AbortError` so callers can show retry UI on timeouts
 * without checking any `kind` discriminant.
 */
export class CourierTimeoutError extends CourierError {
  readonly url: string;
  readonly method: string;

  constructor(opts: { cause?: unknown; message: string; method: string; url: string }) {
    super(opts.message, { cause: opts.cause });
    this.url = opts.url;
    this.method = opts.method;
  }
}

/**
 * Thrown when a request is cancelled via a caller-supplied `AbortSignal` or
 * `cancelAll()` / `dispose()`. Safe to ignore in most UI handlers.
 */
export class CourierAbortError extends CourierError {
  readonly url: string;
  readonly method: string;

  constructor(opts: { cause?: unknown; message: string; method: string; url: string }) {
    super(opts.message, { cause: opts.cause });
    this.url = opts.url;
    this.method = opts.method;
  }
}

/**
 * Thrown when a response body fails schema validation (via the `schema` option).
 * Distinct from the HTTP error classes so callers can separately handle network failures
 * vs. data contract violations without inspecting the error shape.
 */
export class CourierSchemaValidationError extends CourierError {
  /** The raw (pre-validation) response body that failed parsing. */
  readonly data: unknown;

  constructor(cause: unknown, data: unknown) {
    super(cause instanceof Error ? cause.message : String(cause), { cause });
    this.data = data;
  }
}

/** Thrown when the batcher's resolve function returns an unexpected number of results. */
export class CourierBatcherError extends CourierError {}

/** Thrown when a method is called on a disposed client instance. */
export class CourierDisposedError extends CourierError {
  constructor(clientName: string) {
    super(`[courier] ${clientName} disposed`);
  }
}

/** Thrown when a response body cannot be read or parsed. */
export class CourierParseError extends CourierError {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
  }
}

/**
 * Classify an error thrown by `fetch` or an abort signal into the appropriate
 * courier error class. Signal reason is checked first so a timed-out signal
 * always produces `TimeoutError` even when `fetch` throws a generic Error.
 *
 * We check `.name` rather than `instanceof DOMException` because `AbortSignal.timeout()`
 * sets reason to the *native* Node.js DOMException which may differ from the environment's
 * global DOMException (e.g. jsdom), causing `instanceof` checks to fail cross-realm.
 */
export function classifyRequestError(
  cause: unknown,
  method: string,
  url: string,
  signal?: AbortSignal,
): CourierNetworkError | CourierTimeoutError | CourierAbortError {
  const message = cause instanceof Error ? cause.message : String(cause);

  // Signal reason is authoritative — a timed-out signal carries a TimeoutError reason
  // regardless of what error `fetch` actually threw.
  const reason = signal?.reason;

  if (reason instanceof Error && reason.name === 'TimeoutError') {
    return new CourierTimeoutError({ cause, message, method, url });
  }

  if (cause instanceof DOMException) {
    if (cause.name === 'TimeoutError') return new CourierTimeoutError({ cause, message, method, url });

    return new CourierAbortError({ cause, message, method, url });
  }

  if ((cause instanceof Error && cause.name === 'AbortError') || signal?.aborted) {
    return new CourierAbortError({ cause, message, method, url });
  }

  return new CourierNetworkError({ cause, message, method, url });
}
