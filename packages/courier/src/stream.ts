import type { ReconnectOptions, StreamRequestConfig } from './stream-shared';

import { readable, type ReadableConfig } from './stream-readable';
import { sse, type SseOptions, type SseSource, type SseStatus } from './stream-sse';
import { createTransportCore, type TransportCore, type TransportOptions } from './transport';

export type { ReadableConfig, ReconnectOptions, SseOptions, SseSource, SseStatus, StreamRequestConfig };

/**
 * Creates a streaming client exposing `sse()` (Server-Sent Events) and `readable()`
 * (`ReadableStream`/NDJSON). Both share the same interceptor pipeline, header management,
 * and `AbortController` lifecycle as `createApi`.
 *
 * @example
 * ```ts
 * const stream = createStream({ baseUrl: 'https://api.example.com' });
 *
 * const src = stream.sse<{ message: { text: string } }>('/events', { reconnect: true });
 * src.on('message', (data) => console.log(data.text));
 *
 * for await (const chunk of stream.readable('/completions', { body: { prompt } })) {
 *   process.stdout.write(chunk);
 * }
 *
 * // later:
 * stream.dispose();
 * ```
 */
export function createStream(opts?: TransportOptions & { transport?: TransportCore }) {
  const { transport: sharedTransport, ...transportOpts } = opts ?? {};
  const ownTransport = !sharedTransport;
  const transport = sharedTransport ?? createTransportCore(transportOpts);

  return {
    cancelAll(): void {
      transport.cancelAll();
    },
    get disposalSignal() {
      return transport.disposalSignal;
    },
    dispose(): void {
      if (ownTransport) transport.dispose();
    },
    get disposed() {
      return transport.disposed;
    },
    getHeaders: transport.getHeaders,
    headers: transport.headers,
    readable: <T = string, P extends string = string>(url: P, config?: ReadableConfig<P>): AsyncGenerator<T> =>
      readable<T, P>(transport, url, config),
    sse: <TEvents extends Record<string, unknown> = Record<string, string>, P extends string = string>(
      url: P,
      config?: SseOptions<P>,
    ): SseSource<TEvents> => sse<TEvents, P>(transport, url, config),
    [Symbol.dispose](): void {
      this.dispose();
    },
    use: transport.use,
  };
}

export type StreamClient = ReturnType<typeof createStream>;
