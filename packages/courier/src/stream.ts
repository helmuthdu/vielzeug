import type { Params } from './url';

import { classifyRequestError, CourierDisposedError, CourierHttpError, CourierParseError } from './errors';
import { buildRequestInit } from './serialize';
import { anySignal, buildTimeoutSignal, type TransportCore } from './transport';
import { buildUrl } from './url';

export type StreamOptions<P extends string = string> = {
  body?: unknown;
  fetchInit?: Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'>;
  headers?: Record<string, string>;
  method?: string;
  params?: P extends string ? Record<string, string | number | boolean> : never;
  query?: Params;
  signal?: AbortSignal;
  timeout?: number;
};

export type StreamEvent<T = unknown> = { readonly data: T; readonly event: string };

function abortable<T>(create: (signal: AbortSignal) => AsyncGenerator<T>): AsyncIterableIterator<T> {
  const controller = new AbortController();
  const iterator = create(controller.signal);

  return {
    next: (value?: undefined) => iterator.next(value),
    return: (value?: T) => {
      controller.abort();

      return iterator.return(value as T);
    },
    [Symbol.asyncIterator]() {
      return this;
    },
    throw: (error?: unknown) => {
      controller.abort();

      return iterator.throw(error);
    },
  };
}

async function open(
  transport: TransportCore,
  url: string,
  config: StreamOptions,
): Promise<{ controller: AbortController; response: Response; untrack: () => void }> {
  if (transport.disposed) throw new CourierDisposedError('Courier');

  const controller = new AbortController();
  const untrack = transport.track(controller);
  const method = (config.method ?? (config.body === undefined ? 'GET' : 'POST')).toUpperCase();
  const signal = buildTimeoutSignal(
    config.timeout ?? Number.POSITIVE_INFINITY,
    anySignal(config.signal, controller.signal),
  );
  let fullUrl = url;

  try {
    fullUrl = buildUrl(transport.baseUrl, url, config.params as Params | undefined, config.query);

    const headers = transport.mergeHeaders(config.headers);
    const { headers: requestHeaders, ...init } = buildRequestInit(
      method,
      headers,
      config.body,
      signal,
      config.fetchInit ?? {},
    );
    const response = await transport.dispatch({
      headers: requestHeaders as Record<string, string>,
      init,
      url: fullUrl,
    });

    if (!response.ok)
      throw CourierHttpError.fromResponse(response, await response.text().catch(() => ''), method, fullUrl);

    if (!response.body) throw new CourierParseError('Response has no body');

    return { controller, response, untrack };
  } catch (error) {
    untrack();

    if (error instanceof CourierHttpError || error instanceof CourierParseError) throw error;

    throw classifyRequestError(error, method, fullUrl, signal);
  }
}

/** Platform-shaped streaming primitives: async iteration owns cancellation and backpressure. */
export function createStreams(transport: TransportCore) {
  async function* events<T = unknown, P extends string = string>(
    url: P,
    config: StreamOptions<P>,
  ): AsyncGenerator<StreamEvent<T>> {
    const { controller, response, untrack } = await open(transport, url, config);
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let event = 'message';
    let data = '';

    try {
      while (true) {
        const chunk = await reader.read();

        if (chunk.done) break;

        buffer += decoder.decode(chunk.value, { stream: true }).replace(/\r\n?/g, '\n');

        let newline: number;

        while ((newline = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newline);

          buffer = buffer.slice(newline + 1);

          if (line === '') {
            if (data !== '') {
              let parsed: unknown = data.endsWith('\n') ? data.slice(0, -1) : data;

              try {
                parsed = JSON.parse(parsed as string);
              } catch {
                // SSE text payloads are valid raw values.
              }

              yield { data: parsed as T, event };
            }

            data = '';
            event = 'message';
            continue;
          }

          if (line.startsWith(':')) continue;

          const separator = line.indexOf(':');
          const field = separator === -1 ? line : line.slice(0, separator);
          const value = (separator === -1 ? '' : line.slice(separator + 1)).replace(/^ /, '');

          if (field === 'data') data += `${value}\n`;
          else if (field === 'event') event = value;
        }
      }
    } finally {
      reader.releaseLock();
      controller.abort();
      untrack();
    }
  }

  async function* read<T = string, P extends string = string>(
    url: P,
    config: StreamOptions<P> & { parse?: 'ndjson' | 'text' },
  ): AsyncGenerator<T> {
    const { controller, response, untrack } = await open(transport, url, config);
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const chunk = await reader.read();

        if (chunk.done) {
          if (config.parse === 'ndjson' && buffer.trim()) {
            try {
              yield JSON.parse(buffer) as T;
            } catch {
              throw new CourierParseError(`NDJSON: failed to parse line: ${buffer.slice(0, 200)}`);
            }
          }

          break;
        }

        const text = decoder.decode(chunk.value, { stream: true });

        if (config.parse !== 'ndjson') {
          yield text as T;
          continue;
        }

        buffer += text;

        let newline: number;

        while ((newline = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newline).trim();

          buffer = buffer.slice(newline + 1);

          if (!line) continue;

          try {
            yield JSON.parse(line) as T;
          } catch {
            throw new CourierParseError(`NDJSON: failed to parse line: ${line.slice(0, 200)}`);
          }
        }
      }
    } finally {
      reader.releaseLock();
      controller.abort();
      untrack();
    }
  }

  return {
    events<T = unknown, P extends string = string>(
      url: P,
      config: StreamOptions<P> = {},
    ): AsyncIterableIterator<StreamEvent<T>> {
      return abortable((signal) =>
        events<T, P>(url, {
          ...config,
          headers: { accept: 'text/event-stream', 'cache-control': 'no-cache', ...config.headers },
          signal: anySignal(config.signal, signal),
        }),
      );
    },
    read<T = string, P extends string = string>(
      url: P,
      config: StreamOptions<P> & { parse?: 'ndjson' | 'text' } = {},
    ): AsyncIterableIterator<T> {
      return abortable((signal) => read<T, P>(url, { ...config, signal: anySignal(config.signal, signal) }));
    },
  };
}
