/** biome-ignore-all lint/suspicious/noExplicitAny: */
import { createHttpClient, createQueryClient, HttpError, type MutationState, type QueryState } from './fetchit';

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
      it('interpolates :param style path parameters', async () => {
        const http = createHttpClient({ baseUrl: 'https://api.example.com' });
        fetchMock.mockResolvedValue(jsonResponse({}));

        await http.get('/users/:id/posts/:postId', { params: { id: 1, postId: 42 } });

        expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/users/1/posts/42', expect.any(Object));
      });

      it('interpolates {param} style path parameters', async () => {
        const http = createHttpClient({ baseUrl: 'https://api.example.com' });
        fetchMock.mockResolvedValue(jsonResponse({}));

        await http.get('/users/{id}', { params: { id: 'abc' } });

        expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/users/abc', expect.any(Object));
      });

      it('appends search params as a query string', async () => {
        const http = createHttpClient({ baseUrl: 'https://api.example.com' });
        fetchMock.mockResolvedValue(jsonResponse([]));

        await http.get('/users', { search: { page: 2, role: 'admin' } });

        expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/users?page=2&role=admin', expect.any(Object));
      });

      it('combines path params and search params', async () => {
        const http = createHttpClient({ baseUrl: 'https://api.example.com' });
        fetchMock.mockResolvedValue(jsonResponse([]));

        await http.get('/users/:id/posts', { params: { id: 5 }, search: { limit: 10 } });

        expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/users/5/posts?limit=10', expect.any(Object));
      });

      it('omits undefined search params', async () => {
        const http = createHttpClient({ baseUrl: 'https://api.example.com' });
        fetchMock.mockResolvedValue(jsonResponse([]));

        await http.get('/users', { search: { page: 1, role: undefined } });

        expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/users?page=1', expect.any(Object));
      });
    });

    // -----------------------------------------------------------------------
    // HTTP Methods & Body Serialization
    // -----------------------------------------------------------------------

    describe('HTTP Methods & Body Serialization', () => {
      it('dispatches GET, POST, PUT, PATCH, DELETE and custom methods', async () => {
        const http = createHttpClient({ baseUrl: 'https://api.example.com' });
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
        const http = createHttpClient({ baseUrl: 'https://api.example.com' });
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
        const http = createHttpClient({ baseUrl: 'https://api.example.com' });
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
        const http = createHttpClient({ baseUrl: 'https://api.example.com' });
        fetchMock.mockResolvedValue({ headers: new Headers(), ok: true, status: 204 });

        const result = await http.delete('/users/1');

        expect(result).toBeUndefined();
      });
    });

    // -----------------------------------------------------------------------
    // Headers
    // -----------------------------------------------------------------------

    describe('Headers', () => {
      it('sends initial headers on every request', async () => {
        const http = createHttpClient({ headers: { Authorization: 'Bearer token', 'x-app': 'test' } });
        fetchMock.mockResolvedValue(jsonResponse({}));

        await http.get('/test');

        expect(fetchMock).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({ Authorization: 'Bearer token', 'x-app': 'test' }),
          }),
        );
      });

      it('setHeaders() updates a header dynamically', async () => {
        const http = createHttpClient({ headers: { Authorization: 'Bearer old' } });
        http.setHeaders({ Authorization: 'Bearer new' });
        fetchMock.mockResolvedValue(jsonResponse({}));

        await http.get('/test');

        expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer new');
      });

      it('setHeaders() removes a header when value is undefined', async () => {
        const http = createHttpClient({ headers: { 'x-trace': 'abc' } });
        http.setHeaders({ 'x-trace': undefined });
        fetchMock.mockResolvedValue(jsonResponse({}));

        await http.get('/test');

        expect(fetchMock.mock.calls[0][1].headers['x-trace']).toBeUndefined();
      });
    });

    // -----------------------------------------------------------------------
    // Interceptors
    // -----------------------------------------------------------------------

    describe('Interceptors', () => {
      it('runs an interceptor that can modify request context', async () => {
        const http = createHttpClient({ baseUrl: 'https://api.example.com' });
        fetchMock.mockResolvedValue(jsonResponse({ id: 1 }));

        http.use(async ({ url, init }, next) =>
          next({ url, init: { ...init, headers: { ...(init.headers as Record<string, string>), 'x-custom': 'yes' } } }),
        );

        await http.get('/users/1');

        expect(fetchMock.mock.calls[0][1].headers['x-custom']).toBe('yes');
      });

      it('chains multiple interceptors in onion order', async () => {
        const http = createHttpClient();
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
        const http = createHttpClient();
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

      it('an interceptor can short-circuit fetch entirely', async () => {
        const http = createHttpClient();

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
    // Request Deduplication
    // -----------------------------------------------------------------------

    describe('Request Deduplication', () => {
      it('auto-deduplicates concurrent GET requests (idempotent by default)', async () => {
        const http = createHttpClient();
        fetchMock.mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(jsonResponse({ id: 1 })), 50)),
        );

        const [r1, r2, r3] = await Promise.all([http.get('/users/1'), http.get('/users/1'), http.get('/users/1')]);

        expect(r1).toEqual({ id: 1 });
        expect(r2).toEqual({ id: 1 });
        expect(r3).toEqual({ id: 1 });
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      it('does NOT deduplicate POST requests by default', async () => {
        const http = createHttpClient();
        fetchMock.mockResolvedValue(jsonResponse({ id: 1 }));

        await Promise.all([http.post('/users', { body: { name: 'A' } }), http.post('/users', { body: { name: 'A' } })]);

        expect(fetchMock).toHaveBeenCalledTimes(2);
      });

      it('deduplicates POST when global dedupe:true is set', async () => {
        const http = createHttpClient({ dedupe: true });
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
        const http = createHttpClient();
        fetchMock.mockResolvedValue(jsonResponse({ id: 1 }));

        await Promise.all([http.get('/users/1', { dedupe: false }), http.get('/users/1', { dedupe: false })]);

        expect(fetchMock).toHaveBeenCalledTimes(2);
      });

      it('handles BodyInit binary types in dedupe key without crashing', async () => {
        const http = createHttpClient({ dedupe: true });
        fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

        const fd = new FormData();
        fd.append('x', '1');
        await expect(http.post('/upload', { body: fd })).resolves.toBeDefined();
        await expect(http.post('/upload', { body: new Blob(['hi']) })).resolves.toBeDefined();
        await expect(http.post('/binary', { body: new ArrayBuffer(4) })).resolves.toBeDefined();
      });

      it('rejects with TypeError when a plain-object body has circular references', async () => {
        const http = createHttpClient({ dedupe: true });

        const circular: any = { a: 1 };
        circular.self = circular;

        await expect(http.post('/json', { body: circular })).rejects.toThrow(TypeError);
      });

      it('deduplicates FormData requests since they share the same serialized body key', async () => {
        const http = createHttpClient({ dedupe: true });
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
    });

    // -----------------------------------------------------------------------
    // Timeout
    // -----------------------------------------------------------------------

    describe('Timeout', () => {
      it('timeout:0 and timeout:Infinity complete requests without timer errors', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

        await expect(createHttpClient({ timeout: 0 }).get('/test')).resolves.toBeDefined();
        await expect(createHttpClient({ timeout: Number.POSITIVE_INFINITY }).get('/test')).resolves.toBeDefined();
      });
    });

    // -----------------------------------------------------------------------
    // Error Handling
    // -----------------------------------------------------------------------

    describe('Error Handling', () => {
      it('wraps network errors in HttpError preserving url and method', async () => {
        const http = createHttpClient({ baseUrl: 'https://api.example.com' });
        fetchMock.mockRejectedValue(new Error('Network error'));

        const err = await http.get('/users/1').catch((e) => e);

        expect(err).toBeInstanceOf(HttpError);
        if (!(err instanceof HttpError)) throw err;
        expect(err.url).toBe('https://api.example.com/users/1');
        expect(err.method).toBe('GET');
      });

      it('wraps non-OK responses in HttpError with status and parsed body as cause', async () => {
        const http = createHttpClient({ baseUrl: 'https://api.example.com' });
        fetchMock.mockResolvedValue(jsonResponse({ error: 'Not found' }, 404));

        const err = await http.get('/users/999').catch((e) => e);

        expect(err).toBeInstanceOf(HttpError);
        if (!(err instanceof HttpError)) throw err;
        expect(err.status).toBe(404);
        expect(err.cause).toEqual({ error: 'Not found' });
      });
    });
  });

  // =========================================================================
  // QUERY CLIENT
  // =========================================================================

  describe('Query Client', () => {
    // -----------------------------------------------------------------------
    // Caching
    // -----------------------------------------------------------------------

    describe('Caching', () => {
      it('serves fresh data from cache without re-executing fn', async () => {
        const qc = createQueryClient();
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
        const qc = createQueryClient();
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
        const qc = createQueryClient();
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

      it('enabled:false returns undefined without executing fn', async () => {
        const qc = createQueryClient();
        let called = false;

        const result = await qc.query({
          enabled: false,
          fn: async () => {
            called = true;
            return 1;
          },
          key: ['x'],
        });

        expect(result).toBeUndefined();
        expect(called).toBe(false);
      });

      it('enabled:false returns existing cached data', async () => {
        const qc = createQueryClient();
        qc.setData(['users', 1], { id: 1, name: 'Alice' });

        const result = await qc.query({ enabled: false, fn: async () => ({ id: 99 }), key: ['users', 1] });

        expect(result).toEqual({ id: 1, name: 'Alice' });
      });
    });

    // -----------------------------------------------------------------------
    // Prefetch
    // -----------------------------------------------------------------------

    describe('Prefetch', () => {
      it('populates the cache', async () => {
        const qc = createQueryClient();

        await qc.prefetch({ fn: async () => ({ id: 1, name: 'Test' }), key: ['users', 1] });

        expect(qc.getData(['users', 1])).toEqual({ id: 1, name: 'Test' });
      });

      it('silently ignores errors — returns undefined, never throws', async () => {
        const qc = createQueryClient();

        await expect(
          qc.prefetch({
            fn: async () => {
              throw new Error('fail');
            },
            key: ['users', 1],
            retry: false,
          }),
        ).resolves.toBeUndefined();
      });
    });

    // -----------------------------------------------------------------------
    // Retry
    // -----------------------------------------------------------------------

    describe('Retry', () => {
      it('retries the fn up to the specified count before succeeding', async () => {
        const qc = createQueryClient();
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
        const qc = createQueryClient();
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
    // State & Subscriptions
    // -----------------------------------------------------------------------

    describe('State & Subscriptions', () => {
      it('getState() returns null before any query', () => {
        const qc = createQueryClient();
        expect(qc.getState(['never'])).toBeNull();
      });

      it('getState() returns full state shape after a successful query', async () => {
        const qc = createQueryClient();

        await qc.query({ fn: async () => ({ id: 1 }), key: ['users', 1] });

        expect(qc.getState(['users', 1])).toMatchObject({
          data: { id: 1 },
          error: null,
          isError: false,
          isIdle: false,
          isLoading: false,
          isSuccess: true,
          status: 'success',
        });
        expect(qc.getState(['users', 1])!.updatedAt).toBeGreaterThan(0);
      });

      it('subscribe() fires through idle -> pending -> success transitions', async () => {
        const qc = createQueryClient();
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

      it('setData() notifies subscribers immediately with the new value', () => {
        const qc = createQueryClient();
        const states: QueryState[] = [];

        qc.subscribe(['users', 1], (s) => states.push({ ...s }));
        qc.setData(['users', 1], { id: 1, name: 'Alice' });

        expect(states[states.length - 1].data).toEqual({ id: 1, name: 'Alice' });
      });
    });

    // -----------------------------------------------------------------------
    // Cache Management
    // -----------------------------------------------------------------------

    describe('Cache Management', () => {
      it('setData with a value and getData round-trip', () => {
        const qc = createQueryClient();
        qc.setData(['users', 1], { id: 1, name: 'Manual' });

        expect(qc.getData(['users', 1])).toEqual({ id: 1, name: 'Manual' });
        expect(fetchMock).not.toHaveBeenCalled();
      });

      it('setData with a function updater merges with existing data', () => {
        const qc = createQueryClient();
        qc.setData(['users', 1], { id: 1, name: 'Alice' });
        qc.setData<{ id: number; name: string }>(['users', 1], (old) => ({ ...old!, name: 'Bob' }));

        expect(qc.getData(['users', 1])).toEqual({ id: 1, name: 'Bob' });
      });

      it('invalidate() clears the exact key and forces a re-fetch', async () => {
        const qc = createQueryClient();
        let calls = 0;
        const fn = async () => {
          calls++;
          return { id: 1 };
        };

        await qc.query({ fn, key: ['users', 1], staleTime: 10_000 });
        expect(calls).toBe(1);

        qc.invalidate(['users', 1]);
        await qc.query({ fn, key: ['users', 1], staleTime: 10_000 });
        expect(calls).toBe(2);
      });

      it('clear() removes all cached entries', () => {
        const qc = createQueryClient();
        qc.setData(['a'], 1);
        qc.setData(['b'], 2);
        qc.clear();

        expect(qc.getData(['a'])).toBeUndefined();
        expect(qc.getData(['b'])).toBeUndefined();
      });
    });

    // -----------------------------------------------------------------------
    // Key Serialization
    // -----------------------------------------------------------------------

    describe('Key Serialization', () => {
      it('treats objects with different property order as the same cache key', async () => {
        const qc = createQueryClient({ staleTime: 10_000 });
        let calls = 0;
        const fn = async () => {
          calls++;
          return { id: 1 };
        };

        await qc.query({ fn, key: ['users', { page: 1, role: 'admin' }] });
        await qc.query({ fn, key: ['users', { role: 'admin', page: 1 }] });

        expect(calls).toBe(1);
      });

      it('invalidate() with a prefix clears all matching entries', async () => {
        const qc = createQueryClient();
        const fn = async () => ({ id: 1 });

        await qc.query({ fn, key: ['users', { page: 1 }] });
        await qc.query({ fn, key: ['users', { page: 2 }] });

        qc.invalidate(['users']);

        expect(qc.getData(['users', { page: 1 }])).toBeUndefined();
        expect(qc.getData(['users', { page: 2 }])).toBeUndefined();
      });

      it('handles deeply nested objects as stable cache keys', async () => {
        const qc = createQueryClient({ staleTime: 10_000 });
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
    });
  });

  // =========================================================================
  // MUTATION
  // =========================================================================

  describe('Mutation', () => {
    it('executes the mutationFn and returns the result', async () => {
      const qc = createQueryClient();
      fetchMock.mockResolvedValue(jsonResponse({ id: 1, name: 'Created' }, 201));

      const addUser = qc.mutation((data: { name: string }) =>
        fetch('/users', { body: JSON.stringify(data), method: 'POST' }).then((r) => r.json()),
      );

      const result = await addUser.mutate({ name: 'Created' });
      expect(result).toEqual({ id: 1, name: 'Created' });
    });

    it('reports idle -> pending -> success state lifecycle via subscribe', async () => {
      const qc = createQueryClient();
      fetchMock.mockResolvedValue(jsonResponse({ id: 1 }, 201));

      const addUser = qc.mutation(() => fetch('/users', { method: 'POST' }).then((r) => r.json()));

      const states: MutationState[] = [];
      const unsub = addUser.subscribe((s) => states.push({ ...s }));
      await addUser.mutate(undefined);
      unsub();

      expect(states.map((s) => s.status)).toEqual(['idle', 'pending', 'success']);
      expect(states[2].data).toEqual({ id: 1 });
      expect(states[2].isSuccess).toBe(true);
      expect(states[2].updatedAt).toBeGreaterThan(0);
    });

    it('reports idle -> pending -> error state lifecycle on failure', async () => {
      const qc = createQueryClient();
      fetchMock.mockRejectedValue(new Error('Server error'));

      const fail = qc.mutation(() => fetch('/fail', { method: 'POST' }).then((r) => r.json()));

      const states: MutationState[] = [];
      fail.subscribe((s) => states.push({ ...s }));

      await expect(fail.mutate(undefined)).rejects.toThrow();

      expect(states.map((s) => s.status)).toEqual(['idle', 'pending', 'error']);
      expect(states[2].isError).toBe(true);
      expect(states[2].error?.message).toContain('Server error');
    });

    it('reset() returns state to idle with no data or error', async () => {
      const qc = createQueryClient();
      fetchMock.mockResolvedValue(jsonResponse({ id: 1 }));

      const mut = qc.mutation(() => fetch('/users', { method: 'POST' }).then((r) => r.json()));
      await mut.mutate(undefined);

      expect(mut.getState().status).toBe('success');
      mut.reset();
      expect(mut.getState()).toMatchObject({ status: 'idle', data: undefined, error: null });
    });

    it('throws the original error to the caller', async () => {
      const qc = createQueryClient();
      fetchMock.mockRejectedValue(new Error('boom'));

      const fail = qc.mutation(() => fetch('/fail', { method: 'POST' }).then((r) => r.json()));
      await expect(fail.mutate(undefined)).rejects.toThrow('boom');
    });
  });
});
