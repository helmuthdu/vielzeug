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

    it('always deduplicates idempotent reads', async () => {
      const http = createApi();

      fetchMock.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(jsonResponse({ id: 1 })), 50)),
      );

      await Promise.all([http.get('/users/1'), http.get('/users/1')]);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Timeout & Errors', () => {
    it('supports timeout edge values', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

      await expect(createApi({ timeout: 0 }).get('/test')).resolves.toBeDefined();
      await expect(createApi({ timeout: Number.POSITIVE_INFINITY }).get('/test')).resolves.toBeDefined();
    });

    it('wraps network errors in HttpError preserving url and method', async () => {
      const http = createApi({ baseUrl: 'https://api.example.com' });

      fetchMock.mockRejectedValue(new Error('Network error'));

      const err = await http.get('/users/1').catch((error) => error);

      expect(err).toBeInstanceOf(HttpError);
      expect(err).toMatchObject({ method: 'GET', url: 'https://api.example.com/users/1' });
    });

    it('wraps non-OK responses in HttpError with status and data', async () => {
      const http = createApi({ baseUrl: 'https://api.example.com' });

      fetchMock.mockResolvedValue(jsonResponse({ error: 'Not found' }, 404));

      const err = await http.get('/users/999').catch((error) => error);

      expect(err).toBeInstanceOf(HttpError);
      expect(err).toMatchObject({ data: { error: 'Not found' }, status: 404 });
      expect(HttpError.is(err, 404)).toBe(true);
    });
  });
});
