export class HttpError extends Error {
  readonly name = 'HttpError';
  readonly url: string;
  readonly method: string;
  readonly status?: number;
  readonly data?: unknown;
  readonly response?: Response;
  /** True when the request failed due to a timeout (`AbortSignal.timeout`). */
  readonly isTimeout: boolean;
  /** True when the request was cancelled via an `AbortSignal`. */
  readonly isAborted: boolean;

  constructor(opts: {
    cause?: unknown;
    data?: unknown;
    message: string;
    method: string;
    response?: Response;
    status?: number;
    url: string;
  }) {
    super(opts.message, { cause: opts.cause });
    this.url = opts.url;
    this.method = opts.method;
    this.status = opts.status;
    this.data = opts.data;
    this.response = opts.response;

    const causeName = opts.cause instanceof Error ? opts.cause.name : undefined;

    this.isTimeout = causeName === 'TimeoutError';
    this.isAborted = causeName === 'AbortError';
  }

  static fromResponse(res: Response, data: unknown, method: string, url: string): HttpError {
    return new HttpError({
      data,
      message: res.statusText || 'Non-OK response',
      method,
      response: res,
      status: res.status,
      url,
    });
  }

  static fromCause(cause: unknown, method: string, url: string): HttpError {
    const message = cause instanceof Error ? cause.message : String(cause);

    return new HttpError({ cause, message, method, url });
  }

  static is(err: unknown, status?: number): err is HttpError {
    return err instanceof HttpError && (status === undefined || err.status === status);
  }
}

export function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}
