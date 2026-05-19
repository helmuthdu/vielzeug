import { createFetchit } from '../index';

describe('createFetchit', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('applies shared mutation defaults to created mutations', async () => {
    const client = createFetchit({
      mutationDefaults: {
        attempts: 2,
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
        attempts: 3,
      },
    });

    let calls = 0;
    const mutation = client.mutation(
      async () => {
        calls++;
        throw new Error('fail');
      },
      {
        attempts: 1,
      },
    );

    await expect(mutation.mutate(undefined)).rejects.toThrow('fail');
    expect(calls).toBe(1);
  });

  it('exposes a stream client with correct options', async () => {
    const localFetch = vi.fn().mockResolvedValue(
      new Response(
        new ReadableStream({
          start(c) {
            c.enqueue(new TextEncoder().encode('data: hello\n\n'));
            c.close();
          },
        }),
        { headers: { 'content-type': 'text/event-stream' }, status: 200 },
      ),
    );

    const client = createFetchit({
      stream: { baseUrl: 'https://stream.example.com', fetch: localFetch as typeof fetch },
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

  it('routes api options only to createApi', async () => {
    const localFetch = vi.fn().mockResolvedValue({
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: true }),
      ok: true,
      status: 200,
    });

    const client = createFetchit({
      api: { baseUrl: 'https://api.example.com', fetch: localFetch as typeof fetch },
      query: { staleTime: 60_000 },
    });

    await client.api.get('/users/1');
    expect(localFetch).toHaveBeenCalledTimes(1);
    expect(localFetch.mock.calls[0][0]).toBe('https://api.example.com/users/1');

    let calls = 0;
    const fn = async () => ({ id: ++calls });

    await client.query.query({ fn, key: ['users', 1] });
    await client.query.query({ fn, key: ['users', 1] });

    // Query options remain isolated and active (staleTime from query config)
    expect(calls).toBe(1);
  });
});
