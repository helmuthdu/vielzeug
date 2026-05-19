import { createFetchit } from '../index';

describe('createFetchit', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('applies shared mutation defaults to created mutations', async () => {
    const client = createFetchit({
      mutationDefaults: {
        maxAttempts: 2,
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
    const client = createFetchit({
      mutationDefaults: {
        maxAttempts: 3,
      },
    });

    let calls = 0;
    const mutation = client.mutation(
      async () => {
        calls++;
        throw new Error('fail');
      },
      {
        maxAttempts: 1,
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
    const client = createFetchit({
      baseUrl: 'https://stream.example.com',
      fetch: localFetch as typeof fetch,
    });

    const messages: string[] = [];
    const source = client.stream.sse('/events');

    source.on('message', (d: string) => messages.push(d));

    await new Promise((r) => setTimeout(r, 100));
    source.close();

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

    const client = createFetchit({
      baseUrl: 'https://api.example.com',
      fetch: localFetch as typeof fetch,
    });

    await client.api.get('/users/1');
    expect(localFetch).toHaveBeenCalledTimes(1);
    expect(localFetch.mock.calls[0][0]).toBe('https://api.example.com/users/1');
  });

  it('query has isolated configuration', async () => {
    const client = createFetchit({
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

    const client = createFetchit({ fetch: localFetch as typeof fetch });

    client.use(async (ctx, next) => {
      log.push('intercepted');

      return next(ctx);
    });

    await client.api.get('/test');

    const src = client.stream.sse('/events');

    await new Promise((r) => setTimeout(r, 50));
    src.close();

    expect(log).toEqual(['intercepted', 'intercepted']);
  });
});
