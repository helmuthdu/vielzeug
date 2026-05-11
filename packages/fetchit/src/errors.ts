export class HttpError extends Error {
  readonly name = 'HttpError';
  readonly kind: 'abort' | 'http' | 'network' | 'timeout';
  readonly url: string;
  readonly method: string;
  readonly status?: number;
  readonly data?: unknown;
  readonly response?: Response;

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

    this.kind =
      opts.cause instanceof DOMException
        ? opts.cause.name === 'TimeoutError'
          ? 'timeout'
          : opts.cause.name === 'AbortError'
            ? 'abort'
            : 'network'
        : opts.status !== undefined
          ? 'http'
          : 'network';
  }

  /** True when the request failed due to a timeout (`AbortSignal.timeout`). */
  get isTimeout(): boolean {
    return this.kind === 'timeout';
  }

  /** True when the request was cancelled via an `AbortSignal`. */
  get isAborted(): boolean {
    return this.kind === 'abort';
  }

  /** Response headers. Shorthand for `err.response?.headers`. */
  get headers(): Headers | undefined {
    return this.response?.headers;
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
