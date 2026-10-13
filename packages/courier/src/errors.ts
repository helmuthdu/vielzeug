import type { ProblemDetail } from './problem.js';
import { asProblemDetail, isProblemMediaType, PROBLEM_JSON_MEDIA_TYPE } from './problem.js';

/**
 * Base class for all courier errors.
 * Use `instanceof CourierError` to catch any courier-originated error in one branch.
 * Use `CourierHttpError.is(e, status?)` to check for a specific HTTP status code.
 */
export class CourierError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the server responds with a non-2xx HTTP status code.
 * Use `CourierHttpError.is(e, status?)` to narrow to a specific status.
 *
 * When the response body is an RFC 9457 problem document, `problem` holds the parsed
 * details; `data` still carries the raw body either way, so a consumer that already
 * reads `data` keeps working unchanged.
 */
export class CourierHttpError extends CourierError {
  readonly url: string;
  readonly method: string;
  readonly status: number;
  readonly data: unknown;
  readonly headers: Headers;
  /** Parsed RFC 9457 problem details, or `undefined` for any other error body. */
  readonly problem?: ProblemDetail;

  constructor(opts: {
    data: unknown;
    headers: Headers;
    message: string;
    method: string;
    problem?: ProblemDetail;
    status: number;
    url: string;
  }) {
    super(opts.message);
    this.url = opts.url;
    this.method = opts.method;
    this.status = opts.status;
    this.data = opts.data;
    this.headers = opts.headers;
    this.problem = opts.problem;
  }

  static fromResponse(res: Response, data: unknown, method: string, url: string): CourierHttpError {
    const problem = isProblemMediaType(res.headers.get('content-type')) ? asProblemDetail(data) : undefined;
    // An empty statusText is common (HTTP/2 has no reason phrase), so fall back with `||`.
    const fallback = res.statusText || `HTTP ${res.status}`;

    return new CourierHttpError({
      data,
      headers: res.headers,
      message: problem?.detail || problem?.title || fallback,
      method,
      problem,
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

/** Thrown when a method is called on a disposed client instance. */
export class CourierDisposedError extends CourierError {
  constructor(clientName: string) {
    super(`${clientName} disposed`);
  }
}

/**
 * Build a `CourierHttpError` carrying problem details without a server, for mocks,
 * tests, and offline failure paths — so mock and real client speak the same type and
 * consumer error handling is written once.
 *
 * `status` comes from `problem.status` unless overridden: on the wire the HTTP status
 * line is authoritative, but a hand-built problem has none to defer to. Parsing a real
 * response never rewrites `status` for the same reason.
 */
export function problemDetailError(
  problem: ProblemDetail,
  options: { message?: string; method?: string; status?: number; url?: string } = {},
): CourierHttpError {
  const status = options.status ?? (typeof problem.status === 'number' ? problem.status : 500);

  return new CourierHttpError({
    data: problem,
    headers: new Headers({ 'content-type': PROBLEM_JSON_MEDIA_TYPE }),
    message: options.message || problem.detail || problem.title || `HTTP ${status}`,
    method: options.method ?? 'GET',
    problem,
    status,
    url: options.url ?? '',
  });
}

/** Thrown when a response body cannot be read or parsed. */
export class CourierParseError extends CourierError {}

/**
 * Thrown when a request configuration is structurally invalid: a GET/HEAD
 * carrying a body, a raw response paired with a schema, or an out-of-range
 * timeout. These are caller bugs fixed by editing code, unlike `CourierParseError`,
 * which reports malformed data arriving over the wire.
 */
export class CourierConfigError extends CourierError {}

/**
 * Classify an error thrown by `fetch` or an abort signal into the appropriate
 * courier error class. Signal reason is checked first so a timed-out signal
 * always produces `TimeoutError` even when `fetch` throws a generic Error.
 *
 * We check `.name` rather than `instanceof DOMException` because `AbortSignal.timeout()`
 * sets reason to the *native* Node.js DOMException which may differ from the environment's
 * global DOMException (e.g. jsdom), causing `instanceof` checks to fail cross-realm.
 */
function errorName(value: unknown): string | undefined {
  try {
    return typeof value === 'object' && value !== null && typeof (value as { name?: unknown }).name === 'string'
      ? (value as { name: string }).name
      : undefined;
  } catch {
    return undefined;
  }
}

function errorMessage(value: unknown): string {
  try {
    return typeof value === 'object' && value !== null && typeof (value as { message?: unknown }).message === 'string'
      ? (value as { message: string }).message
      : String(value);
  } catch {
    return 'Request failed';
  }
}

export function classifyRequestError(
  cause: unknown,
  method: string,
  url: string,
  signal?: AbortSignal,
): CourierNetworkError | CourierTimeoutError | CourierAbortError {
  const message = errorMessage(cause);

  // Signal reason is authoritative: a timed-out signal carries a TimeoutError reason
  // regardless of what error `fetch` actually threw.
  const reasonName = errorName(signal?.reason);
  const causeName = errorName(cause);

  if (reasonName === 'TimeoutError' || causeName === 'TimeoutError') {
    return new CourierTimeoutError({ cause, message, method, url });
  }

  if (reasonName === 'AbortError' || causeName === 'AbortError' || signal?.aborted) {
    return new CourierAbortError({ cause, message, method, url });
  }

  return new CourierNetworkError({ cause, message, method, url });
}
