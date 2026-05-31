import { createApi, HttpError } from '../index';

async function getHttpError<T>(promise: Promise<T>, status?: number): Promise<HttpError> {
  try {
    await promise;
  } catch (error) {
    if (!HttpError.is(error, status)) {
      throw new Error(`Expected promise to reject with HttpError${status === undefined ? '' : ` (${status})`}`, {
        cause: error,
      });
    }

    return error;
  }

  throw new Error('Expected promise to reject with HttpError');
}

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

  describe('URL Construction', () => {
    it('interpolates {param} placeholders', async () => {
      const http = createApi({ baseUrl: 'https://api.example.com' });

      fetchMock.mockResolvedValue(jsonResponse({}));

      await http.get('/users/{id}/posts/{postId}', { params: { id: 1, postId: 42 } });

      expect(fetchMock).toHaveBeenLastCalledWith('https://api.example.com/users/1/posts/42', expect.any(Object));
    });

    it('supports repeated query params and null values', async () => {
      const http = createApi({ baseUrl: 'https://api.example.com' });

      fetchMock.mockResolvedValue(jsonResponse([]));

      await http.get('/users', { query: { page: [1, 2], role: 'admin', search: null } });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/users?page=1&page=2&role=admin&search=',
        expect.any(Object),
      );
    });

    it('does not append a trailing ? for an empty query object', async () => {
      const http = createApi({ baseUrl: 'https://api.example.com' });

      fetchMock.mockResolvedValue(jsonResponse([]));

      await http.get('/users', { query: {} });

      expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/users', expect.any(Object));
    });

    it('does not add a trailing slash when path is empty', async () => {
      const http = createApi({ baseUrl: 'https://api.example.com' });

      fetchMock.mockResolvedValue(jsonResponse({}));

      await http.get('');

      expect(fetchMock).toHaveBeenCalledWith('https://api.example.com', expect.any(Object));
    });
  });

  describe('Methods & Body', () => {
    it('dispatches correct methods including custom methods', async () => {
      const http = createApi({ baseUrl: 'https://api.example.com' });

      fetchMock.mockResolvedValue(jsonResponse({}));

      await http.get('/r');
      expect(fetchMock).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ method: 'GET' }));

      await http.post('/r', { body: {} });
      expect(fetchMock).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ method: 'POST' }));

      await http.request('OPTIONS', '/r');
      expect(fetchMock).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ method: 'OPTIONS' }));
    });

    it('auto-serializes plain-object bodies as JSON', async () => {
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

    it('passes BodyInit values through without serialization', async () => {
      const http = createApi({ baseUrl: 'https://api.example.com' });
      const formData = new FormData();

      fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

      await http.post('/upload', { body: formData });

      expect(fetchMock.mock.calls[0][1].body).toBe(formData);
    });

    it('returns undefined for 204 No Content responses', async () => {
      const http = createApi({ baseUrl: 'https://api.example.com' });

      fetchMock.mockResolvedValue({ headers: new Headers(), ok: true, status: 204 });

      await expect(http.delete('/users/1')).resolves.toBeUndefined();
    });

    it('falls back to text for unknown content-type in auto mode', async () => {
      const http = createApi({ baseUrl: 'https://api.example.com' });

      fetchMock.mockResolvedValue(
        new Response('raw-bytes', {
          headers: { 'content-type': 'application/octet-stream' },
          status: 200,
        }),
      );

      await expect(http.get('/binary')).resolves.toBe('raw-bytes');
    });

    it('parses binary responses when responseType is explicit', async () => {
      const http = createApi({ baseUrl: 'https://api.example.com' });

      fetchMock.mockResolvedValue(
        new Response('raw-bytes', {
          headers: { 'content-type': 'application/octet-stream' },
          status: 200,
        }),
      );

      const data = await http.get<Blob>('/binary', { responseType: 'blob' });

      expect(data).toMatchObject({ size: 9, type: 'application/octet-stream' });
    });
  });

  describe('Headers & Interceptors', () => {
    it('updates headers at runtime', async () => {
      const http = createApi({ headers: { Authorization: 'Bearer old', 'x-trace': 'abc' } });

      http.headers({ Authorization: 'Bearer new', 'x-trace': undefined });
      fetchMock.mockResolvedValue(jsonResponse({}));

      await http.get('/test');

      expect(fetchMock.mock.calls[0][1].headers.authorization).toBe('Bearer new');
      expect(fetchMock.mock.calls[0][1].headers['x-trace']).toBeUndefined();
    });

    it('chains interceptors in onion order', async () => {
      const http = createApi();
      const log: number[] = [];

      fetchMock.mockResolvedValue(jsonResponse({}));

      http.use(async (ctx, next) => {
        log.push(1);

        const res = await next(ctx);

        log.push(4);

        return res;
      });
      http.use(async (ctx, next) => {
        log.push(2);

        const res = await next(ctx);

        log.push(3);

        return res;
      });

      await http.get('/test');

      expect(log).toEqual([1, 2, 3, 4]);
    });

    it('supports short-circuiting interceptors', async () => {
      const http = createApi();

      http.use(
        async () =>
          new Response(JSON.stringify({ mocked: true }), {
            headers: { 'content-type': 'application/json' },
            status: 200,
          }),
      );

      await expect(http.get<{ mocked: boolean }>('/anything')).resolves.toEqual({ mocked: true });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('applies interceptors added after the first request', async () => {
      const http = createApi();

      fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

      await http.get('/before');

      const trace: string[] = [];

      http.use(async (ctx, next) => {
        trace.push('before');

        const res = await next(ctx);

        trace.push('after');

        return res;
      });

      await http.get('/after');

      expect(trace).toEqual(['before', 'after']);
    });

    it('removes interceptor effects after unsubscribe', async () => {
      const http = createApi();
      const trace: string[] = [];

      fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

      const unsubscribe = http.use(async (ctx, next) => {
        trace.push('intercept');

        return next(ctx);
      });

      await http.get('/with-interceptor');
      unsubscribe();
      await http.get('/without-interceptor');

      expect(trace).toEqual(['intercept']);
    });
  });

  describe('Error Classification', () => {
    it('classifies kind as "abort" when the signal is aborted and cause is a non-DOMException', async () => {
      const http = createApi({ baseUrl: 'https://api.example.com' });
      const ac = new AbortController();

      // Interceptor that rejects with a plain Error on abort (simulates third-party interceptors)
      http.use(async (ctx) => {
        return new Promise<never>((_, reject) => {
          ctx.init.signal?.addEventListener('abort', () => reject(new Error('User cancelled')));
        });
      });

      const promise = http.get('/users/1', { signal: ac.signal });

      ac.abort();

      const err: HttpError = await getHttpError(promise);

      expect(err.kind).toBe('abort');
      expect(err.isAborted).toBe(true);
    });

    it('classifies timeout aborts as kind "timeout" when transport throws a generic error', async () => {
      const http = createApi({ baseUrl: 'https://api.example.com', timeout: 5 });

      fetchMock.mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            // Simulate a transport that throws a plain Error on abort, not the timeout
            // DOMException. The library must still classify this as 'timeout' via signal.reason.
            init.signal?.addEventListener('abort', () => reject(new Error('Request cancelled')));
          }),
      );

      const err: HttpError = await getHttpError(http.get('/slow'));

      expect(err.kind).toBe('timeout');
      expect(err.isTimeout).toBe(true);
    });

    it('classifies timeout aborts as kind "timeout" when transport propagates the DOMException cause', async () => {
      const http = createApi({ baseUrl: 'https://api.example.com', timeout: 5 });

      fetchMock.mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new DOMException('Timed out', 'TimeoutError')));
          }),
      );

      const err: HttpError = await getHttpError(http.get('/slow'));

      expect(err.kind).toBe('timeout');
      expect(err.isTimeout).toBe(true);
    });

    it('classifies kind as "network" for errors without a status or abort signal', async () => {
      const http = createApi({ baseUrl: 'https://api.example.com' });

      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

      const err: HttpError = await getHttpError(http.get('/users/1'));

      expect(err.kind).toBe('network');
      expect(err.isTimeout).toBe(false);
      expect(err.isAborted).toBe(false);
    });

    it('classifies kind as "abort" when an external signal aborts before the timeout fires', async () => {
      const http = createApi({ baseUrl: 'https://api.example.com', timeout: 30_000 });
      const ac = new AbortController();

      fetchMock.mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          }),
      );

      const promise = http.get('/slow', { signal: ac.signal });

      ac.abort();

      const err: HttpError = await getHttpError(promise);

      expect(err.kind).toBe('abort');
      expect(err.isAborted).toBe(true);
      expect(err.isTimeout).toBe(false);
    });
  });

  describe('Deduplication', () => {
    it('auto-deduplicates concurrent idempotent requests', async () => {
      const http = createApi();

      fetchMock.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(jsonResponse({ id: 1 })), 50)),
      );

      const [a, b, c] = await Promise.all([http.get('/users/1'), http.get('/users/1'), http.get('/users/1')]);

      expect(a).toEqual({ id: 1 });
      expect(b).toEqual({ id: 1 });
      expect(c).toEqual({ id: 1 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not deduplicate POST requests unless dedupeKey is provided', async () => {
      const http = createApi();

      fetchMock.mockResolvedValue(jsonResponse({ id: 1 }));

      await Promise.all([http.post('/users', { body: { name: 'A' } }), http.post('/users', { body: { name: 'A' } })]);

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does not pass dedupeKey through to fetch RequestInit', async () => {
      const http = createApi();

      fetchMock.mockResolvedValue(jsonResponse({ id: 1 }));

      await http.post('/users', { body: { name: 'A' }, dedupeKey: ['create-user', 'A'] });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect('dedupeKey' in fetchMock.mock.calls[0][1]).toBe(false);
    });

    it('deduplicates non-idempotent requests when dedupeKey is explicit', async () => {
      const http = createApi();

      fetchMock.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(jsonResponse({ id: 1 })), 50)),
      );

      const [r1, r2] = await Promise.all([
        http.post('/users', { body: { name: 'A' }, dedupeKey: ['create-user', 'A'] }),
        http.post('/users', { body: { name: 'A' }, dedupeKey: ['create-user', 'A'] }),
      ]);

      expect(r1).toEqual({ id: 1 });
      expect(r2).toEqual({ id: 1 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not deduplicate concurrent reads when responseType differs', async () => {
      const http = createApi();

      fetchMock.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(jsonResponse({ id: 1 })), 50)),
      );

      await Promise.all([
        http.get('/users/1', { responseType: 'json' }),
        http.get('/users/1', { responseType: 'text' }),
      ]);

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('deduplicates concurrent reads regardless of per-request headers', async () => {
      // Headers are excluded from the dedup key within a single client instance
      // (headers are uniform; a token refresh changes globalHeaders atomically).
      const http = createApi();

      fetchMock.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(jsonResponse({ id: 1 })), 50)),
      );

      const [r1, r2] = await Promise.all([
        http.get('/users/1', { headers: { 'accept-language': 'en' } }),
        http.get('/users/1', { headers: { 'accept-language': 'de' } }),
      ]);

      expect(r1).toEqual({ id: 1 });
      expect(r2).toEqual({ id: 1 });
      // Both requests share the same in-flight promise — only one fetch is made
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('skips deduplication when dedupe: false', async () => {
      const http = createApi();

      fetchMock.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(jsonResponse({ id: 1 })), 50)),
      );

      await Promise.all([http.get('/users/1', { dedupe: false }), http.get('/users/1', { dedupe: false })]);

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('deduplicates concurrent reads when responseType is identical', async () => {
      const http = createApi();

      fetchMock.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(jsonResponse({ id: 1 })), 50)),
      );

      const [r1, r2] = await Promise.all([
        http.get('/users/1', { responseType: 'json' }),
        http.get('/users/1', { responseType: 'json' }),
      ]);

      expect(r1).toEqual({ id: 1 });
      expect(r2).toEqual({ id: 1 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not deduplicate idempotent reads with different URLs', async () => {
      const http = createApi();

      fetchMock.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(jsonResponse({ id: 1 })), 50)),
      );

      await Promise.all([http.get('/users/1'), http.get('/users/2')]);

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does NOT auto-deduplicate concurrent DELETE requests', async () => {
      // DELETE is idempotent but has side-effects; dedup must be opt-in via dedupeKey.
      const http = createApi();

      fetchMock.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(jsonResponse(null)), 50)));

      await Promise.all([http.delete('/users/1'), http.delete('/users/1')]);

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('deduplicates DELETE requests when explicit dedupeKey is provided', async () => {
      const http = createApi();

      fetchMock.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(jsonResponse(null)), 50)));

      const [r1, r2] = await Promise.all([
        http.delete('/users/1', { dedupeKey: 'del-user-1' }),
        http.delete('/users/1', { dedupeKey: 'del-user-1' }),
      ]);

      expect(r1).toBeNull();
      expect(r2).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Timeout & Errors', () => {
    it('supports infinity timeout and rejects invalid timeout values', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

      await expect(createApi({ timeout: Number.POSITIVE_INFINITY }).get('/test')).resolves.toBeDefined();
      expect(() => createApi({ timeout: 0 })).toThrow(/timeout must be a positive number or Infinity/i);
      expect(() => createApi({ timeout: -1 })).toThrow(/timeout must be a positive number or Infinity/i);
      expect(() => createApi({ timeout: Number.NaN })).toThrow(/timeout must be a positive number or Infinity/i);
    });

    it('uses the provided fetch implementation when configured', async () => {
      const localFetch = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
      const http = createApi({ fetch: localFetch as typeof fetch });

      await http.get('/test');

      expect(localFetch).toHaveBeenCalledTimes(1);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('wraps network errors in HttpError preserving url and method', async () => {
      const http = createApi({ baseUrl: 'https://api.example.com' });

      fetchMock.mockRejectedValue(new Error('Network error'));

      const err: HttpError = await getHttpError(http.get('/users/1'));

      expect(err).toBeInstanceOf(HttpError);
      expect(err).toMatchObject({ method: 'GET', url: 'https://api.example.com/users/1' });
    });

    it('wraps non-OK responses in HttpError with status and data', async () => {
      const http = createApi({ baseUrl: 'https://api.example.com' });

      fetchMock.mockResolvedValue(jsonResponse({ error: 'Not found' }, 404));

      const err: HttpError = await getHttpError(http.get('/users/999'), 404);

      expect(err).toBeInstanceOf(HttpError);
      expect(err).toMatchObject({ data: { error: 'Not found' }, status: 404 });
      expect(HttpError.is(err, 404)).toBe(true);
    });

    it('HttpError.headers provides shorthand access to response headers', async () => {
      const http = createApi({ baseUrl: 'https://api.example.com' });

      fetchMock.mockResolvedValue({
        headers: new Headers({ 'content-type': 'application/json', 'x-request-id': 'abc123' }),
        json: async () => ({ error: 'gone' }),
        ok: false,
        status: 410,
        statusText: 'Gone',
      });

      const err: HttpError = await getHttpError(http.get('/old'));

      expect(err.headers).toBeInstanceOf(Headers);
      expect(err.headers?.get('x-request-id')).toBe('abc123');
    });

    it('[Symbol.dispose] delegates to dispose()', () => {
      const http = createApi();

      expect(http.disposed).toBe(false);
      http[Symbol.dispose]();
      expect(http.disposed).toBe(true);
    });

    it('cancelAll() aborts all in-flight requests', async () => {
      const http = createApi({ baseUrl: 'https://api.example.com' });
      let aborted = false;

      fetchMock.mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => {
              aborted = true;
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }),
      );

      const p = http.get('/slow').catch(() => {});

      http.cancelAll();
      await p;

      expect(aborted).toBe(true);
      // Client should still be usable after cancelAll
      expect(http.disposed).toBe(false);
      fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
      await expect(http.get('/test')).resolves.toBeDefined();
    });
  });
});
