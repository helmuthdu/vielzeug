import { createCourier } from '../index';

describe('createCourier', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('applies shared mutation defaults to created mutations', async () => {
    const client = createCourier({
      mutationDefaults: {
        times: 2,
      },
    });

    let calls = 0;
    const mutation = client.mutation(async () => {
      if (++calls < 2) {
        throw new Error('retry');
      }

      return 'ok';
    });

    await expect(mutation.mutate(undefined)).resolves.toBe('ok');
    expect(calls).toBe(2);
  });

  it('allows per-mutation options to override defaults', async () => {
    const client = createCourier({
      mutationDefaults: {
        times: 3,
      },
    });

    let calls = 0;
    const mutation = client.mutation(
      async () => {
        calls++;
        throw new Error('fail');
      },
      {
        times: 1,
      },
    );

    await expect(mutation.mutate(undefined)).rejects.toThrow('fail');
    expect(calls).toBe(1);
  });

  it('exposes a stream client with correct options', async () => {
    const encoder = new TextEncoder();
    const localFetch = vi.fn().mockResolvedValue(
      new Response(
        new ReadableStream({
          start(c) {
            c.enqueue(encoder.encode('data: hello\n\n'));
            c.close();
          },
        }),
        { headers: { 'content-type': 'text/event-stream' }, status: 200 },
      ),
    );

    // With the shared transport design, both api and stream use the same fetch/baseUrl.
    const client = createCourier({
      baseUrl: 'https://stream.example.com',
      fetch: localFetch as typeof fetch,
    });

    const messages: string[] = [];
    const source = client.stream.sse('/events');

    source.on('message', (d: string) => messages.push(d));

    await new Promise((r) => setTimeout(r, 100));
    source.dispose();

    expect(localFetch).toHaveBeenCalledTimes(1);
    expect(localFetch.mock.calls[0][0]).toBe('https://stream.example.com/events');
    expect(messages).toEqual(['hello']);
  });

  it('api and stream share the same baseUrl and fetch', async () => {
    const localFetch = vi.fn().mockResolvedValue({
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: true }),
      ok: true,
      status: 200,
    });

    const client = createCourier({
      baseUrl: 'https://api.example.com',
      fetch: localFetch as typeof fetch,
    });

    await client.api.get('/users/1');
    expect(localFetch).toHaveBeenCalledTimes(1);
    expect(localFetch.mock.calls[0][0]).toBe('https://api.example.com/users/1');
  });

  it('query has isolated configuration', async () => {
    const client = createCourier({
      query: { staleTime: 60_000 },
    });

    let calls = 0;
    const fn = async () => ({ id: ++calls });

    await client.query.fetch({ fn, key: ['users', 1] });
    await client.query.fetch({ fn, key: ['users', 1] });

    // staleTime prevents re-fetching the same key
    expect(calls).toBe(1);
  });

  it('interceptors registered via use() apply to both api and stream', async () => {
    const log: string[] = [];
    const encoder = new TextEncoder();

    const localFetch = vi
      .fn()
      .mockResolvedValueOnce({
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ ok: true }),
        ok: true,
        status: 200,
      })
      .mockResolvedValueOnce(
        new Response(
          new ReadableStream({
            start(c) {
              c.enqueue(encoder.encode('data: hi\n\n'));
              c.close();
            },
          }),
          { headers: { 'content-type': 'text/event-stream' }, status: 200 },
        ),
      );

    const client = createCourier({ fetch: localFetch as typeof fetch });

    client.use(async (ctx, next) => {
      log.push('intercepted');

      return next(ctx);
    });

    await client.api.get('/test');

    const src = client.stream.sse('/events');

    await new Promise((r) => setTimeout(r, 50));
    src.dispose();

    expect(log).toEqual(['intercepted', 'intercepted']);
  });

  it('dispose() marks the client as disposed and api/stream throw thereafter', async () => {
    const client = createCourier();

    expect(client.disposed).toBe(false);
    client.dispose();
    expect(client.disposed).toBe(true);

    await expect(client.api.get('/test')).rejects.toThrow(/disposed/i);
  });

  it('[Symbol.dispose] delegates to dispose()', () => {
    const client = createCourier();

    client[Symbol.dispose]();
    expect(client.disposed).toBe(true);
  });

  it('headers() and getHeaders() round-trip on the shared transport', async () => {
    const client = createCourier({ headers: { 'x-app': 'v1' } });

    expect(client.api.getHeaders()['x-app']).toBe('v1');

    client.headers({ 'x-app': 'v2' });

    expect(client.api.getHeaders()['x-app']).toBe('v2');
  });

  it('cancelAll() aborts both transport requests and in-flight query cache fetches', async () => {
    const aborted: string[] = [];
    const localFetch = vi.fn().mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init.signal?.addEventListener('abort', () => {
            aborted.push('api');
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );

    const client = createCourier({ fetch: localFetch as typeof fetch });

    // Start an api request
    const apiPromise = client.api.get('/slow').catch(() => {});

    // Start a query cache fetch (uses its own AbortController)
    const queryPromise = client.query
      .fetch({
        fn: ({ signal }) =>
          new Promise<unknown>((_, reject) => {
            signal.addEventListener('abort', () => {
              aborted.push('query');
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }),
        key: ['slow'],
      })
      .catch(() => {});

    client.cancelAll();

    await Promise.all([apiPromise, queryPromise]);

    expect(aborted).toContain('api');
    expect(aborted).toContain('query');
    expect(client.disposed).toBe(false);
  });
});
