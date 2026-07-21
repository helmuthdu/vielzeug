import { sleep } from '@vielzeug/arsenal';

import type { Params } from './url';

import { CourierDisposedError } from './errors';
import { fullJitterDelay } from './retry';
import { openStreamWith, type ReconnectOptions, type StreamRequestConfig } from './stream-shared';
import { type TransportCore, validateTimeout } from './transport';

export type SseOptions<P extends string = string> = StreamRequestConfig<P> & {
  /**
   * Called when the connection is permanently lost (reconnect budget exhausted due to error).
   * Not called on `dispose()`.
   */
  onError?: (error: Error) => void;
  /**
   * Auto-reconnect on connection loss with exponential backoff.
   * `true` uses defaults (5 attempts). Defaults to `false`.
   */
  reconnect?: boolean | ReconnectOptions;
};

/** Connection lifecycle status for an SSE source. */
export type SseStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

/**
 * Typed SSE event source. `TEvents` maps event name → data type.
 * Non-string data values are automatically JSON-parsed from the raw `data:` field.
 * If parsing fails the raw string is delivered instead.
 */
export type SseSource<TEvents extends Record<string, unknown> = Record<string, string>> = {
  [Symbol.dispose](): void;
  /** `true` after `dispose()` is called or the reconnect budget is exhausted. */
  readonly closed: boolean;
  /** Permanently closes the SSE connection. No further events will be dispatched. */
  dispose(): void;
  /**
   * Registers a handler for a named SSE event. Returns an unsubscribe function.
   * The special name `'message'` matches events without an explicit `event:` field.
   * Calling `on()` after `dispose()` returns a no-op unsubscribe.
   */
  on<K extends keyof TEvents & string>(event: K, handler: (data: TEvents[K]) => void): () => void;
  /** Current connection lifecycle status. Useful for displaying a live-connection indicator. */
  readonly status: SseStatus;
};

/** Parse a raw SSE data string: try JSON, fall back to raw string. */
function parseEventData(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

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
 * src.dispose();
 * ```
 */
export function sse<TEvents extends Record<string, unknown> = Record<string, string>, P extends string = string>(
  transport: TransportCore,
  url: P,
  config: SseOptions<P> = {} as SseOptions<P>,
): SseSource<TEvents> {
  if (transport.disposed) throw new CourierDisposedError('StreamClient');

  const {
    body,
    fetchInit,
    headers: perRequestHeaders,
    method = body !== undefined ? 'POST' : 'GET',
    onError,
    params,
    query,
    reconnect = false,
    signal: extSignal,
    timeout: cfgTimeout,
  } = config as SseOptions;

  if (cfgTimeout !== undefined) validateTimeout(cfgTimeout);

  const listeners = new Map<string, Set<(data: unknown) => void>>();
  const ac = new AbortController();
  // Track `ac` once for the entire SSE lifetime — covers active connections AND
  // reconnect sleep windows, so cancelAll()/dispose() always reach it.
  const untrack = transport.track(ac);
  let closed = false;
  let sseStatus: SseStatus = 'connecting';
  let lastEventId = '';

  const reconnectOpts: ReconnectOptions = reconnect === true ? {} : reconnect === false ? { times: 0 } : reconnect;
  const maxReconnects = reconnectOpts.times ?? (reconnect ? 5 : 0);
  // `activeReconnectDelay` is mutable so the server's `retry:` field can update
  // the reconnection interval without the caller needing to handle it manually.
  let activeReconnectDelay: number | ((attempt: number) => number) = reconnectOpts.delay ?? fullJitterDelay;

  function dispatchEvent(event: string, rawData: string): void {
    const handlers = listeners.get(event);

    if (!handlers?.size) return;

    const data = parseEventData(rawData);

    for (const handler of handlers) handler(data);
  }

  async function connect(): Promise<void> {
    const res = await openStreamWith(
      transport,
      url,
      ac,
      {
        body,
        extSignal,
        fetchInit,
        headers: perRequestHeaders as Record<string, string> | undefined,
        method,
        params: params as Params | undefined,
        query,
        timeout: cfgTimeout,
      },
      {
        accept: 'text/event-stream',
        'cache-control': 'no-cache',
        ...(lastEventId ? { 'last-event-id': lastEventId } : {}),
      },
    );

    const reader = res.body!.getReader();
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
            else if (field === 'retry') {
              // Honor the server's advised reconnect interval (SSE spec §9.2.6).
              const ms = parseInt(value, 10);

              if (!Number.isNaN(ms)) activeReconnectDelay = ms;
            }
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

        sseStatus = 'connecting';

        try {
          sseStatus = 'open';
          await connect();
          // Clean server-side close — falls through to reconnect logic below.
          // The attempt counter is intentionally NOT reset here: `times`
          // bounds total reconnects regardless of whether the close was clean or an
          // error, preventing infinite reconnection against servers that always close
          // after a response window (e.g. SSE keepalive patterns).
        } catch (err) {
          if (closed || transport.disposed || ac.signal.aborted) break;

          connectError = err instanceof Error ? err : new Error(String(err));
        }

        if (closed || transport.disposed || ac.signal.aborted) break;

        // No reconnect budget → fire onError for errors, stop either way
        if (maxReconnects === 0) {
          if (connectError) onError?.(connectError);

          break;
        }

        // Budget exhausted → always signal via onError so the caller knows
        // the reconnect cycle has ended (whether the close was clean or not).
        if (attempt >= maxReconnects) {
          onError?.(connectError ?? new Error('[courier] SSE reconnect budget exhausted'));

          break;
        }

        // Budget available → sleep and retry
        sseStatus = 'reconnecting';

        const delay = typeof activeReconnectDelay === 'function' ? activeReconnectDelay(attempt) : activeReconnectDelay;

        attempt++;
        await sleep(delay, ac.signal).catch(() => {});
      }
    } finally {
      sseStatus = 'closed';
      untrack();
    }
  }

  // Surface unexpected programming errors (not network failures) via onError
  run().catch((err) => {
    if (!closed && !transport.disposed) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  });

  return {
    get closed(): boolean {
      return closed;
    },

    dispose(): void {
      closed = true;
      ac.abort();
      listeners.clear();
    },

    on<K extends keyof TEvents & string>(event: K, handler: (data: TEvents[K]) => void): () => void {
      // After dispose(), return a no-op to avoid silent dead-listener bugs
      if (closed) return () => {};

      let set = listeners.get(event);

      if (!set) {
        set = new Set<(data: unknown) => void>();
        listeners.set(event, set);
      }

      set.add(handler as (data: unknown) => void);

      return () => set.delete(handler as (data: unknown) => void);
    },

    get status(): SseStatus {
      return sseStatus;
    },

    [Symbol.dispose](): void {
      this.dispose();
    },
  };
}
