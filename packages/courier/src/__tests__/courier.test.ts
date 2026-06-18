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

  describe('mutation() cache shorthands', () => {
    it('invalidates: seeds the cache then invalidates after success', async () => {
      const client = createCourier();
      let fetchCalls = 0;

      await client.query.fetch({
        fn: async () => {
          fetchCalls++;

          return { count: fetchCalls };
        },
        key: ['items'],
        staleTime: 60_000,
      });

      expect(fetchCalls).toBe(1);

      const mut = client.mutation(async () => 'ok', {
        invalidates: [['items']],
      });

      await mut.mutate(undefined);

      // entry evicted (no observers) — next fetch goes to network
      await client.query.fetch({
        fn: async () => {
          fetchCalls++;

          return { count: fetchCalls };
        },
        key: ['items'],
        staleTime: 60_000,
      });

      expect(fetchCalls).toBe(2);
      client.dispose();
    });

    it('sets: writes multiple cache entries on success', async () => {
      const client = createCourier();

      type User = { id: number; name: string };

      const mut = client.mutation<User, { name: string }>(async (input) => ({ id: 42, name: input.name }), {
        sets: (user) => [
          [['users', user.id], user],
          [['users', 'latest'], user],
        ],
      });

      await mut.mutate({ name: 'Alice' });

      expect(client.query.get<User>(['users', 42])).toEqual({ id: 42, name: 'Alice' });
      expect(client.query.get<User>(['users', 'latest'])).toEqual({ id: 42, name: 'Alice' });
      client.dispose();
    });

    it('sets: receives variables as second argument', async () => {
      const client = createCourier();
      let capturedVars: string | undefined;

      const mut = client.mutation<string, string>(async (v) => v.toUpperCase(), {
        sets: (data, variables) => {
          capturedVars = variables;

          return [[['result'], data]];
        },
      });

      await mut.mutate('hello');

      expect(capturedVars).toBe('hello');
      expect(client.query.get<string>(['result'])).toBe('HELLO');
      client.dispose();
    });

    it('sets + invalidates both run before onSuccess', async () => {
      const client = createCourier();
      const order: string[] = [];

      const mut = client.mutation<string, void>(async () => 'data', {
        invalidates: [['to-invalidate']],
        onSuccess: () => {
          order.push('onSuccess');
        },
        sets: (data) => {
          order.push('sets');

          return [[['stored'], data]];
        },
      });

      await client.query.fetch({ fn: async () => 'seed', key: ['to-invalidate'], staleTime: 60_000 });
      await mut.mutate(undefined);

      expect(order).toEqual(['sets', 'onSuccess']);
      expect(client.query.get<string>(['stored'])).toBe('data');
      client.dispose();
    });
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
