import { createApi, createMutation, createQuery, HttpError, type MutationState, type QueryState } from './fetchit';

describe('fetchit', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  const jsonResponse = (data: unknown, status = 200) => ({
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(data),
  });

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // HTTP CLIENT
  // =========================================================================

  describe('HTTP Client', () => {
    // -----------------------------------------------------------------------
    // URL Construction
    // -----------------------------------------------------------------------

    describe('URL Construction', () => {
      it('interpolates {param} placeholders — single and multiple', async () => {
        const http = createApi({ baseUrl: 'https://api.example.com' });

        fetchMock.mockResolvedValue(jsonResponse({}));

        await http.get('/users/{id}', { params: { id: 'abc' } });
        expect(fetchMock).toHaveBeenLastCalledWith('https://api.example.com/users/abc', expect.any(Object));

        await http.get('/users/{id}/posts/{postId}', { params: { id: 1, postId: 42 } });
        expect(fetchMock).toHaveBeenLastCalledWith('https://api.example.com/users/1/posts/42', expect.any(Object));
      });

      it('appends query string and omits undefined values', async () => {
        const http = createApi({ baseUrl: 'https://api.example.com' });

        fetchMock.mockResolvedValue(jsonResponse([]));

        await http.get('/users', { query: { page: 2, role: 'admin' } });
        expect(fetchMock).toHaveBeenLastCalledWith(
          'https://api.example.com/users?page=2&role=admin',
          expect.any(Object),
        );

        await http.get('/users', { query: { page: 1, role: undefined } });
        expect(fetchMock).toHaveBeenLastCalledWith('https://api.example.com/users?page=1', expect.any(Object));
      });

      it('combines path params and query params', async () => {
        const http = createApi({ baseUrl: 'https://api.example.com' });

        fetchMock.mockResolvedValue(jsonResponse([]));

        await http.get('/users/{id}/posts', { params: { id: 5 }, query: { limit: 10 } });

        expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/users/5/posts?limit=10', expect.any(Object));
      });

      it('does not add a trailing slash when path is empty', async () => {
        const http = createApi({ baseUrl: 'https://api.example.com' });

        fetchMock.mockResolvedValue(jsonResponse({}));

        await http.get('');

        expect(fetchMock).toHaveBeenCalledWith('https://api.example.com', expect.any(Object));
      });
    });

    // -----------------------------------------------------------------------
    // Methods & Body
    // -----------------------------------------------------------------------

    describe('Methods & Body', () => {
      it('dispatches correct method for GET, POST, PUT, PATCH, DELETE, and custom methods', async () => {
        const http = createApi({ baseUrl: 'https://api.example.com' });

        fetchMock.mockResolvedValue(jsonResponse({}));

        await http.get('/r');
        expect(fetchMock).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ method: 'GET' }));

        await http.post('/r', { body: {} });
        expect(fetchMock).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ method: 'POST' }));

        await http.put('/r', { body: {} });
        expect(fetchMock).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ method: 'PUT' }));

        await http.patch('/r', { body: {} });
        expect(fetchMock).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ method: 'PATCH' }));

        await http.delete('/r');
        expect(fetchMock).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ method: 'DELETE' }));

        await http.request('OPTIONS', '/r');
        expect(fetchMock).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ method: 'OPTIONS' }));
      });

      it('auto-serializes a plain-object body as JSON with content-type header', async () => {
        const http = createApi({ baseUrl: 'https://api.example.com' });

        fetchMock.mockResolvedValue(jsonResponse({ id: 1 }));

        await http.post('/users', { body: { name: 'Alice' } });

        expect(fetchMock).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify({ name: 'Alice' }),
            headers: expect.objectContaining({ 'content-type': 'application/json' }),
          }),
        );
      });

      it('passes BodyInit types (FormData, Blob, ArrayBuffer, TypedArray) through without serialization', async () => {
        const http = createApi({ baseUrl: 'https://api.example.com' });

        fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

        const formData = new FormData();

        await http.post('/upload', { body: formData });
        expect(fetchMock.mock.calls[0][1].body).toBe(formData);

        const blob = new Blob(['data'], { type: 'text/plain' });

        await http.post('/upload', { body: blob });
        expect(fetchMock.mock.calls[1][1].body).toBe(blob);

        const buffer = new ArrayBuffer(8);

        await http.post('/binary', { body: buffer });
        expect(fetchMock.mock.calls[2][1].body).toBe(buffer);

        const uint8 = new Uint8Array([1, 2, 3]);

        await http.post('/binary', { body: uint8 });
        expect(fetchMock.mock.calls[3][1].body).toBe(uint8);
      });

      it('returns undefined for 204 No Content responses', async () => {
        const http = createApi({ baseUrl: 'https://api.example.com' });

        fetchMock.mockResolvedValue({ headers: new Headers(), ok: true, status: 204 });

        const result = await http.delete('/users/1');

        expect(result).toBeUndefined();
      });
    });

    // -----------------------------------------------------------------------
    // Headers
    // -----------------------------------------------------------------------

    describe('Headers', () => {
      it('sends initial client headers on every request', async () => {
        const http = createApi({ headers: { Authorization: 'Bearer token', 'x-app': 'test' } });

        fetchMock.mockResolvedValue(jsonResponse({}));

        await http.get('/test');

        expect(fetchMock).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({ Authorization: 'Bearer token', 'x-app': 'test' }),
          }),
        );
      });

      it('headers() updates existing headers and removes headers when value is undefined', async () => {
        const http = createApi({ headers: { Authorization: 'Bearer old', 'x-trace': 'abc' } });

        http.headers({ Authorization: 'Bearer new', 'x-trace': undefined });
        fetchMock.mockResolvedValue(jsonResponse({}));

        await http.get('/test');

        expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer new');
        expect(fetchMock.mock.calls[0][1].headers['x-trace']).toBeUndefined();
      });
    });

    // -----------------------------------------------------------------------
    // Interceptors
    // -----------------------------------------------------------------------

    describe('Interceptors', () => {
      it('interceptor can modify request context', async () => {
        const http = createApi({ baseUrl: 'https://api.example.com' });

        fetchMock.mockResolvedValue(jsonResponse({ id: 1 }));

        http.use(async ({ init, url }, next) =>
          next({ init: { ...init, headers: { ...(init.headers as Record<string, string>), 'x-custom': 'yes' } }, url }),
        );

        await http.get('/users/1');

        expect(fetchMock.mock.calls[0][1].headers['x-custom']).toBe('yes');
      });

      it('chains multiple interceptors in onion order', async () => {
        const http = createApi();

        fetchMock.mockResolvedValue(jsonResponse({}));

        const log: number[] = [];

        http.use(async (ctx, next) => {
          log.push(1);

          const r = await next(ctx);

          log.push(4);

          return r;
        });
        http.use(async (ctx, next) => {
          log.push(2);

          const r = await next(ctx);

          log.push(3);

          return r;
        });

        await http.get('/test');
        expect(log).toEqual([1, 2, 3, 4]);
      });

      it('use() returns a dispose function that removes the interceptor', async () => {
        const http = createApi();

        fetchMock.mockResolvedValue(jsonResponse({}));

        let callCount = 0;

        const remove = http.use(async (ctx, next) => {
          callCount++;

          return next(ctx);
        });

        await http.get('/test');
        expect(callCount).toBe(1);

        remove();
        await http.get('/test');
        expect(callCount).toBe(1); // not called again
      });

      it('an interceptor can short-circuit without calling next', async () => {
        const http = createApi();

        http.use(
          async () =>
            new Response(JSON.stringify({ mocked: true }), {
              headers: { 'content-type': 'application/json' },
              status: 200,
            }),
        );

        const result = await http.get<{ mocked: boolean }>('/anything');

        expect(result).toEqual({ mocked: true });
        expect(fetchMock).not.toHaveBeenCalled();
      });
    });

    // -----------------------------------------------------------------------
    // Deduplication
    // -----------------------------------------------------------------------

    describe('Deduplication', () => {
      it('auto-deduplicates concurrent requests for idempotent methods (GET, DELETE)', async () => {
        const http = createApi();

        fetchMock.mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(jsonResponse({ id: 1 })), 50)),
        );

        const [g1, g2, g3] = await Promise.all([http.get('/users/1'), http.get('/users/1'), http.get('/users/1')]);

        expect(g1).toEqual({ id: 1 });
        expect(g2).toEqual({ id: 1 });
        expect(g3).toEqual({ id: 1 });
        expect(fetchMock).toHaveBeenCalledTimes(1);

        fetchMock.mockClear();
        fetchMock.mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(jsonResponse({ deleted: true })), 50)),
        );

        const [d1, d2] = await Promise.all([http.delete('/users/1'), http.delete('/users/1')]);

        expect(d1).toEqual({ deleted: true });
        expect(d2).toEqual({ deleted: true });
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      it('does NOT deduplicate POST requests by default', async () => {
        const http = createApi();

        fetchMock.mockResolvedValue(jsonResponse({ id: 1 }));

        await Promise.all([http.post('/users', { body: { name: 'A' } }), http.post('/users', { body: { name: 'A' } })]);

        expect(fetchMock).toHaveBeenCalledTimes(2);
      });

      it('global dedupe:true deduplicates any method', async () => {
        const http = createApi({ dedupe: true });

        fetchMock.mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(jsonResponse({ id: 1 })), 50)),
        );

        const [r1, r2] = await Promise.all([
          http.post('/users', { body: { name: 'A' } }),
          http.post('/users', { body: { name: 'A' } }),
        ]);

        expect(r1).toEqual({ id: 1 });
        expect(r2).toEqual({ id: 1 });
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      it('per-request dedupe:false opts out of deduplication', async () => {
        const http = createApi();

        fetchMock.mockResolvedValue(jsonResponse({ id: 1 }));

        await Promise.all([http.get('/users/1', { dedupe: false }), http.get('/users/1', { dedupe: false })]);

        expect(fetchMock).toHaveBeenCalledTimes(2);
      });

      it('deduplicates FormData requests sharing the same serialized key', async () => {
        const http = createApi({ dedupe: true });

        fetchMock.mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(jsonResponse({ id: 1 })), 50)),
        );

        const fd1 = new FormData();

        fd1.append('name', 'Alice');

        const fd2 = new FormData();

        fd2.append('name', 'Alice');

        const [r1, r2] = await Promise.all([http.post('/upload', { body: fd1 }), http.post('/upload', { body: fd2 })]);

        expect(r1).toEqual({ id: 1 });
        expect(r2).toEqual({ id: 1 });
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      it('handles BodyInit binary types (Blob, ArrayBuffer) in dedup key without crashing', async () => {
        const http = createApi({ dedupe: true });

        fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

        await expect(http.post('/upload', { body: new Blob(['hi']) })).resolves.toBeDefined();
        await expect(http.post('/binary', { body: new ArrayBuffer(4) })).resolves.toBeDefined();
      });

      it('rejects with TypeError when body has circular references', async () => {
        const http = createApi({ dedupe: true });

        const circular: any = { a: 1 };

        circular.self = circular;

        await expect(http.post('/json', { body: circular })).rejects.toThrow(TypeError);
      });
    });

    // -----------------------------------------------------------------------
    // Timeout
    // -----------------------------------------------------------------------

    describe('Timeout', () => {
      it('edge values — timeout:0 and timeout:Infinity complete without errors', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

        await expect(createApi({ timeout: 0 }).get('/test')).resolves.toBeDefined();
        await expect(createApi({ timeout: Number.POSITIVE_INFINITY }).get('/test')).resolves.toBeDefined();
      });

      it('per-request timeout overrides client-level timeout', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

        const http = createApi({ baseUrl: 'https://api.example.com', timeout: 30_000 });

        await http.get('/data', { timeout: 0 });

        expect(fetchMock).toHaveBeenCalledTimes(1);
      });
    });

    // -----------------------------------------------------------------------
    // Error Handling
    // -----------------------------------------------------------------------

    describe('Error Handling', () => {
      it('wraps network errors in HttpError preserving url and method', async () => {
        const http = createApi({ baseUrl: 'https://api.example.com' });

        fetchMock.mockRejectedValue(new Error('Network error'));

        const err = await http.get('/users/1').catch((e) => e);

        expect(err).toBeInstanceOf(HttpError);

        if (!(err instanceof HttpError)) throw err;

        expect(err.url).toBe('https://api.example.com/users/1');
        expect(err.method).toBe('GET');
      });

      it('wraps non-OK responses in HttpError with status, data, and raw response', async () => {
        const http = createApi({ baseUrl: 'https://api.example.com' });

        fetchMock.mockResolvedValue(jsonResponse({ error: 'Not found' }, 404));

        const err = await http.get('/users/999').catch((e) => e);

        expect(err).toBeInstanceOf(HttpError);

        if (!(err instanceof HttpError)) throw err;

        expect(err.status).toBe(404);
        expect(err.data).toEqual({ error: 'Not found' });
        expect(err.response).toBeDefined();
      });

      it('HttpError.is() narrows type and optionally matches status code', async () => {
        const http = createApi({ baseUrl: 'https://api.example.com' });

        fetchMock.mockResolvedValue(jsonResponse({ error: 'Not found' }, 404));

        const err = await http.get('/users/999').catch((e) => e);

        expect(HttpError.is(err)).toBe(true);
        expect(HttpError.is(err, 404)).toBe(true);
        expect(HttpError.is(err, 500)).toBe(false);
        expect(HttpError.is(new Error('plain'))).toBe(false);
      });
    });
  });

  // =========================================================================
  // QUERY CLIENT
  // =========================================================================

  describe('Query Client', () => {
    // -----------------------------------------------------------------------
    // Fetching & Caching
    // -----------------------------------------------------------------------

    describe('Fetching & Caching', () => {
      it('serves fresh data from cache without re-executing fn', async () => {
        const qc = createQuery();
        let calls = 0;
        const fn = async () => {
          calls++;

          return { id: 1 };
        };

        await qc.query({ fn, key: ['users', 1], staleTime: 10_000 });
        await qc.query({ fn, key: ['users', 1], staleTime: 10_000 });

        expect(calls).toBe(1);
      });

      it('refetches after staleTime expires', async () => {
        vi.useFakeTimers();

        const qc = createQuery();
        let calls = 0;
        const fn = async () => {
          calls++;

          return { id: calls };
        };

        await qc.query({ fn, key: ['data'], staleTime: 500 });
        vi.advanceTimersByTime(501);
        await qc.query({ fn, key: ['data'], staleTime: 500 });

        expect(calls).toBe(2);
        vi.useRealTimers();
      });

      it('deduplicates concurrent in-flight queries for the same key', async () => {
        const qc = createQuery();
        let calls = 0;
        const fn = () => new Promise<{ id: number }>((resolve) => setTimeout(() => resolve({ id: ++calls }), 50));

        const [r1, r2, r3] = await Promise.all([
          qc.query({ fn, key: ['users', 1] }),
          qc.query({ fn, key: ['users', 1] }),
          qc.query({ fn, key: ['users', 1] }),
        ]);

        expect(r1).toEqual({ id: 1 });
        expect(r2).toEqual({ id: 1 });
        expect(r3).toEqual({ id: 1 });
        expect(calls).toBe(1);
      });

      it('passes an AbortSignal to fn via context object', async () => {
        const qc = createQuery();
        let receivedSignal: AbortSignal | undefined;

        await qc.query({
          fn: async ({ signal }) => {
            receivedSignal = signal;

            return { id: 1 };
          },
          key: ['signal-test'],
        });

        expect(receivedSignal).toBeInstanceOf(AbortSignal);
      });

      it('enabled:false skips fn, creates no phantom entry, and returns existing cache data if present', async () => {
        const qc = createQuery();
        let called = false;

        // No cache — returns undefined without calling fn or creating an entry
        const r1 = await qc.query({
          enabled: false,
          fn: async () => {
            called = true;

            return 1;
          },
          key: ['x'],
        });

        expect(r1).toBeUndefined();
        expect(called).toBe(false);
        expect(qc.getState(['x'])).toBeNull();

        // With pre-seeded cache — returns existing data without calling fn
        qc.set(['x'], { id: 99 });

        const r2 = await qc.query({ enabled: false, fn: async () => ({ id: 0 }), key: ['x'] });

        expect(r2).toEqual({ id: 99 });
      });
    });

    // -----------------------------------------------------------------------
    // Prefetch
    // -----------------------------------------------------------------------

    describe('Prefetch', () => {
      it('populates the cache and returns the fetched data', async () => {
        const qc = createQuery();

        const result = await qc.prefetch({ fn: async () => ({ id: 1, name: 'Test' }), key: ['users', 1] });

        expect(result).toEqual({ id: 1, name: 'Test' });
        expect(qc.get(['users', 1])).toEqual({ id: 1, name: 'Test' });
      });

      it('silently ignores errors and returns undefined — never throws', async () => {
        const qc = createQuery();

        const result = await qc.prefetch({
          fn: async () => {
            throw new Error('fail');
          },
          key: ['users', 1],
          retry: false,
        });

        expect(result).toBeUndefined();
      });
    });

    // -----------------------------------------------------------------------
    // Retry
    // -----------------------------------------------------------------------

    describe('Retry', () => {
      it('retries the fn up to the specified count before succeeding', async () => {
        const qc = createQuery();
        let attempts = 0;

        await qc.query({
          fn: async () => {
            if (++attempts < 3) throw new Error('transient');

            return { id: 1 };
          },
          key: ['users', 1],
          retry: 3,
        });

        expect(attempts).toBe(3);
      });

      it('retry:false makes exactly one attempt then rejects', async () => {
        const qc = createQuery();
        let attempts = 0;

        await expect(
          qc.query({
            fn: async () => {
              attempts++;
              throw new Error('fail');
            },
            key: ['users', 1],
            retry: false,
          }),
        ).rejects.toThrow('fail');

        expect(attempts).toBe(1);
      });
    });

    // -----------------------------------------------------------------------
    // Data Management
    // -----------------------------------------------------------------------

    describe('Data Management', () => {
      it('set/get round-trip with value and updater function', () => {
        const qc = createQuery();

        qc.set(['users', 1], { id: 1, name: 'Alice' });
        expect(qc.get(['users', 1])).toEqual({ id: 1, name: 'Alice' });

        qc.set<{ id: number; name: string }>(['users', 1], (old) => ({ ...old!, name: 'Bob' }));
        expect(qc.get(['users', 1])).toEqual({ id: 1, name: 'Bob' });
      });

      it('invalidate() forces a re-fetch on the next query call', async () => {
        const qc = createQuery();
        let calls = 0;
        const fn = async () => {
          calls++;

          return { id: 1 };
        };

        await qc.query({ fn, key: ['users', 1], staleTime: 10_000 });
        qc.invalidate(['users', 1]);
        await qc.query({ fn, key: ['users', 1], staleTime: 10_000 });

        expect(calls).toBe(2);
      });

      it('gcTime:0 evicts the entry immediately after fetch', async () => {
        const qc = createQuery({ gcTime: 0 });

        await qc.query({ fn: async () => ({ id: 1 }), key: ['x'] });

        expect(qc.get(['x'])).toBeUndefined();
      });

      it('clear() removes all cached entries', () => {
        const qc = createQuery();

        qc.set(['a'], 1);
        qc.set(['b'], 2);
        qc.clear();

        expect(qc.get(['a'])).toBeUndefined();
        expect(qc.get(['b'])).toBeUndefined();
      });

      it('clear() keeps entries with active observers in cache (reset to idle) so subscriptions stay live', async () => {
        const qc = createQuery();

        await qc.query({ fn: async () => ({ id: 1 }), key: ['x'], staleTime: 10_000 });

        const states: QueryState[] = [];

        qc.subscribe(['x'], (s) => states.push(s));
        qc.clear();

        // Entry remains accessible — subscriptions are not orphaned
        expect(qc.getState(['x'])?.status).toBe('idle');
        expect(states[states.length - 1]?.status).toBe('idle');
      });
    });

    // -----------------------------------------------------------------------
    // Subscriptions & State
    // -----------------------------------------------------------------------

    describe('Subscriptions & State', () => {
      it('getState() returns null before any query, then full shape after success', async () => {
        const qc = createQuery();

        expect(qc.getState(['never'])).toBeNull();

        await qc.query({ fn: async () => ({ id: 1 }), key: ['users', 1] });

        expect(qc.getState(['users', 1])).toMatchObject({
          data: { id: 1 },
          error: null,
          isError: false,
          isIdle: false,
          isPending: false,
          isSuccess: true,
          status: 'success',
        });
        expect(qc.getState(['users', 1])!.updatedAt).toBeGreaterThan(0);
      });

      it('subscribe() fires idle -> pending -> success state transitions', async () => {
        const qc = createQuery();
        const states: QueryState[] = [];

        const unsub = qc.subscribe(['users', 1], (s) => states.push({ ...s }));

        await qc.query({ fn: async () => ({ id: 1 }), key: ['users', 1] });
        unsub();

        const statuses = states.map((s) => s.status);

        expect(statuses[0]).toBe('idle');
        expect(statuses).toContain('pending');
        expect(statuses[statuses.length - 1]).toBe('success');
        expect(states[states.length - 1].data).toEqual({ id: 1 });
      });

      it('subscribe() fires idle -> pending -> error state transitions', async () => {
        const qc = createQuery();
        const states: QueryState[] = [];

        qc.subscribe(['fail'], (s) => states.push({ ...s }));
        await qc
          .query({
            fn: async () => {
              throw new Error('boom');
            },
            key: ['fail'],
            retry: false,
          })
          .catch(() => {});

        const statuses = states.map((s) => s.status);

        expect(statuses[0]).toBe('idle');
        expect(statuses).toContain('pending');
        expect(statuses[statuses.length - 1]).toBe('error');
        expect(states[states.length - 1].error?.message).toBe('boom');
        expect(states[states.length - 1].isError).toBe(true);
      });

      it('set() notifies subscribers immediately with the new value', () => {
        const qc = createQuery();
        const states: QueryState[] = [];

        qc.subscribe(['users', 1], (s) => states.push({ ...s }));
        qc.set(['users', 1], { id: 1, name: 'Alice' });

        expect(states[states.length - 1].data).toEqual({ id: 1, name: 'Alice' });
      });

      it('subscribe() cancels a pending GC timer to keep entry alive', async () => {
        vi.useFakeTimers();

        const qc = createQuery({ gcTime: 1_000 });

        await qc.query({ fn: async () => ({ id: 1 }), key: ['x'] });
        // GC timer is now ticking — subscribe before it fires
        qc.subscribe(['x'], () => {});
        vi.advanceTimersByTime(2_000);

        // Entry should still be accessible because subscribe cancelled the GC timer
        expect(qc.get(['x'])).toEqual({ id: 1 });
        vi.useRealTimers();
      });

      it('invalidate() notifies subscribers with idle state and keeps the observed entry in cache', async () => {
        const qc = createQuery();

        await qc.query({ fn: async () => ({ id: 1 }), key: ['users', 1], staleTime: 10_000 });

        const states: QueryState[] = [];
        const unsub = qc.subscribe(['users', 1], (s) => states.push({ ...s }));

        qc.invalidate(['users', 1]);

        expect(states[states.length - 1]?.status).toBe('idle');
        expect(states[states.length - 1]?.data).toBeUndefined();
        expect(qc.getState(['users', 1])).not.toBeNull(); // entry remains — subscribers are not orphaned
        unsub();
      });

      it('clear() notifies active subscribers with idle state before wiping the cache', async () => {
        const qc = createQuery();

        await qc.query({ fn: async () => ({ id: 1 }), key: ['users', 1] });

        const states: QueryState[] = [];

        qc.subscribe(['users', 1], (s) => states.push({ ...s }));

        qc.clear();

        const last = states[states.length - 1];

        expect(last?.status).toBe('idle');
        expect(last?.data).toBeUndefined();
      });

      it('cancel() transitions pending -> success when data exists and schedules GC', async () => {
        vi.useFakeTimers();

        const gcTime = 1_000;
        const qc = createQuery({ gcTime });

        let resolve!: (v: unknown) => void;
        const pending = new Promise((r) => {
          resolve = r;
        });

        qc.query({ fn: () => pending as Promise<unknown>, key: ['x'] });
        qc.set(['x'], { id: 42 }); // seed data so cancel transitions to 'success'
        qc.cancel(['x']);

        expect(qc.get(['x'])).toEqual({ id: 42 });

        vi.advanceTimersByTime(gcTime + 1);
        expect(qc.get(['x'])).toBeUndefined(); // GC fired and evicted the entry
        vi.useRealTimers();
        resolve(undefined);
      });
    });

    // -----------------------------------------------------------------------
    // Key Serialization
    // -----------------------------------------------------------------------

    describe('Key Serialization', () => {
      it('treats objects with different property order as the same cache key', async () => {
        const qc = createQuery({ staleTime: 10_000 });
        let calls = 0;
        const fn = async () => {
          calls++;

          return { id: 1 };
        };

        await qc.query({ fn, key: ['users', { page: 1, role: 'admin' }] });
        await qc.query({ fn, key: ['users', { page: 1, role: 'admin' }] });

        expect(calls).toBe(1);
      });

      it('handles deeply nested objects as stable keys', async () => {
        const qc = createQuery({ staleTime: 10_000 });
        let calls = 0;
        const fn = async () => {
          calls++;

          return { data: 'ok' };
        };
        const key = ['posts', { filters: { author: 'john', tags: ['a', 'b'] }, page: 1 }];

        await qc.query({ fn, key });
        await qc.query({ fn, key });

        expect(calls).toBe(1);
      });

      it('filters undefined object values so {a:1,b:undefined} and {a:1} produce the same key', async () => {
        const qc = createQuery({ staleTime: 10_000 });
        let calls = 0;
        const fn = async () => {
          calls++;

          return {};
        };

        await qc.query({ fn, key: ['x', { a: 1, b: undefined }] });
        await qc.query({ fn, key: ['x', { a: 1 }] });

        expect(calls).toBe(1);
      });

      it('serializes undefined array elements to a stable string', async () => {
        const qc = createQuery({ staleTime: 10_000 });
        let calls = 0;
        const fn = async () => {
          calls++;

          return {};
        };

        await qc.query({ fn, key: ['x', undefined] });
        await qc.query({ fn, key: ['x', undefined] });

        expect(calls).toBe(1);
      });

      it('prefix invalidation clears all entries whose key starts with the given prefix', async () => {
        const qc = createQuery();
        const fn = async () => ({ id: 1 });

        await qc.query({ fn, key: ['users', { page: 1 }] });
        await qc.query({ fn, key: ['users', { page: 2 }] });

        qc.invalidate(['users']);

        expect(qc.get(['users', { page: 1 }])).toBeUndefined();
        expect(qc.get(['users', { page: 2 }])).toBeUndefined();
      });
    });
  });

  // =========================================================================
  // MUTATION
  // =========================================================================

  describe('Mutation', () => {
    it('executes the mutationFn and returns the result', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 1, name: 'Created' }, 201));

      const addUser = createMutation((data: { name: string }) =>
        fetch('/users', { body: JSON.stringify(data), method: 'POST' }).then((r) => r.json()),
      );

      const result = await addUser.mutate({ name: 'Created' });

      expect(result).toEqual({ id: 1, name: 'Created' });
    });

    it('reports idle -> pending -> success state lifecycle', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 1 }, 201));

      const addUser = createMutation(() => fetch('/users', { method: 'POST' }).then((r) => r.json()));

      const states: MutationState[] = [];
      const unsub = addUser.subscribe((s) => states.push({ ...s }));

      await addUser.mutate(undefined);
      unsub();

      expect(states.map((s) => s.status)).toEqual(['idle', 'pending', 'success']);
      expect(states[2].data).toEqual({ id: 1 });
      expect(states[2].isSuccess).toBe(true);
      expect(states[2].updatedAt).toBeGreaterThan(0);
    });

    it('reports idle -> pending -> error state lifecycle and rejects the caller', async () => {
      fetchMock.mockRejectedValue(new Error('Server error'));

      const fail = createMutation(() => fetch('/fail', { method: 'POST' }).then((r) => r.json()));

      const states: MutationState[] = [];

      fail.subscribe((s) => states.push({ ...s }));

      await expect(fail.mutate(undefined)).rejects.toThrow('Server error');

      expect(states.map((s) => s.status)).toEqual(['idle', 'pending', 'error']);
      expect(states[2].isError).toBe(true);
      expect(states[2].error?.message).toContain('Server error');
    });

    it('reset() returns state to idle with no data or error', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 1 }));

      const mut = createMutation(() => fetch('/users', { method: 'POST' }).then((r) => r.json()));

      await mut.mutate(undefined);

      expect(mut.getState().status).toBe('success');
      mut.reset();
      expect(mut.getState()).toMatchObject({ data: undefined, error: null, status: 'idle' });
    });

    it('throws when mutate() is called while a previous mutation is already in flight', async () => {
      let resolve!: () => void;
      const slow = createMutation<void>(
        () =>
          new Promise<void>((r) => {
            resolve = r;
          }),
      );

      const first = slow.mutate(undefined);

      await expect(slow.mutate(undefined)).rejects.toThrow('mutation already in flight');
      resolve();
      await first;
    });

    it('per-call signal aborts the mutation', async () => {
      const ac = new AbortController();

      const slow = createMutation(
        () =>
          new Promise<void>((resolve, reject) => {
            const id = setTimeout(resolve, 10_000);

            ac.signal.addEventListener('abort', () => {
              clearTimeout(id);
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }),
      );

      const promise = slow.mutate(undefined, { signal: ac.signal });

      ac.abort();
      await expect(promise).rejects.toThrow();
    });

    it('calls onSuccess callback with result and variables', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 1 }, 201));

      const onSuccess = vi.fn();
      const addUser = createMutation((_name: string) => fetch('/users', { method: 'POST' }).then((r) => r.json()), {
        onSuccess,
      });

      await addUser.mutate('Alice');

      expect(onSuccess).toHaveBeenCalledWith({ id: 1 }, 'Alice');
    });

    it('calls onError and onSettled callbacks on failure', async () => {
      fetchMock.mockRejectedValue(new Error('boom'));

      const onError = vi.fn();
      const onSettled = vi.fn();
      const fail = createMutation(() => fetch('/fail', { method: 'POST' }).then((r) => r.json()), {
        onError,
        onSettled,
      });

      await expect(fail.mutate(undefined)).rejects.toThrow('boom');

      expect(onError).toHaveBeenCalledWith(expect.any(Error), undefined);
      expect(onSettled).toHaveBeenCalledWith(undefined, expect.any(Error), undefined);
    });
  });
});
