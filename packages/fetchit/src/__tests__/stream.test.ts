import { createStream, HttpError } from '../index';

// ─── SSE helpers ────────────────────────────────────────────────────────────

/** Build a ReadableStream that pushes SSE-formatted chunks. */
function sseStream(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

function sseResponse(body: ReadableStream<Uint8Array>, status = 200): Response {
  return new Response(body, {
    headers: { 'content-type': 'text/event-stream' },
    status,
  });
}

/** Collect emitted values into an array via the `on` handler. */
function collect<T>(source: { on: (ev: string, h: (d: T) => void) => () => void }, event = 'message'): T[] {
  const items: T[] = [];

  source.on(event, (d) => items.push(d));

  return items;
}

/** Wait for a condition to be true (polling). */
async function waitFor(condition: () => boolean, timeout = 500): Promise<void> {
  const deadline = Date.now() + timeout;

  while (!condition()) {
    if (Date.now() > deadline) throw new Error('waitFor timed out');

    await new Promise((r) => setTimeout(r, 10));
  }
}

// ─── ReadableStream helpers ──────────────────────────────────────────────────

function textStreamResponse(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      start(c) {
        for (const chunk of chunks) c.enqueue(encoder.encode(chunk));
        c.close();
      },
    }),
    { headers: { 'content-type': 'text/plain' }, status },
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('createStream — sse()', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('dispatches a simple message event', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });

    fetchMock.mockResolvedValue(sseResponse(sseStream('data: hello world\n\n')));

    const source = stream.sse('/events');
    const messages = collect<string>(source);

    await waitFor(() => messages.length > 0);
    source.close();

    expect(messages).toEqual(['hello world']);
  });

  it('dispatches typed named events', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });

    fetchMock.mockResolvedValue(sseResponse(sseStream('event: user-joined\ndata: {"id":1,"name":"Alice"}\n\n')));

    interface Events {
      'user-joined': { id: number; name: string };
    }

    const source = stream.sse<Events>('/events');
    const joined: Events['user-joined'][] = [];

    source.on('user-joined', (d) => joined.push(d));

    await waitFor(() => joined.length > 0);
    source.close();

    expect(joined).toEqual([{ id: 1, name: 'Alice' }]);
  });

  it('falls back to raw string when JSON parse fails', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });

    fetchMock.mockResolvedValue(sseResponse(sseStream('data: plain text\n\n')));

    const source = stream.sse('/events');
    const messages = collect<string>(source);

    await waitFor(() => messages.length > 0);
    source.close();

    expect(messages).toEqual(['plain text']);
  });

  it('handles multi-line data fields', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });

    fetchMock.mockResolvedValue(sseResponse(sseStream('data: line1\ndata: line2\n\n')));

    const source = stream.sse('/events');
    const messages = collect<string>(source);

    await waitFor(() => messages.length > 0);
    source.close();

    expect(messages).toEqual(['line1\nline2']);
  });

  it('ignores comment lines', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });

    fetchMock.mockResolvedValue(sseResponse(sseStream(': keep-alive\ndata: hi\n\n')));

    const source = stream.sse('/events');
    const messages = collect<string>(source);

    await waitFor(() => messages.length > 0);
    source.close();

    expect(messages).toEqual(['hi']);
  });

  it('dispatches multiple events from a single chunk', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });

    fetchMock.mockResolvedValue(sseResponse(sseStream('data: one\n\ndata: two\n\ndata: three\n\n')));

    const source = stream.sse('/events');
    const messages = collect<string>(source);

    await waitFor(() => messages.length === 3);
    source.close();

    expect(messages).toEqual(['one', 'two', 'three']);
  });

  it('handles chunks split across read() calls', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });
    const encoder = new TextEncoder();

    // Split 'data: hello\n\n' across two reads
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(encoder.encode('data: hel'));
        c.enqueue(encoder.encode('lo\n\n'));
        c.close();
      },
    });

    fetchMock.mockResolvedValue(sseResponse(body));

    const source = stream.sse('/events');
    const messages = collect<string>(source);

    await waitFor(() => messages.length > 0);
    source.close();

    expect(messages).toEqual(['hello']);
  });

  it('sends Last-Event-ID on reconnect', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });
    const encoder = new TextEncoder();

    // First connection: sends event with id, then closes
    let callCount = 0;

    fetchMock.mockImplementation(() => {
      callCount++;

      if (callCount === 1) {
        return Promise.resolve(sseResponse(sseStream('id: 42\ndata: first\n\n')));
      }

      // Second connection: hangs (we'll close it)
      return Promise.resolve(
        sseResponse(
          new ReadableStream({
            start(c) {
              c.enqueue(encoder.encode('data: second\n\n'));
              c.close();
            },
          }),
        ),
      );
    });

    const source = stream.sse('/events', { reconnect: { maxAttempts: 1, retryDelay: 0 } });
    const messages = collect<string>(source);

    await waitFor(() => messages.length >= 2);
    source.close();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers['last-event-id']).toBe('42');
  });

  it('sets accept and cache-control headers', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });

    fetchMock.mockResolvedValue(sseResponse(sseStream('data: hi\n\n')));

    const source = stream.sse('/events');

    await waitFor(() => fetchMock.mock.calls.length > 0);
    source.close();

    const { headers } = fetchMock.mock.calls[0][1];

    expect(headers['accept']).toBe('text/event-stream');
    expect(headers['cache-control']).toBe('no-cache');
  });

  it('uses POST when body is provided', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });

    fetchMock.mockResolvedValue(sseResponse(sseStream('data: ok\n\n')));

    const source = stream.sse('/events', { body: { filter: 'active' } });

    await waitFor(() => fetchMock.mock.calls.length > 0);
    source.close();

    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ filter: 'active' }));
  });

  it('close() stops event dispatch immediately', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });
    const encoder = new TextEncoder();

    let controllerRef: ReadableStreamDefaultController<Uint8Array>;

    const body = new ReadableStream<Uint8Array>({
      start(c) {
        controllerRef = c;
      },
    });

    fetchMock.mockResolvedValue(sseResponse(body));

    const source = stream.sse('/events');
    const messages = collect<string>(source);

    await waitFor(() => fetchMock.mock.calls.length > 0);
    source.close();

    // Push an event AFTER close — should not be dispatched
    controllerRef!.enqueue(encoder.encode('data: late\n\n'));
    controllerRef!.close();

    await new Promise((r) => setTimeout(r, 50));

    expect(messages).toHaveLength(0);
  });

  it('unsubscribe() removes a specific handler', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });
    let callCount = 0;

    fetchMock.mockResolvedValue(sseResponse(sseStream('data: one\n\ndata: two\n\ndata: three\n\n')));

    const source = stream.sse('/events');
    const unsub = source.on('message', () => {
      if (++callCount === 1) unsub();
    });

    await waitFor(() => fetchMock.mock.calls.length > 0);
    await new Promise((r) => setTimeout(r, 100));
    source.close();

    // Only the first event triggers the handler before unsub
    expect(callCount).toBe(1);
  });

  it('calls onError when reconnect attempts are exhausted', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });

    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const errors: Error[] = [];
    const source = stream.sse('/events', {
      onError: (e) => errors.push(e),
      reconnect: { maxAttempts: 2, retryDelay: 0 },
    });

    await waitFor(() => errors.length > 0);
    source.close();

    // 1 initial + 2 reconnect attempts = 3 total calls
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(Error);
  });

  it('runs request through the interceptor pipeline', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });
    const log: string[] = [];

    stream.use(async (ctx, next) => {
      log.push('before');

      const res = await next(ctx);

      log.push('after');

      return res;
    });

    fetchMock.mockResolvedValue(sseResponse(sseStream('data: hi\n\n')));

    const source = stream.sse('/events');

    await waitFor(() => log.includes('after'));
    source.close();

    expect(log).toEqual(['before', 'after']);
  });

  it('merges global and per-request headers', async () => {
    const stream = createStream({
      baseUrl: 'https://api.example.com',
      headers: { authorization: 'Bearer token' },
    });

    fetchMock.mockResolvedValue(sseResponse(sseStream('data: hi\n\n')));

    const source = stream.sse('/events', { headers: { 'x-tenant': 'acme' } });

    await waitFor(() => fetchMock.mock.calls.length > 0);
    source.close();

    const { headers } = fetchMock.mock.calls[0][1];

    expect(headers['authorization']).toBe('Bearer token');
    expect(headers['x-tenant']).toBe('acme');
  });

  it('throws HttpError on non-OK response', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });

    fetchMock.mockResolvedValue(new Response('Forbidden', { status: 403, statusText: 'Forbidden' }));

    const errors: Error[] = [];

    stream.sse('/events', { onError: (e) => errors.push(e), reconnect: false });

    await waitFor(() => errors.length > 0);

    expect(errors[0]).toBeInstanceOf(HttpError);
    expect((errors[0] as HttpError).status).toBe(403);
  });

  it('sse() after dispose() throws synchronously', () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });

    stream.dispose();

    expect(() => stream.sse('/events')).toThrow(/disposed/i);
  });

  it('on() after close() returns a no-op unsubscribe without throwing', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });

    fetchMock.mockResolvedValue(sseResponse(sseStream('data: hi\n\n')));

    const source = stream.sse('/events');

    await waitFor(() => fetchMock.mock.calls.length > 0);
    source.close();

    // on() after close() must not throw and must return a callable no-op
    const unsub = source.on('message', () => {});

    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });

  it('dispose() during reconnect sleep stops the reconnect loop', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });

    // Always reject so the loop enters the reconnect sleep
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const source = stream.sse('/events', {
      reconnect: { maxAttempts: 10, retryDelay: 200 },
    });

    // Wait for the first attempt to fail and enter sleep
    await waitFor(() => fetchMock.mock.calls.length >= 1);

    const callsBefore = fetchMock.mock.calls.length;

    stream.dispose();

    // Wait longer than the 200ms sleep; no additional calls should be made
    await new Promise((r) => setTimeout(r, 300));

    expect(fetchMock.mock.calls.length).toBe(callsBefore);
    expect(stream.disposed).toBe(true);
    source.close();
  });

  it('cancelAll() during reconnect sleep stops the reconnect loop', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });

    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const source = stream.sse('/events', {
      reconnect: { maxAttempts: 10, retryDelay: 200 },
    });

    await waitFor(() => fetchMock.mock.calls.length >= 1);

    const callsBefore = fetchMock.mock.calls.length;

    stream.cancelAll();

    await new Promise((r) => setTimeout(r, 300));

    expect(fetchMock.mock.calls.length).toBe(callsBefore);
    expect(stream.disposed).toBe(false); // cancelAll doesn't dispose
    source.close();
  });

  it('dispose() aborts all active SSE connections', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });
    let aborted = false;

    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init.signal?.addEventListener('abort', () => {
            aborted = true;
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );

    stream.sse('/events');
    await waitFor(() => fetchMock.mock.calls.length > 0);
    stream.dispose();

    await new Promise((r) => setTimeout(r, 50));
    expect(aborted).toBe(true);
    expect(stream.disposed).toBe(true);
  });
});

