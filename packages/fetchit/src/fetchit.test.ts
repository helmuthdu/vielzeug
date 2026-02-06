import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchit, HttpError } from './fetchit';

vi.mock('@vielzeug/logit', () => ({
  Logit: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('Fetchit - Modern Query Management', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  const mockJsonResponse = (data: unknown, status = 200) => ({
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
    ok: status >= 200 && status < 300,
    status,
  });

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // ========================================================================
  // REST API (Backward Compatibility)
  // ========================================================================

  describe('REST API methods', () => {
    it('should support GET requests', async () => {
      const client = fetchit({ baseUrl: 'https://api.example.com' });
      const mockData = { id: 1, name: 'Test' };

      fetchMock.mockResolvedValue(mockJsonResponse(mockData));

      const response = await client.get('/users/1');

      expect(response.data).toEqual(mockData);
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('should support POST requests with body', async () => {
      const client = fetchit({ baseUrl: 'https://api.example.com' });
      const mockData = { id: 1, name: 'Created' };

      fetchMock.mockResolvedValue(mockJsonResponse(mockData, 201));

      const response = await client.post('/users', {
        body: { name: 'Created' },
      });

      expect(response.data).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Created' }),
        }),
      );
    });

    it('should support PUT, PATCH, DELETE methods', async () => {
      const client = fetchit({ baseUrl: 'https://api.example.com' });

      fetchMock.mockResolvedValue(mockJsonResponse({}));

      await client.put('/users/1', { body: { name: 'Updated' } });
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'PUT' }),
      );

      await client.patch('/users/1', { body: { status: 'active' } });
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'PATCH' }),
      );

      await client.delete('/users/1');
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('should handle query parameters', async () => {
      const client = fetchit({ baseUrl: 'https://api.example.com' });

      fetchMock.mockResolvedValue(mockJsonResponse([]));

      await client.get('/users', {
        params: { age: 25, role: 'admin' },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/users?age=25&role=admin',
        expect.any(Object),
      );
    });
  });

  // ========================================================================
  // QUERY API (New V2 Features)
  // ========================================================================

  describe('Query API - Caching', () => {
    it('should cache query results', async () => {
      const client = fetchit();
      const mockData = { id: 1, name: 'User' };

      fetchMock.mockResolvedValue(mockJsonResponse(mockData));

      const fetchUser = async () => {
        const response = await client.get('/users/1');
        return response.data;
      };

      // First call - fetches from network
      const result1 = await client.query({
        queryKey: ['users', 1],
        queryFn: fetchUser,
        staleTime: 5000,
      });

      expect(result1).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Second call - returns from cache (no fetch)
      const result2 = await client.query({
        queryKey: ['users', 1],
        queryFn: fetchUser,
        staleTime: 5000,
      });

      expect(result2).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledTimes(1); // Still 1!
    });

    it('should refetch when data becomes stale', async () => {
      vi.useFakeTimers();

      const client = fetchit();
      const mockData = { id: 1, name: 'User' };

      fetchMock.mockResolvedValue(mockJsonResponse(mockData));

      const fetchUser = async () => {
        const response = await client.get('/users/1');
        return response.data;
      };

      // First call
      await client.query({
        queryKey: ['users', 1],
        queryFn: fetchUser,
        staleTime: 1000, // 1 second
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Wait for stale time to pass
      vi.advanceTimersByTime(1001);

      // Second call - should refetch
      await client.query({
        queryKey: ['users', 1],
        queryFn: fetchUser,
        staleTime: 1000,
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should deduplicate in-flight requests', async () => {
      const client = fetchit();
      const mockData = { id: 1, name: 'User' };

      fetchMock.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockJsonResponse(mockData)), 100);
          }),
      );

      const fetchUser = async () => {
        const response = await client.get('/users/1');
        return response.data;
      };

      // Fire multiple requests simultaneously
      const [result1, result2, result3] = await Promise.all([
        client.query({ queryKey: ['users', 1], queryFn: fetchUser }),
        client.query({ queryKey: ['users', 1], queryFn: fetchUser }),
        client.query({ queryKey: ['users', 1], queryFn: fetchUser }),
      ]);

      // All should return same data
      expect(result1).toEqual(mockData);
      expect(result2).toEqual(mockData);
      expect(result3).toEqual(mockData);

      // But fetch should only be called once
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  // ========================================================================
  // MUTATION API
  // ========================================================================

  describe('Mutation API', () => {
    it('should execute mutations', async () => {
      const client = fetchit({ baseUrl: 'https://api.example.com' });
      const mockData = { id: 1, name: 'Created' };

      fetchMock.mockResolvedValue(mockJsonResponse(mockData, 201));

      const result = await client.mutate(
        {
          mutationFn: async (data: { name: string }) => {
            const response = await client.post('/users', { body: data });
            return response.data;
          },
        },
        { name: 'Created' },
      );

      expect(result).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should call onSuccess callback', async () => {
      const client = fetchit();
      const mockData = { id: 1 };
      const onSuccess = vi.fn();

      fetchMock.mockResolvedValue(mockJsonResponse(mockData));

      await client.mutate(
        {
          mutationFn: async () => {
            const response = await client.post('/users', { body: {} });
            return response.data;
          },
          onSuccess,
        },
        {},
      );

      expect(onSuccess).toHaveBeenCalledWith(mockData, {});
    });

    it('should call onError callback on failure', async () => {
      const client = fetchit();
      const onError = vi.fn();

      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(
        client.mutate(
          {
            mutationFn: async () => {
              const response = await client.post('/users', { body: {} });
              return response.data;
            },
            onError,
          },
          {},
        ),
      ).rejects.toThrow();

      expect(onError).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // CACHE MANAGEMENT
  // ========================================================================

  describe('Cache Management', () => {
    it('should invalidate queries', async () => {
      const client = fetchit();
      const mockData = { id: 1, name: 'User' };

      fetchMock.mockResolvedValue(mockJsonResponse(mockData));

      const fetchUser = async () => {
        const response = await client.get('/users/1');
        return response.data;
      };

      // First call - fetches
      await client.query({
        queryKey: ['users', 1],
        queryFn: fetchUser,
        staleTime: 10000,
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Invalidate cache
      client.invalidateQueries(['users', 1]);

      // Second call - should refetch even with stale time
      await client.query({
        queryKey: ['users', 1],
        queryFn: fetchUser,
        staleTime: 10000,
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should set query data manually', async () => {
      const client = fetchit();

      // Set data without fetching
      client.setQueryData(['users', 1], { id: 1, name: 'Manual' });

      // Get data back
      const data = client.getQueryData(['users', 1]);

      expect(data).toEqual({ id: 1, name: 'Manual' });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should update existing data with function', async () => {
      const client = fetchit();

      client.setQueryData(['users'], [{ id: 1 }]);

      client.setQueryData<Array<{ id: number }>>(['users'], (old = []) => [...old, { id: 2 }]);

      const data = client.getQueryData(['users']);

      expect(data).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should clear all cache', async () => {
      const client = fetchit();

      client.setQueryData(['users', 1], { id: 1 });
      client.setQueryData(['posts', 1], { id: 1 });

      expect(client.getCacheSize()).toBe(2);

      client.clearCache();

      expect(client.getCacheSize()).toBe(0);
    });
  });

  // ========================================================================
  // RETRY LOGIC
  // ========================================================================

  describe('Retry Logic', () => {
    it('should retry failed queries', async () => {
      const client = fetchit();
      let attempts = 0;

      const fetchUser = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Network error');
        }
        const response = await client.get('/users/1');
        return response.data;
      };

      fetchMock.mockResolvedValue(mockJsonResponse({ id: 1 }));

      await client.query({
        queryKey: ['users', 1],
        queryFn: fetchUser,
        retry: 3,
      });

      expect(attempts).toBe(3);
    });

    it('should not retry when retry is false', async () => {
      const client = fetchit();
      let attempts = 0;

      const fetchUser = async () => {
        attempts++;
        throw new Error('Network error');
      };

      await expect(
        client.query({
          queryKey: ['users', 1],
          queryFn: fetchUser,
          retry: false,
        }),
      ).rejects.toThrow();

      expect(attempts).toBe(1);
    });
  });

  // ========================================================================
  // CALLBACKS
  // ========================================================================

  describe('Query Callbacks', () => {
    it('should call onSuccess when query succeeds', async () => {
      const client = fetchit();
      const mockData = { id: 1 };
      const onSuccess = vi.fn();

      fetchMock.mockResolvedValue(mockJsonResponse(mockData));

      await client.query({
        queryKey: ['users', 1],
        queryFn: async () => {
          const response = await client.get('/users/1');
          return response.data;
        },
        onSuccess,
      });

      expect(onSuccess).toHaveBeenCalledWith(mockData);
    });

    it('should call onError when query fails', async () => {
      const client = fetchit();
      const onError = vi.fn();

      await expect(
        client.query({
          queryKey: ['users', 1],
          queryFn: async () => {
            throw new Error('Failed');
          },
          onError,
          retry: false,
        }),
      ).rejects.toThrow();

      expect(onError).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // ERROR HANDLING
  // ========================================================================

  describe('Error Handling', () => {
    it('should throw HttpError with context', async () => {
      const client = fetchit({ baseUrl: 'https://api.example.com' });

      fetchMock.mockRejectedValue(new Error('Network error'));

      try {
        await client.get('/users/1');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        expect((error as HttpError).url).toBe('https://api.example.com/users/1');
        expect((error as HttpError).method).toBe('GET');
      }
    });
  });

  // ========================================================================
  // HEADERS MANAGEMENT
  // ========================================================================

  describe('Headers Management', () => {
    it('should set global headers', async () => {
      const client = fetchit({
        baseUrl: 'https://api.example.com',
        headers: { Authorization: 'Bearer token' },
      });

      fetchMock.mockResolvedValue(mockJsonResponse({}));

      await client.get('/users');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token',
          }),
        }),
      );
    });

    it('should update headers dynamically', async () => {
      const client = fetchit({ baseUrl: 'https://api.example.com' });

      client.setHeaders({ Authorization: 'Bearer new-token' });

      fetchMock.mockResolvedValue(mockJsonResponse({}));

      await client.get('/users');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer new-token',
          }),
        }),
      );
    });
  });

  // ========================================================================
  // ENABLED OPTION
  // ========================================================================

  describe('Enabled Option', () => {
    it('should not execute query when disabled', async () => {
      const client = fetchit();

      await expect(
        client.query({
          queryKey: ['users', 1],
          queryFn: async () => ({ id: 1 }),
          enabled: false,
        }),
      ).rejects.toThrow('Query is disabled');

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
