import type { Params } from './url';

import { HttpError } from './errors';
import { sleepWithAbort, toError } from './retry';
import { buildRequestInit } from './serialize';
import {
  buildTimeoutSignal,
  createTransportCore,
  validateTimeout,
  type Interceptor,
  type TransportCore,
  type TransportOptions,
} from './transport';
import { buildUrl } from './url';

export type StreamRequestConfig<P extends string = string> = {
  body?: unknown;
  headers?: Record<string, string>;
  method?: string;
  params?: P extends string ? Record<string, string | number | boolean> : never;
  query?: Params;
  /** External abort signal. Merged with internal cancellation. */
  signal?: AbortSignal;
  /** Request timeout in ms. Overrides client default (which is `Infinity` for streaming). */
  timeout?: number;
} & Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'>;

export type ReconnectOptions = {
  /** Total reconnect attempts after the first failure. Defaults to `5`. */
  maxAttempts?: number;
  /**
   * Delay between reconnect attempts in ms, or a zero-based function where
   * `attempt` is the number of failures so far (0 = waiting before the 2nd try).
   * Defaults to full-jitter exponential backoff: `[0, min(1s × 2ⁿ, 30s)]`.
   */
  retryDelay?: number | ((attempt: number) => number);
};

export type SseOptions<P extends string = string> = StreamRequestConfig<P> & {
  /**
   * Called when the connection is permanently lost (reconnect budget exhausted due to error).
   * Not called on `close()` or `dispose()`.
   */
  onError?: (error: Error) => void;
  /**
   * Auto-reconnect on connection loss with exponential backoff.
   * `true` uses defaults (5 attempts). Defaults to `false`.
   */
  reconnect?: boolean | ReconnectOptions;
};

/**
 * Typed SSE event source. `TEvents` maps event name → data type.
 * Non-string data values are automatically JSON-parsed from the raw `data:` field.
 * If parsing fails the raw string is delivered instead.
 */
export type SseSource<TEvents extends Record<string, unknown> = Record<string, string>> = {
  /** Permanently closes the SSE connection. No further events will be dispatched. */
  close(): void;
  /**
   * Registers a handler for a named SSE event. Returns an unsubscribe function.
   * The special name `'message'` matches events without an explicit `event:` field.
   * Calling `on()` after `close()` returns a no-op unsubscribe.
   */
  on<K extends keyof TEvents & string>(event: K, handler: (data: TEvents[K]) => void): () => void;
};

const DEFAULT_MAX_RECONNECT_DELAY = 30_000;

function defaultReconnectDelay(attempt: number): number {
  const cap = Math.min(1000 * Math.pow(2, attempt), DEFAULT_MAX_RECONNECT_DELAY);

  return Math.random() * cap;
}

