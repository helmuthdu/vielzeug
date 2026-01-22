/** biome-ignore-all lint/suspicious/noExplicitAny: - */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { buildUrl, createFetchService } from './fetchit';

vi.mock('@vielzeug/logit', () => ({
  Logit: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('buildUrl', () => {
  test('returns base URL when params are empty or undefined', () => {
    expect(buildUrl('https://api.example.com/users')).toBe('https://api.example.com/users');
    expect(buildUrl('https://api.example.com/users', {})).toBe('https://api.example.com/users');
  });

  test('builds URL with query parameters and skips undefined values', () => {
    const url = buildUrl('https://api.example.com/users', {
      age: 30,
      id: 1,
      name: undefined,
    });

    const params = new URL(url).searchParams;
    expect(params.get('id')).toBe('1');
    expect(params.get('age')).toBe('30');
    expect(params.has('name')).toBe(false);
  });

  test('properly encodes special characters', () => {
    const url = buildUrl('https://api.example.com/search', {
      filter: 'type=user&status=active',
      query: 'hello world',
    });

    const params = new URL(url).searchParams;
    expect(params.get('query')).toBe('hello world');
    expect(params.get('filter')).toBe('type=user&status=active');
  });
});

describe('createFetchService', () => {
  let fetchMock: any;
  const mockJsonResponse = (data: any, status = 200) => ({
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
    ok: status >= 200 && status < 300,
    status,
  });

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('HTTP methods and response parsing', () => {
    test('handles different HTTP methods with proper configuration', async () => {
      const service = createFetchService({ url: 'https://api.example.com' });
      const mockData = { id: 1 };

      fetchMock.mockResolvedValue(mockJsonResponse(mockData));

      await service.get('users/1');
      expect(fetchMock).toHaveBeenLastCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({ method: 'GET' }),
      );

      await service.post('users', { body: { name: 'Test' } });
      expect(fetchMock).toHaveBeenLastCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          body: JSON.stringify({ name: 'Test' }),
          method: 'POST',
        }),
      );

      await service.put('users/1', { body: { name: 'Updated' } });
      expect(fetchMock).toHaveBeenLastCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({ method: 'PUT' }),
      );

      await service.patch('users/1', { body: { status: 'active' } });
      expect(fetchMock).toHaveBeenLastCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({ method: 'PATCH' }),
      );

      await service.delete('users/1');
      expect(fetchMock).toHaveBeenLastCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    test('parses different content types correctly', async () => {
      const service = createFetchService({ url: 'https://api.example.com' });

      // JSON
      fetchMock.mockResolvedValueOnce(mockJsonResponse({ id: 1 }));
      const jsonResponse = await service.get('data.json');
      expect(jsonResponse.data).toEqual({ id: 1 });

      // Text
      fetchMock.mockResolvedValueOnce({
        headers: new Headers({ 'content-type': 'text/plain' }),
        ok: true,
        status: 200,
        text: async () => 'Hello',
      });
      const textResponse = await service.get('data.txt');
      expect(textResponse.data).toBe('Hello');

      // Blob
      const blob = new Blob(['test']);
      fetchMock.mockResolvedValueOnce({
        blob: async () => blob,
        headers: new Headers({ 'content-type': 'application/octet-stream' }),
        ok: true,
        status: 200,
      });
      const blobResponse = await service.get('file.bin');
      expect(blobResponse.data).toBe(blob);
    });
  });

  describe('Caching behavior', () => {
    test('caches GET requests and invalidates on demand', async () => {
      const service = createFetchService({ url: 'https://api.example.com' });
      let callCount = 0;

      fetchMock.mockImplementation(async () => {
        callCount++;
        return mockJsonResponse({ count: callCount });
      });

      const id = `cache-${Date.now()}`;

      // First call
      await service.get('data', { id });
      expect(callCount).toBe(1);

      // Cached call
      await service.get('data', { id });
      expect(callCount).toBe(1);

      // Invalidate cache
      await service.get('data', { id, invalidate: true });
      expect(callCount).toBe(2);
    });

    test('does not cache non-GET requests', async () => {
      const service = createFetchService({ url: 'https://api.example.com' });
      fetchMock.mockResolvedValue(mockJsonResponse({ id: 1 }));

      await service.post('users', { body: { name: 'Test' } });
      await service.post('users', { body: { name: 'Test' } });

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    test('caches successful responses even with error status codes', async () => {
      const service = createFetchService({ url: 'https://api.example.com' });
      let callCount = 0;

      fetchMock.mockImplementation(async () => {
        callCount++;
        return mockJsonResponse({ error: 'Not found' }, 404);
      });

      const id = `error-${Date.now()}`;

      // First request - will get 404 but still cache it (successful fetch, just error status)
      await service.get('missing', { id });
      expect(callCount).toBe(1);

      // Second request - should use cache since the fetch succeeded (even though HTTP status was 404)
      await service.get('missing', { id });
      expect(callCount).toBe(1); // Still 1 because it's cached
    });
  });

  describe('Headers and configuration', () => {
    test('merges context headers with request headers', async () => {
      const service = createFetchService({
        headers: { Authorization: 'Bearer token123' },
        url: 'https://api.example.com',
      });

      fetchMock.mockResolvedValue(mockJsonResponse({}));

      await service.get('data', {
        headers: { 'X-Custom': 'value' },
        id: `headers-${Date.now()}`,
      });

      const [, config] = fetchMock.mock.calls[0];
      expect(config.headers.Authorization).toBe('Bearer token123');
      expect(config.headers['X-Custom']).toBe('value');
    });

    test('setHeaders updates and removes headers', async () => {
      const service = createFetchService({
        headers: { Authorization: 'old', 'X-Keep': 'value' },
        url: 'https://api.example.com',
      });

      fetchMock.mockResolvedValue(mockJsonResponse({}));

      service.setHeaders({ Authorization: undefined, 'X-New': 'header' });

      await service.get('data', { id: `set-headers-${Date.now()}` });

      const [, config] = fetchMock.mock.calls[0];
      expect(config.headers.Authorization).toBeUndefined();
      expect(config.headers['X-Keep']).toBe('value');
      expect(config.headers['X-New']).toBe('header');
    });

    test('constructs URLs correctly with and without context', async () => {
      fetchMock.mockResolvedValue(mockJsonResponse({}));

      const serviceWithContext = createFetchService({ url: 'https://api.example.com' });
      await serviceWithContext.get('users', { id: `url-1-${Date.now()}` });
      expect(fetchMock).toHaveBeenLastCalledWith('https://api.example.com/users', expect.any(Object));

      const serviceWithoutContext = createFetchService();
      await serviceWithoutContext.get('https://full.url.com/users', { id: `url-2-${Date.now()}` });
      expect(fetchMock).toHaveBeenLastCalledWith('https://full.url.com/users', expect.any(Object));
    });
  });

  describe('Error handling and retries', () => {
    test('retries on network errors up to 3 times', async () => {
      const service = createFetchService({ url: 'https://api.example.com' });
      let attempts = 0;

      fetchMock.mockImplementation(async () => {
        attempts++;
        if (attempts < 3) throw new TypeError('Network error');
        return mockJsonResponse({ success: true });
      });

      const result = await service.get('data', { id: `retry-${Date.now()}` });

      expect(attempts).toBe(3);
      expect(result.data.success).toBe(true);
    });

    test('fails after max retries on persistent network errors', async () => {
      const service = createFetchService({ url: 'https://api.example.com' });
      let attempts = 0;

      fetchMock.mockImplementation(async () => {
        attempts++;
        throw new TypeError('Network error');
      });

      await expect(service.get('data', { id: `fail-${Date.now()}` })).rejects.toThrow('Network error');
      expect(attempts).toBe(3); // Initial + 2 retries
    });

    test('does not retry on non-network errors', async () => {
      const service = createFetchService({ url: 'https://api.example.com' });
      let attempts = 0;

      fetchMock.mockImplementation(async () => {
        attempts++;
        throw new Error('Server error');
      });

      await expect(service.get('data', { id: `no-retry-${Date.now()}` })).rejects.toThrow('Server error');
      expect(attempts).toBe(1);
    });

    test('handles HTTP error responses without throwing', async () => {
      const service = createFetchService({ url: 'https://api.example.com' });

      fetchMock.mockResolvedValue(mockJsonResponse({ error: 'Not found' }, 404));

      const response = await service.get('missing', { id: `404-${Date.now()}` });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
      expect(response.data.error).toBe('Not found');
    });
  });

  describe('Request cancellation and timeout', () => {
    test('includes AbortSignal for request cancellation', async () => {
      const service = createFetchService({
        timeout: 10000,
        url: 'https://api.example.com',
      });

      fetchMock.mockResolvedValue(mockJsonResponse({}));

      await service.get('data', { id: `timeout-${Date.now()}` });

      const [, config] = fetchMock.mock.calls[0];
      expect(config.signal).toBeInstanceOf(AbortSignal);
    });
  });
});
