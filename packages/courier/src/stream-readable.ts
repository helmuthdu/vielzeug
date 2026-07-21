import { sleep } from '@vielzeug/arsenal';

import type { Params } from './url';

import { CourierDisposedError, CourierParseError } from './errors';
import { fullJitterDelay } from './retry';
import { openStreamWith, type ReconnectOptions, type StreamRequestConfig } from './stream-shared';
import { type TransportCore, validateTimeout } from './transport';

export type ReadableConfig<P extends string = string> = StreamRequestConfig<P> & {
  /**
   * Called when the reconnect budget is exhausted or a non-retriable error
   * occurs. Not called when the generator is aborted via signal or dispose.
   */
  onError?: (error: Error) => void;
  /**
   * Response body parsing mode.
   * - `'text'` (default) — yields raw decoded string chunks as they arrive.
   * - `'ndjson'` — splits by newline and JSON-parses each complete line; use `T` to type the values.
   */
  parse?: 'ndjson' | 'text';
  /**
   * Auto-reconnect on connection loss. Uses the same backoff semantics as
   * `sse()` reconnect. `true` uses defaults (5 attempts). Defaults to `false`.
   */
  reconnect?: boolean | ReconnectOptions;
};

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
export async function* readable<T = string, P extends string = string>(
  transport: TransportCore,
  url: P,
  config: ReadableConfig<P> = {} as ReadableConfig<P>,
): AsyncGenerator<T> {
  if (transport.disposed) throw new CourierDisposedError('StreamClient');

  const {
    body,
    fetchInit,
    headers: perRequestHeaders,
    method = body !== undefined ? 'POST' : 'GET',
    onError,
    params,
    parse = 'text',
    query,
    reconnect = false,
    signal: extSignal,
    timeout: cfgTimeout,
  } = config as ReadableConfig;

  if (cfgTimeout !== undefined) validateTimeout(cfgTimeout);

  const reconnectOpts: ReconnectOptions = reconnect === true ? {} : reconnect === false ? { times: 0 } : reconnect;
  const maxReconnects = reconnectOpts.times ?? (reconnect ? 5 : 0);
  const reconnectDelay: number | ((attempt: number) => number) = reconnectOpts.delay ?? fullJitterDelay;

  const ac = new AbortController();
  const untrack = transport.track(ac);
  let attempt = 0;
  let overallNaturalEnd = false;

  try {
    while (!transport.disposed && !ac.signal.aborted) {
      let connectError: Error | undefined;
      let connectionNaturalEnd = false;

      try {
        const res = await openStreamWith(transport, url, ac, {
          body,
          extSignal,
          fetchInit,
          headers: perRequestHeaders as Record<string, string> | undefined,
          method,
          params: params as Params | undefined,
          query,
          timeout: cfgTimeout,
        });

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();

        try {
          if (parse === 'ndjson') {
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                const remaining = buffer.trim();

                if (remaining) {
                  try {
                    yield JSON.parse(remaining) as T;
                  } catch {
                    throw new CourierParseError(`NDJSON: failed to parse line: ${remaining.slice(0, 200)}`);
                  }
                }

                connectionNaturalEnd = true;
                break;
              }

              buffer += decoder.decode(value, { stream: true });

              let nlIdx: number;

              while ((nlIdx = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, nlIdx).trim();

                buffer = buffer.slice(nlIdx + 1);

                if (line) {
                  try {
                    yield JSON.parse(line) as T;
                  } catch {
                    throw new CourierParseError(`NDJSON: failed to parse line: ${line.slice(0, 200)}`);
                  }
                }
              }
            }
          } else {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                connectionNaturalEnd = true;
                break;
              }

              yield decoder.decode(value, { stream: true }) as unknown as T;
            }
          }
        } finally {
          reader.releaseLock();
        }
      } catch (err) {
        if (transport.disposed || ac.signal.aborted) break;

        connectError = err instanceof Error ? err : new Error(String(err));
      }

      if (transport.disposed || ac.signal.aborted) break;

      // No reconnect budget — throw or call onError on errors, stop either way
      if (maxReconnects === 0) {
        if (connectError) {
          if (onError) {
            onError(connectError);
          } else {
            throw connectError;
          }
        } else {
          overallNaturalEnd = connectionNaturalEnd;
        }

        break;
      }

      // Budget exhausted
      if (attempt >= maxReconnects) {
        const budgetError = connectError ?? new Error('[courier] readable() reconnect budget exhausted');

        if (onError) {
          onError(budgetError);
        } else if (connectError) {
          throw connectError;
        }

        break;
      }

      // Clean server close with no reconnect error — done
      if (connectionNaturalEnd && !connectError) {
        overallNaturalEnd = true;
        break;
      }

      // Sleep before reconnecting
      const delay = typeof reconnectDelay === 'function' ? reconnectDelay(attempt) : reconnectDelay;

      attempt++;
      await sleep(delay, ac.signal).catch(() => {});
    }
  } finally {
    if (!overallNaturalEnd) ac.abort();

    untrack();
  }
}
