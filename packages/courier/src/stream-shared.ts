import type { Params } from './url';

import { classifyRequestError, CourierHttpError, CourierParseError } from './errors';
import { buildRequestInit } from './serialize';
import { anySignal, buildTimeoutSignal, type TransportCore } from './transport';
import { buildUrl } from './url';

export type StreamRequestConfig<P extends string = string> = {
  body?: unknown;
  /** Raw fetch options for advanced use (credentials, cache, mode, referrer, etc.). */
  fetchInit?: Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'>;
  headers?: Record<string, string>;
  method?: string;
  params?: P extends string ? Record<string, string | number | boolean> : never;
  query?: Params;
  /** External abort signal. Merged with internal cancellation. */
  signal?: AbortSignal;
  /** Request timeout in ms. Overrides client default (which is `Infinity` for streaming). */
  timeout?: number;
};

export type ReconnectOptions = {
  /**
   * Delay between reconnect attempts in ms, or a zero-based function where
   * `attempt` is the number of failures so far (0 = waiting before the 2nd try).
   * Defaults to full-jitter exponential backoff: `[0, min(1s × 2ⁿ, 30s)]`.
   */
  delay?: number | ((attempt: number) => number);
  /** Total reconnect attempts after the first failure. Defaults to `5`. */
  times?: number;
};

/**
 * Shared stream setup: build URL, combine signals, merge headers, dispatch through
 * transport. Returns the Response so both sse() and readable() can focus on parsing.
 * The caller owns the AbortController lifecycle (track + untrack).
 */
export async function openStreamWith(
  transport: TransportCore,
  url: string,
  ac: AbortController,
  config: {
    body?: unknown;
    extSignal?: AbortSignal;
    fetchInit?: Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'>;
    headers?: Record<string, string>;
    method: string;
    params?: Params;
    query?: Params;
    timeout?: number;
  },
  extraHeaders?: Record<string, string>,
): Promise<Response> {
  // Normalize once — error paths and RequestInit both receive the canonical form.
  const method = config.method.toUpperCase();
  const full = buildUrl(transport.baseUrl, url, config.params, config.query);
  const combined = anySignal(config.extSignal, ac.signal) ?? ac.signal;
  // Streaming connections are long-lived — default to Infinity so the transport's
  // REST default (30s) does not cut off streams prematurely.
  const signal = buildTimeoutSignal(config.timeout ?? Number.POSITIVE_INFINITY, combined);
  const requestHeaders = transport.mergeHeaders(config.headers, extraHeaders);
  const { headers: initHeaders, ...restInit } = buildRequestInit(
    method,
    requestHeaders,
    config.body,
    signal,
    config.fetchInit ?? {},
  );

  let res: Response;

  try {
    res = await transport.dispatch({ headers: initHeaders as Record<string, string>, init: restInit, url: full });
  } catch (err) {
    throw classifyRequestError(err, method, full, signal ?? combined);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');

    throw CourierHttpError.fromResponse(res, text, method, full);
  }

  if (!res.body) throw new CourierParseError('Response has no body');

  return res;
}
