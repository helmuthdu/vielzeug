import { createApi, HttpError } from '../index';

describe('HTTP Client', () => {
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
      expect(fetchMock).toHaveBeenLastCalledWith('https://api.example.com/users?page=2&role=admin', expect.any(Object));

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
          headers: expect.objectContaining({ authorization: 'Bearer token', 'x-app': 'test' }),
        }),
      );
    });

    it('headers() updates existing headers and removes headers when value is undefined', async () => {
      const http = createApi({ headers: { Authorization: 'Bearer old', 'x-trace': 'abc' } });

      http.headers({ Authorization: 'Bearer new', 'x-trace': undefined });
      fetchMock.mockResolvedValue(jsonResponse({}));

      await http.get('/test');

      expect(fetchMock.mock.calls[0][1].headers.authorization).toBe('Bearer new');
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
