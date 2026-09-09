import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RequestConfig } from '../index';

import {
  CourierAbortError,
  CourierError,
  CourierParseError,
  CourierSchemaValidationError,
  CourierTimeoutError,
  createCourier,
  withBearerAuth,
  withLogging,
  withRequestId,
} from '../index';

describe('Courier HTTP transport', () => {
  afterEach(() => vi.useRealTimers());

  it('exports a reusable custom-method request config', () => {
    const config: RequestConfig<'/users', { id: number }> = { method: 'LOCK' };
    expect(config.method).toBe('LOCK');
  });

  it('builds requests, validates responses, and applies middleware', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () =>
        new Response(JSON.stringify({ id: 1, name: 'Ada' }), { headers: { 'content-type': 'application/json' } }),
    );
    const courier = createCourier({
      baseUrl: 'https://api.example.com/',
      fetch,
      middleware: [withBearerAuth('token'), withRequestId({ generate: () => 'request-1' })],
    });

    await expect(
      courier.request('/users/{id}', {
        body: { name: 'Ada' },
        method: 'POST',
        params: { id: 'a/b' },
        query: { include: ['roles', 'teams'] },
        schema: { parse: (data) => data as { id: number; name: string } },
      }),
    ).resolves.toEqual({ id: 1, name: 'Ada' });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/users/a%2Fb?include=roles&include=teams',
      expect.objectContaining({
        body: JSON.stringify({ name: 'Ada' }),
        headers: expect.objectContaining({
          authorization: 'Bearer token',
          'content-type': 'application/json',
          'x-request-id': 'request-1',
        }),
        method: 'POST',
      }),
    );
  });

  it('get() defaults to GET and parses the response body', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } }),
    );
    const courier = createCourier({ fetch });

    await expect(courier.get('/profile')).resolves.toEqual({ ok: true });

    expect(fetch).toHaveBeenCalledWith('/profile', expect.objectContaining({ method: 'GET' }));
  });

  it.each([
    ['delete', 'DELETE'],
    ['patch', 'PATCH'],
    ['post', 'POST'],
    ['put', 'PUT'],
  ] as const)('%s() forwards its HTTP method', async (method, expected) => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(null, { status: 204 }));
    const courier = createCourier({ fetch });

    await courier[method]('/profile');

    expect(fetch).toHaveBeenCalledWith('/profile', expect.objectContaining({ method: expected }));
  });

  it('does not deduplicate independent HTTP requests', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } }),
    );
    const courier = createCourier({ fetch });

    await Promise.all([courier.get('/profile'), courier.get('/profile')]);

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('preserves HTTP error bodies and wraps schema failures', async () => {
    const httpCourier = createCourier({
      fetch: vi.fn(
        async () =>
          new Response(JSON.stringify({ code: 'missing' }), {
            headers: { 'content-type': 'application/json' },
            status: 404,
          }),
      ),
    });
    const schemaCourier = createCourier({
      fetch: vi.fn(
        async () => new Response(JSON.stringify({ id: 'wrong' }), { headers: { 'content-type': 'application/json' } }),
      ),
    });

    await expect(httpCourier.get('/users/1')).rejects.toMatchObject({
      data: { code: 'missing' },
      status: 404,
    });
    await expect(
      schemaCourier.get('/users/1', {
        schema: {
          parse: () => {
            throw new Error('id must be a number');
          },
        },
      }),
    ).rejects.toBeInstanceOf(CourierSchemaValidationError);
  });

  it('normalizes request timeouts and rejects requests after disposal', async () => {
    const courier = createCourier({
      fetch: vi.fn<typeof globalThis.fetch>(
        (_, init) =>
          new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('Timed out', 'TimeoutError')));
          }),
      ),
    });

    await expect(courier.get('/slow', { timeout: 1 })).rejects.toBeInstanceOf(CourierTimeoutError);

    courier.dispose();

    await expect(courier.get('/after-disposal')).rejects.toThrow('Courier disposed');
  });

  it('applies immutable logging middleware configured at construction', async () => {
    const logs: string[] = [];
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response('ok', { headers: { 'content-type': 'text/plain' } }),
    );
    const courier = createCourier({ fetch, middleware: [withLogging({ logger: (msg) => logs.push(msg) })] });

    await courier.get('/test');

    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain('GET /test 200');
  });

  it('treats 304 as an HTTP response error because parsed requests do not expose status', async () => {
    const courier = createCourier({ fetch: vi.fn(async () => new Response(null, { status: 304 })) });

    await expect(courier.get('/conditional')).rejects.toMatchObject({ status: 304 });
  });

  it('handles empty JSON response bodies gracefully', async () => {
    const courier = createCourier({
      fetch: vi.fn(async () => new Response('', { headers: { 'content-type': 'application/json' }, status: 200 })),
    });

    await expect(courier.get('/empty')).resolves.toBeUndefined();
  });

  it('cancelAll aborts active requests', async () => {
    const courier = createCourier({
      fetch: vi.fn<typeof globalThis.fetch>(
        (_, init) =>
          new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          }),
      ),
    });

    const pending = courier.get('/slow').catch((error) => error);
    courier.cancelAll();

    await expect(pending).resolves.toBeInstanceOf(Error);
  });

  it('supports custom HTTP methods through request()', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(null, { status: 204 }));
    const courier = createCourier({ fetch });

    await courier.request('/users/1', { method: 'LINK' });

    expect(fetch).toHaveBeenCalledWith('/users/1', expect.objectContaining({ method: 'LINK' }));
  });

  it('preserves root-relative paths when no base URL is configured', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(null, { status: 204 }));
    const courier = createCourier({ fetch });

    await courier.get('/api/users');

    expect(fetch).toHaveBeenCalledWith('/api/users', expect.any(Object));
  });

  it('reports URL and response decoding failures as parse errors', async () => {
    const courier = createCourier({
      fetch: vi.fn(async () => new Response('{bad', { headers: { 'content-type': 'application/json' } })),
    });

    await expect(courier.get('/users/{id}', { params: {} as { id: string } })).rejects.toBeInstanceOf(
      CourierParseError,
    );
    await expect(courier.get('/users')).rejects.toBeInstanceOf(CourierParseError);
  });

  it('preserves middleware errors instead of classifying them as network failures', async () => {
    const failure = new Error('middleware failed');
    const courier = createCourier({
      fetch: vi.fn(async () => new Response(null, { status: 204 })),
      middleware: [async () => Promise.reject(failure)],
    });

    await expect(courier.get('/users')).rejects.toBe(failure);
  });

  it('keeps raw response bodies owned until consumption completes', async () => {
    let requestSignal: AbortSignal | null = null;
    const courier = createCourier({
      fetch: vi.fn(async (_input, init) => {
        requestSignal = init?.signal ?? null;
        return new Response('stream');
      }),
    });
    const response = await courier.get<Response>('/stream', { responseType: 'raw', timeout: Number.POSITIVE_INFINITY });

    courier.dispose();

    expect((requestSignal as AbortSignal | null)?.aborted).toBe(true);
    await expect(response.text()).rejects.toBeDefined();
  });

  it('releases raw response ownership after body consumption', async () => {
    const abort = vi.spyOn(AbortController.prototype, 'abort');
    const courier = createCourier({
      fetch: vi.fn(async () => new Response('complete')),
    });
    const response = await courier.get<Response>('/stream', { responseType: 'raw', timeout: Number.POSITIVE_INFINITY });

    await expect(response.text()).resolves.toBe('complete');
    courier.cancelAll();

    expect(abort).not.toHaveBeenCalled();
    abort.mockRestore();
  });

  it('untracks requests when body serialization fails', async () => {
    const abort = vi.spyOn(AbortController.prototype, 'abort');
    const courier = createCourier({ fetch: vi.fn(async () => new Response(null, { status: 204 })) });
    const body: Record<string, unknown> = {};
    body.self = body;

    await expect(courier.post('/users', { body })).rejects.toBeInstanceOf(CourierParseError);
    courier.cancelAll();

    expect(abort).not.toHaveBeenCalled();
    abort.mockRestore();
  });

  it('enforces GET and isolates logger failures', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(null, { status: 204 }));
    const courier = createCourier({
      fetch,
      middleware: [
        withLogging({
          logger: () => {
            throw new Error('logger failed');
          },
        }),
      ],
    });

    await expect(courier.get('/users', { method: 'POST' } as never)).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith('/users', expect.objectContaining({ method: 'GET' }));
  });

  it('accepts native header inputs and freezes middleware contexts', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(null, { status: 204 }));
    let frozen = false;
    const courier = createCourier({
      fetch,
      headers: new Headers({ 'x-default': 'one' }),
      middleware: [
        async (context, next) => {
          frozen = Object.isFrozen(context) && Object.isFrozen(context.headers) && Object.isFrozen(context.init);
          return next(context);
        },
      ],
    });

    await courier.get('/headers', { headers: [['x-request', 'two']] });

    expect(frozen).toBe(true);
    expect(fetch.mock.calls[0]?.[1]?.headers).toEqual({ 'x-default': 'one', 'x-request': 'two' });
  });

  it('omits bearer authorization when the token provider has no token', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(null, { status: 204 }));
    const courier = createCourier({
      fetch,
      headers: { authorization: 'Bearer stale' },
      middleware: [withBearerAuth(() => undefined)],
    });

    await courier.get('/profile');

    expect(fetch.mock.calls[0]?.[1]?.headers).not.toHaveProperty('authorization');
  });

  it('inserts query parameters before URL fragments', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(null, { status: 204 }));
    const courier = createCourier({ baseUrl: 'https://api.example.com/v1', fetch });

    await courier.get('/users?existing=1#section', { query: { added: 2 } });

    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.example.com/v1/users?existing=1&added=2#section');
  });

  it.each([0.5, 2_147_483_648])('rejects unsupported timeout %s before dispatch', async (timeout) => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(null, { status: 204 }));
    const courier = createCourier({ fetch });

    await expect(courier.get('/timeout', { timeout })).rejects.toBeInstanceOf(CourierError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('classifies cross-realm-shaped timeout and abort failures', async () => {
    const timeout = createCourier({
      fetch: vi.fn(async () => Promise.reject({ message: 'late', name: 'TimeoutError' })),
    });
    const abort = createCourier({ fetch: vi.fn(async () => Promise.reject({ message: 'stop', name: 'AbortError' })) });

    await expect(timeout.get('/timeout')).rejects.toBeInstanceOf(CourierTimeoutError);
    await expect(abort.get('/abort')).rejects.toBeInstanceOf(CourierAbortError);
  });

  it('sets Node duplex for streaming request bodies', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(null, { status: 204 }));
    const courier = createCourier({ fetch });
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1]));
        controller.close();
      },
    });

    await courier.post('/upload', { body });

    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ body, duplex: 'half' });
  });

  it('rejects GET bodies and raw schemas before dispatch', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response('unused'));
    const courier = createCourier({ fetch });

    await expect(courier.get('/users', { body: {} } as never)).rejects.toBeInstanceOf(CourierParseError);
    await expect(
      courier.get('/raw', { responseType: 'raw', schema: { parse: (value: unknown) => value } } as never),
    ).rejects.toBeInstanceOf(CourierParseError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reports locked raw bodies and preserves clone metadata', async () => {
    const locked = createCourier({
      fetch: vi.fn(async () => {
        const response = new Response('locked');
        await response.text();
        return response;
      }),
    });

    await expect(locked.get('/locked', { responseType: 'raw' })).rejects.toBeInstanceOf(CourierParseError);

    const courier = createCourier({
      fetch: vi.fn(async () => {
        const response = new Response('stream');
        Object.defineProperties(response, {
          redirected: { value: true },
          url: { value: 'https://api.example.com/final' },
        });
        return response;
      }),
    });
    const response = await courier.get<Response>('/raw', { responseType: 'raw', timeout: Infinity });
    const clone = response.clone();

    expect(clone.url).toBe(response.url);
    expect(clone.redirected).toBe(response.redirected);
    await Promise.all([response.text(), clone.text()]);
  });

  it('emits structured request events without affecting transport', async () => {
    const events: Array<{ type: string }> = [];
    const courier = createCourier({ fetch: vi.fn(async () => new Response(null, { status: 204 })) });
    const untap = courier.tap((event) => events.push(event));

    await courier.get('/events');
    untap();
    courier.dispose();

    expect(events.map((event) => event.type)).toEqual(['request-start', 'request-success']);
  });

  it('supports immutable middleware init updates', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(null, { status: 204 }));
    const courier = createCourier({
      fetch,
      middleware: [async (context, next) => next(context.withInit({ credentials: 'include' }))],
    });

    await courier.get('/original');

    expect(fetch).toHaveBeenCalledWith('/original', expect.objectContaining({ credentials: 'include' }));
  });

  it('reports one consistent URL through errors, logging, and tap events', async () => {
    const logged: string[] = [];
    const tapped: string[] = [];
    const courier = createCourier({
      fetch: vi.fn(async () => new Response(null, { status: 404 })),
      middleware: [withLogging({ logger: (_message, meta) => logged.push(meta.url) })],
    });
    courier.tap((event) => {
      if ('url' in event) tapped.push(event.url);
    });

    await expect(courier.get('/users/1')).rejects.toMatchObject({ url: '/users/1' });
    expect(logged).toEqual(['/users/1']);
    expect(tapped).toEqual(['/users/1', '/users/1']);
  });

  it('validates cache configuration and structured keys', async () => {
    expect(() => createCourier({ cache: { capacity: 0 } })).toThrow('cache.capacity');
    expect(() => createCourier({ cache: { ttlMs: -1 } })).toThrow('cache.ttlMs');

    const courier = createCourier({ fetch: vi.fn(async () => Response.json([])) });

    await expect(courier.get('/users', { cache: { key: ['users'] } })).resolves.toEqual([]);
    expect(() => courier.prefetch('/users', { cache: { key: [] as never } })).toThrow('non-empty');
    expect(() => courier.prefetch('/users', { cache: { key: 'users' as never } })).toThrow('non-empty');
    expect(() => courier.prefetch('/users', { cache: { key: ['users', Number.NaN] } })).toThrow('must be finite');
    expect(() => courier.prefetch('/users/{id}', { cache: { key: ['user'] }, params: {} as { id: string } })).toThrow(
      'unresolved path param',
    );
  });

  it('deduplicates concurrent cached GETs and reuses the parsed value', async () => {
    let resolve!: (response: Response) => void;
    const fetch = vi.fn<typeof globalThis.fetch>(() => new Promise<Response>((done) => (resolve = done)));
    const schema = { parse: vi.fn((data) => data as { id: number }) };
    const courier = createCourier({ cache: { ttlMs: 60_000 }, fetch });
    const config = { cache: { key: ['users', 1] as const }, schema };
    const first = courier.get('/users/1', config);
    const second = courier.get('/users/1', config);

    expect(fetch).toHaveBeenCalledOnce();
    resolve(new Response(JSON.stringify({ id: 1 }), { headers: { 'content-type': 'application/json' } }));

    const [firstValue, secondValue] = await Promise.all([first, second]);
    expect(firstValue).toBe(secondValue);
    await expect(courier.get('/users/1', config)).resolves.toBe(firstValue);
    expect(schema.parse).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('uses the shortest TTL requested by callers sharing a pending load', async () => {
    vi.useFakeTimers();
    let resolve!: (response: Response) => void;
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementationOnce(() => new Promise<Response>((done) => (resolve = done)))
      .mockResolvedValueOnce(Response.json({ request: 2 }));
    const courier = createCourier({ fetch });
    const first = courier.get('/users', { cache: { key: ['users'], ttlMs: 1_000 } });
    const second = courier.get('/users', { cache: { key: ['users'], ttlMs: 100 } });

    resolve(Response.json({ request: 1 }));
    await Promise.all([first, second]);
    await vi.advanceTimersByTimeAsync(100);
    await expect(courier.get('/users', { cache: { key: ['users'], ttlMs: 1_000 } })).resolves.toEqual({ request: 2 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('honors per-read TTL overrides and configured capacity', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn<typeof globalThis.fetch>();
    fetch.mockImplementation(async (input) => Response.json({ path: String(input), request: fetch.mock.calls.length }));
    const expiring = createCourier({ cache: { ttlMs: 1_000 }, fetch });
    const config = { cache: { key: ['users'] as const, ttlMs: 100 } };

    await expiring.get('/users', config);
    await vi.advanceTimersByTimeAsync(99);
    await expiring.get('/users', config);
    expect(fetch).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    await expiring.get('/users', config);
    expect(fetch).toHaveBeenCalledTimes(2);

    const bounded = createCourier({ cache: { capacity: 1, ttlMs: Infinity }, fetch });
    await bounded.get('/a', { cache: { key: ['group', 'a'] } });
    await bounded.get('/b', { cache: { key: ['group', 'b'] } });
    await bounded.get('/a', { cache: { key: ['group', 'a'] } });
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it('bounds the cache to 100 entries by default', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => Response.json(String(input)));
    const courier = createCourier({ fetch });

    for (let index = 0; index <= 100; index++) {
      await courier.get(`/users/${String(index)}`, { cache: { key: ['users', index], ttlMs: Infinity } });
    }
    await courier.get('/users/0', { cache: { key: ['users', 0], ttlMs: Infinity } });

    expect(fetch).toHaveBeenCalledTimes(102);
  });

  it('does not cache failures and does cache successful undefined values', async () => {
    const failureFetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(Response.json({ ok: true }));
    const failureCourier = createCourier({ cache: { ttlMs: 60_000 }, fetch: failureFetch });

    await expect(failureCourier.get('/status', { cache: { key: ['status'] } })).rejects.toBeDefined();
    await expect(failureCourier.get('/status', { cache: { key: ['status'] } })).resolves.toEqual({ ok: true });
    expect(failureFetch).toHaveBeenCalledTimes(2);

    const emptyFetch = vi.fn<typeof globalThis.fetch>(async () => new Response(null, { status: 204 }));
    const emptyCourier = createCourier({ cache: { ttlMs: 60_000 }, fetch: emptyFetch });
    await emptyCourier.get('/empty', { cache: { key: ['empty'] } });
    await emptyCourier.get('/empty', { cache: { key: ['empty'] } });
    expect(emptyFetch).toHaveBeenCalledOnce();
  });

  it('invalidates exact cache entries and clears all entries', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => Response.json({ path: String(input) }));
    const courier = createCourier({ cache: { ttlMs: Infinity }, fetch });

    await courier.get('/a', { cache: { key: ['group', 'a'] } });
    await courier.get('/b', { cache: { key: ['group', 'b'] } });
    courier.invalidateCache(['group']);
    await courier.get('/a', { cache: { key: ['group', 'a'] } });
    await courier.get('/b', { cache: { key: ['group', 'b'] } });
    courier.clearCache();
    await courier.get('/b', { cache: { key: ['group', 'b'] } });

    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it('does not restore an invalidated in-flight cached GET', async () => {
    let resolve!: (response: Response) => void;
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementationOnce(() => new Promise<Response>((done) => (resolve = done)))
      .mockResolvedValueOnce(Response.json({ request: 2 }));
    const courier = createCourier({ cache: { ttlMs: Infinity }, fetch });
    const first = courier.get('/users/1', { cache: { key: ['users', 1] } });

    courier.invalidateCache(['users']);
    resolve(Response.json({ request: 1 }));
    await expect(first).resolves.toEqual({ request: 1 });
    await expect(courier.get('/users/1', { cache: { key: ['users', 1] } })).resolves.toEqual({ request: 2 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('caller cancellation does not abort a shared cached request', async () => {
    let resolve!: (response: Response) => void;
    let requestSignal: AbortSignal | null = null;
    const fetch = vi.fn<typeof globalThis.fetch>((_, init) => {
      requestSignal = init?.signal ?? null;
      return new Promise<Response>((done) => (resolve = done));
    });
    const courier = createCourier({ cache: { ttlMs: 60_000 }, fetch });
    const caller = new AbortController();
    const first = courier.get('/users', { cache: { key: ['users'] }, signal: caller.signal });
    const second = courier.get('/users', { cache: { key: ['users'] } });

    caller.abort();
    await expect(first).rejects.toBeInstanceOf(CourierAbortError);
    expect((requestSignal as AbortSignal | null)?.aborted).toBe(false);
    resolve(Response.json(['Ada']));
    await expect(second).resolves.toEqual(['Ada']);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('does not start a cached GET for an already-aborted caller', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json([]));
    const courier = createCourier({ fetch });
    const caller = new AbortController();
    caller.abort();

    await expect(courier.get('/users', { cache: { key: ['users'] }, signal: caller.signal })).rejects.toBeInstanceOf(
      CourierAbortError,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('applies timeouts independently to callers sharing physical work', async () => {
    let resolve!: (response: Response) => void;
    let physicalSignal: AbortSignal | null = null;
    const fetch = vi.fn<typeof globalThis.fetch>((_, init) => {
      physicalSignal = init?.signal ?? null;
      return new Promise<Response>((done) => (resolve = done));
    });
    const courier = createCourier({ fetch, timeout: Infinity });
    const short = courier.get('/users', { cache: { key: ['users'] }, timeout: 1 });
    const long = courier.get('/users', { cache: { key: ['users'] }, timeout: 1_000 });

    await expect(short).rejects.toBeInstanceOf(CourierTimeoutError);
    expect((physicalSignal as AbortSignal | null)?.aborted).toBe(false);
    resolve(Response.json(['Ada']));
    await expect(long).resolves.toEqual(['Ada']);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('aborts and replaces shared physical work after every caller cancels', async () => {
    let physicalSignal: AbortSignal | null = null;
    const fetch = vi.fn<typeof globalThis.fetch>((_, init) => {
      if (fetch.mock.calls.length > 1) return Promise.resolve(Response.json(['Grace']));
      physicalSignal = init?.signal ?? null;
      return new Promise<Response>(() => {});
    });
    const courier = createCourier({ fetch, timeout: Infinity });
    const firstCaller = new AbortController();
    const secondCaller = new AbortController();
    const first = courier.get('/users', { cache: { key: ['users'] }, signal: firstCaller.signal });
    const second = courier.get('/users', { cache: { key: ['users'] }, signal: secondCaller.signal });

    firstCaller.abort();
    await expect(first).rejects.toBeInstanceOf(CourierAbortError);
    expect((physicalSignal as AbortSignal | null)?.aborted).toBe(false);
    secondCaller.abort();
    await expect(second).rejects.toBeInstanceOf(CourierAbortError);
    expect((physicalSignal as AbortSignal | null)?.aborted).toBe(true);
    await expect(courier.get('/users', { cache: { key: ['users'] } })).resolves.toEqual(['Grace']);
    expect(fetch).toHaveBeenCalledTimes(2);
    courier.dispose();
  });

  it('keeps physical work alive while prefetch owns a cancelled caller load', async () => {
    let resolve!: (response: Response) => void;
    let physicalSignal: AbortSignal | null = null;
    const fetch = vi.fn<typeof globalThis.fetch>((_, init) => {
      physicalSignal = init?.signal ?? null;
      return new Promise<Response>((done) => (resolve = done));
    });
    const courier = createCourier({ fetch, timeout: Infinity });
    const prefetched = courier.prefetch('/users', { cache: { key: ['users'] } });
    const caller = new AbortController();
    const request = courier.get('/users', { cache: { key: ['users'] }, signal: caller.signal });

    caller.abort();
    await expect(request).rejects.toBeInstanceOf(CourierAbortError);
    expect((physicalSignal as AbortSignal | null)?.aborted).toBe(false);
    resolve(Response.json(['Ada']));
    await expect(prefetched).resolves.toBeUndefined();
    await expect(courier.get('/users', { cache: { key: ['users'] } })).resolves.toEqual(['Ada']);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('starts a fresh cached GET immediately after cancelAll', async () => {
    let first = true;
    const fetch = vi.fn<typeof globalThis.fetch>((_, init) => {
      if (!first) return Promise.resolve(Response.json({ ok: true }));
      first = false;
      return new Promise<Response>((_, reject) =>
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
          once: true,
        }),
      );
    });
    const courier = createCourier({ cache: { ttlMs: 60_000 }, fetch });
    const cancelled = courier.get('/status', { cache: { key: ['status'] } });

    courier.cancelAll();
    const retry = courier.get('/status', { cache: { key: ['status'] } });

    await expect(cancelled).rejects.toBeInstanceOf(CourierAbortError);
    await expect(retry).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('prefetches through the shared cache without surfacing asynchronous failures', async () => {
    let resolve!: (response: Response) => void;
    const fetch = vi.fn<typeof globalThis.fetch>(() => new Promise<Response>((done) => (resolve = done)));
    const courier = createCourier({ cache: { ttlMs: 60_000 }, fetch });

    const prefetched = courier.prefetch('/users', { cache: { key: ['users'] } });
    const users = courier.get('/users', { cache: { key: ['users'] } });
    resolve(Response.json(['Ada']));

    await expect(prefetched).resolves.toBeUndefined();
    await expect(users).resolves.toEqual(['Ada']);
    await expect(courier.prefetch('/users', { cache: { key: ['users'] } })).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledOnce();

    const events: Array<{ type: string }> = [];
    const failedFetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(Response.json(['Grace']));
    const failedCourier = createCourier({ cache: { ttlMs: 60_000 }, fetch: failedFetch });
    failedCourier.tap((event) => events.push(event));
    await expect(failedCourier.prefetch('/users', { cache: { key: ['users'] } })).resolves.toBeUndefined();

    expect(events.map((event) => event.type)).toContain('request-error');
    await expect(failedCourier.get('/users', { cache: { key: ['users'] } })).resolves.toEqual(['Grace']);
    expect(failedFetch).toHaveBeenCalledTimes(2);
  });

  it('observes request-construction failures during prefetch', async () => {
    const events: Array<{ type: string }> = [];
    const courier = createCourier({ fetch: vi.fn(async () => Response.json([])) });
    courier.tap((event) => events.push(event));

    await expect(
      courier.prefetch('/users', {
        cache: { key: ['users'] },
        headers: { 'invalid\nheader': 'value' },
      }),
    ).resolves.toBeUndefined();

    expect(events.map((event) => event.type)).toEqual(['request-start', 'request-error']);
  });

  it('rejects prefetch after disposal and aborts prefetched work on disposal', async () => {
    let requestSignal: AbortSignal | null = null;
    const courier = createCourier({
      cache: { ttlMs: 60_000 },
      fetch: vi.fn(
        (_, init) =>
          new Promise<Response>((_, reject) => {
            requestSignal = init?.signal ?? null;
            requestSignal?.addEventListener('abort', () => reject(requestSignal?.reason), { once: true });
          }),
      ),
    });

    const prefetched = courier.prefetch('/slow', { cache: { key: ['slow'] } });
    courier.dispose();

    expect((requestSignal as AbortSignal | null)?.aborted).toBe(true);
    await expect(prefetched).resolves.toBeUndefined();
    expect(() => courier.prefetch('/slow', { cache: { key: ['slow'] } })).toThrow('Courier disposed');
  });
});