/** Parse a raw SSE data string: try JSON, fall back to raw string. */
function parseEventData(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function createStream(opts?: TransportOptions, sharedTransport?: TransportCore) {
  const ownTransport = !sharedTransport;
  const transport = sharedTransport ?? createTransportCore(opts);

  /**
   * Opens a Server-Sent Events connection and returns a typed source.
   *
   * - Intercepts request through the same pipeline as `createApi` (auth, logging, etc.)
   * - Auto-reconnects with exponential backoff when `reconnect` is set
   * - Sends `Last-Event-ID` header on reconnect to resume from last received event
   * - Non-string event data is automatically JSON-parsed
   *
   * @example
   * ```ts
   * const src = stream.sse<{ message: { text: string }; ping: null }>('/events', {
   *   reconnect: true,
   *   onError: (err) => console.error(err),
   * });
   *
   * src.on('message', (data) => console.log(data.text));
   * src.on('ping', () => {});
   * // later:
   * src.close();
   * ```
   */
  function sse<TEvents extends Record<string, unknown> = Record<string, string>, P extends string = string>(
    url: P,
    config: SseOptions<P> = {} as SseOptions<P>,
  ): SseSource<TEvents> {
    if (transport.disposed) throw new Error('[fetchit] StreamClient has been disposed');

    const {
      body,
      headers: perRequestHeaders,
      method = body !== undefined ? 'POST' : 'GET',
      onError,
      params,
      query,
      reconnect = false,
      signal: extSignal,
      timeout: cfgTimeout,
      ...rest
    } = config as SseOptions;

    if (cfgTimeout !== undefined) validateTimeout(cfgTimeout);

    const listeners = new Map<string, Set<(data: unknown) => void>>();
    const ac = new AbortController();
    // Track `ac` once for the entire SSE lifetime — covers active connections AND
    // reconnect sleep windows, so cancelAll()/dispose() always reach it.
    const untrack = transport.track(ac);
    let closed = false;
    let lastEventId = '';

    const reconnectOpts: ReconnectOptions =
      reconnect === true ? {} : reconnect === false ? { maxAttempts: 0 } : reconnect;
    const maxReconnects = reconnectOpts.maxAttempts ?? (reconnect ? 5 : 0);
    const reconnectDelay = reconnectOpts.retryDelay ?? defaultReconnectDelay;

    function dispatchEvent(event: string, rawData: string): void {
      const handlers = listeners.get(event);

      if (!handlers?.size) return;

      const data = parseEventData(rawData);

      for (const handler of handlers) handler(data);
    }

    async function connect(): Promise<void> {
      const full = buildUrl(transport.baseUrl, url, params as Params | undefined, query);
      const combined = extSignal ? AbortSignal.any([extSignal, ac.signal]) : ac.signal;
      // SSE connections are long-lived — default timeout to Infinity so the
      // transport's REST default (30s) does not cut off streams prematurely.
      const signal = buildTimeoutSignal(cfgTimeout ?? Number.POSITIVE_INFINITY, combined);

      const requestHeaders = transport.mergeHeaders(perRequestHeaders as Record<string, string> | undefined, {
        accept: 'text/event-stream',
        'cache-control': 'no-cache',
        ...(lastEventId ? { 'last-event-id': lastEventId } : {}),
      });

      const init = buildRequestInit(method, requestHeaders, body, signal, rest);

      let res: Response;

      try {
        res = await transport.dispatch({ init, url: full });
      } catch (err) {
        throw HttpError.fromCause(err, method.toUpperCase(), full, ac.signal);
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');

        throw HttpError.fromResponse(res, text, method.toUpperCase(), full);
      }

      if (!res.body) throw new Error('[fetchit] SSE response has no body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = 'message';
      let currentData = '';
      let currentId = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          // Normalise \r\n and \r to \n before processing
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

          let nlIdx: number;

          while ((nlIdx = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, nlIdx);

            buffer = buffer.slice(nlIdx + 1);

            if (line === '') {
              // Empty line → dispatch event
              if (currentData !== '') {
                if (currentId) lastEventId = currentId;

                dispatchEvent(currentEvent, currentData.replace(/\n$/, ''));
              }

              currentEvent = 'message';
              currentData = '';
              currentId = '';
            } else if (line.startsWith(':')) {
              // Comment — ignore
            } else {
              const colonIdx = line.indexOf(':');
              const field = colonIdx === -1 ? line : line.slice(0, colonIdx);
              const value = colonIdx === -1 ? '' : line.slice(colonIdx + 1).replace(/^ /, '');

              if (field === 'event') currentEvent = value;
              else if (field === 'data') currentData += (currentData ? '\n' : '') + value;
              else if (field === 'id' && !value.includes('\0')) currentId = value;
              // 'retry' directive acknowledged but managed via ReconnectOptions
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    }

    async function run(): Promise<void> {
      let attempt = 0;

      try {
        while (!closed && !transport.disposed && !ac.signal.aborted) {
          let connectError: Error | undefined;

          try {
            await connect();
            // Clean server-side close — falls through to reconnect logic below.
            // The attempt counter is intentionally NOT reset here: maxAttempts
            // bounds total reconnects regardless of whether the close was clean or an
            // error, preventing infinite reconnection against servers that always close
            // after a response window (e.g. SSE keepalive patterns).
          } catch (err) {
            if (closed || transport.disposed || ac.signal.aborted) break;

            connectError = toError(err);
          }

          if (closed || transport.disposed || ac.signal.aborted) break;

          // No reconnect budget → fire onError for errors, stop either way
          if (maxReconnects === 0) {
            if (connectError) onError?.(connectError);

            break;
          }

          // Budget exhausted → fire onError for errors, stop
          if (attempt >= maxReconnects) {
            if (connectError) onError?.(connectError);

            break;
          }

          // Budget available → sleep and retry
          const delay = typeof reconnectDelay === 'function' ? reconnectDelay(attempt) : reconnectDelay;

          attempt++;
          await sleepWithAbort(delay, ac.signal).catch(() => {});
        }
      } finally {
        untrack();
      }
    }

    // Surface unexpected programming errors (not network failures) via onError
    run().catch((err) => {
      if (!closed && !transport.disposed) {
        onError?.(toError(err));
      }
    });

    return {
      close(): void {
        closed = true;
        ac.abort();
        listeners.clear();
      },

      on<K extends keyof TEvents & string>(event: K, handler: (data: TEvents[K]) => void): () => void {
        // After close(), return a no-op to avoid silent dead-listener bugs
        if (closed) return () => {};

        if (!listeners.has(event)) listeners.set(event, new Set());

        const set = listeners.get(event)!;

        set.add(handler as (data: unknown) => void);

        return () => set.delete(handler as (data: unknown) => void);
      },
    };
  }

  /**
   * Opens an HTTP streaming connection and returns an async generator yielding
   * response body chunks as they arrive.
   *
   * - `parse: 'text'` (default) — yields raw decoded string chunks
   * - `parse: 'ndjson'` — splits by newline and JSON-parses each line; use `T` to
   *   type the parsed values
   *
   * @example
   * ```ts
   * // Raw text stream
   * for await (const chunk of stream.readable('/completions', { body: { prompt } })) {
   *   process.stdout.write(chunk);
   * }
   *
   * // NDJSON (e.g. AI token stream, log stream)
   * for await (const msg of stream.readable<ChatMessage>('/chat', {
   *   body: { prompt },
   *   parse: 'ndjson',
   * })) {
   *   console.log(msg.content);
   * }
   * ```
   */
  async function* readable<T = string, P extends string = string>(
    url: P,
    config: StreamRequestConfig<P> & { parse?: 'ndjson' | 'text' } = {} as StreamRequestConfig<P> & {
      parse?: 'ndjson' | 'text';
    },
  ): AsyncGenerator<T> {
    if (transport.disposed) throw new Error('[fetchit] StreamClient has been disposed');

    const {
      body,
      headers: perRequestHeaders,
      method = body !== undefined ? 'POST' : 'GET',
      params,
      parse = 'text',
      query,
      signal: extSignal,
      timeout: cfgTimeout,
      ...rest
    } = config as StreamRequestConfig & { parse?: 'ndjson' | 'text' };

    if (cfgTimeout !== undefined) validateTimeout(cfgTimeout);

    const full = buildUrl(transport.baseUrl, url, params as Params | undefined, query);
    const ac = new AbortController();
    const combined = extSignal ? AbortSignal.any([extSignal, ac.signal]) : ac.signal;
    // Readable streams are long-lived — default timeout to Infinity (same as SSE).
    const signal = buildTimeoutSignal(cfgTimeout ?? Number.POSITIVE_INFINITY, combined);

    const requestHeaders = transport.mergeHeaders(perRequestHeaders as Record<string, string> | undefined);
    const init = buildRequestInit(method, requestHeaders, body, signal, rest);
    const untrack = transport.track(ac);

    try {
      let res: Response;

      try {
        res = await transport.dispatch({ init, url: full });
      } catch (err) {
        throw HttpError.fromCause(err, method.toUpperCase(), full, ac.signal);
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');

        throw HttpError.fromResponse(res, text, method.toUpperCase(), full);
      }

      if (!res.body) throw new Error('[fetchit] Response has no body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      try {
        if (parse === 'ndjson') {
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              const remaining = buffer.trim();

              if (remaining) yield JSON.parse(remaining) as T;

              break;
            }

            buffer += decoder.decode(value, { stream: true });

            let nlIdx: number;

            while ((nlIdx = buffer.indexOf('\n')) !== -1) {
              const line = buffer.slice(0, nlIdx).trim();

              buffer = buffer.slice(nlIdx + 1);

              if (line) yield JSON.parse(line) as T;
            }
          }
        } else {
          while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            yield decoder.decode(value, { stream: true }) as unknown as T;
          }
        }
      } finally {
        reader.releaseLock();
      }
    } finally {
      untrack();
    }
  }

  return {
    cancelAll(): void {
      transport.cancelAll();
    },
    dispose(): void {
      if (ownTransport) transport.dispose();
    },
    get disposed() {
      return transport.disposed;
    },
    getHeaders: transport.getHeaders,
    headers: transport.headers,
    readable,
    sse,
    [Symbol.dispose](): void {
      this.dispose();
    },
    use: transport.use as (interceptor: Interceptor) => () => void,
  };
}

export type StreamClient = ReturnType<typeof createStream>;