describe('createStream — readable()', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('yields text chunks as they arrive', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });

    fetchMock.mockResolvedValue(textStreamResponse(['Hello', ' ', 'World']));

    const chunks: string[] = [];

    for await (const chunk of stream.readable('/text')) {
      chunks.push(chunk);
    }

    expect(chunks.join('')).toBe('Hello World');
  });

  it('parses ndjson lines and yields typed objects', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });

    fetchMock.mockResolvedValue(textStreamResponse(['{"id":1}\n', '{"id":2}\n', '{"id":3}\n']));

    interface Row {
      id: number;
    }

    const rows: Row[] = [];

    for await (const row of stream.readable<Row>('/stream', { parse: 'ndjson' })) {
      rows.push(row);
    }

    expect(rows).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it('handles ndjson line split across chunks', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });
    const encoder = new TextEncoder();

    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(encoder.encode('{"val":1}\n{"val":'));
        c.enqueue(encoder.encode('2}\n'));
        c.close();
      },
    });

    fetchMock.mockResolvedValue(new Response(body, { status: 200 }));

    const items: { val: number }[] = [];

    for await (const item of stream.readable<{ val: number }>('/stream', { parse: 'ndjson' })) {
      items.push(item);
    }

    expect(items).toEqual([{ val: 1 }, { val: 2 }]);
  });

  it('uses POST when body is provided', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });

    fetchMock.mockResolvedValue(textStreamResponse(['ok']));

    for await (const _ of stream.readable('/stream', { body: { prompt: 'hello' } })) {
      /* drain */
    }

    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
  });

  it('throws HttpError on non-OK response', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });

    fetchMock.mockResolvedValue(new Response('Not Found', { status: 404 }));

    await expect(async () => {
      for await (const _ of stream.readable('/missing')) {
        /* drain */
      }
    }).rejects.toBeInstanceOf(HttpError);
  });

  it('throws when disposed', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });

    stream.dispose();

    await expect(async () => {
      for await (const _ of stream.readable('/stream')) {
        /* drain */
      }
    }).rejects.toThrow(/disposed/i);
  });

  it('aborts mid-stream when signal fires', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });
    const encoder = new TextEncoder();
    const ac = new AbortController();

    let controllerRef: ReadableStreamDefaultController<Uint8Array>;

    const body = new ReadableStream<Uint8Array>({
      start(c) {
        controllerRef = c;
        c.enqueue(encoder.encode('chunk1'));
      },
    });

    fetchMock.mockResolvedValue(new Response(body, { status: 200 }));

    const chunks: string[] = [];

    const gen = stream.readable('/stream', { signal: ac.signal });

    const first = await gen.next();

    chunks.push(first.value!);

    // Abort before consuming more
    ac.abort();
    controllerRef!.close();

    // Drain remaining (will stop because signal is aborted)
    for await (const chunk of gen) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['chunk1']);
  });

  it('runs through the interceptor pipeline', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });
    const trace: string[] = [];

    stream.use(async (ctx, next) => {
      trace.push('in');

      const res = await next(ctx);

      trace.push('out');

      return res;
    });

    fetchMock.mockResolvedValue(textStreamResponse(['data']));

    for await (const _ of stream.readable('/stream')) {
      /* drain */
    }

    expect(trace).toEqual(['in', 'out']);
  });

  it('[Symbol.dispose] delegates to dispose()', () => {
    const stream = createStream();

    expect(stream.disposed).toBe(false);
    stream[Symbol.dispose]();
    expect(stream.disposed).toBe(true);
  });

  it('cancelAll() aborts all in-flight streams', async () => {
    const stream = createStream({ baseUrl: 'https://api.example.com' });
    let aborted = false;

    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init.signal?.addEventListener('abort', () => {
            aborted = true;
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );

    const gen = stream.readable('/slow');

    // Start consuming (triggers fetch)
    const readPromise = gen.next().catch(() => {});

    await waitFor(() => fetchMock.mock.calls.length > 0);
    stream.cancelAll();
    await readPromise;

    expect(aborted).toBe(true);
    expect(stream.disposed).toBe(false);
  });
});
