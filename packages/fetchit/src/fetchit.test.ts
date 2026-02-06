import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHttpClient, createQueryClient, HttpError } from './fetchit';

vi.mock('@vielzeug/logit', () => ({
  Logit: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('Fetchit', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  const mockJsonResponse = (data: unknown, status = 200) => ({
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
    ok: status >= 200 && status < 300,
    status,
  });

  // Helper to create combined HTTP + Query client for tests
  function createCombinedClient(options: any = {}) {
    const http = createHttpClient({
      baseUrl: options.baseUrl,
      dedupe: options.dedupe,
      headers: options.headers,
      timeout: options.timeout,
    });

    const queryClient = createQueryClient({
      cache: options.cache,
      refetch: options.refetch,
    });

    // Create combined interface matching old API
    return {
      // Query methods from createQueryClient (with aliases)
      clearCache: queryClient.clearCache,
      // HTTP methods from createHttpClient
      delete: http.delete,
      fetch: queryClient.fetch,
      get: http.get,
      getCacheSize: queryClient.getCacheSize,
      getData: queryClient.getData,
      getHeaders: http.getHeaders,
      getQueryData: queryClient.getData, // Alias
      getQueryState: queryClient.getState, // Alias
      getState: queryClient.getState,
      invalidate: queryClient.invalidate,
      invalidateQueries: queryClient.invalidate, // Alias
      mutate: queryClient.mutate,
      patch: http.patch,
      post: http.post,
      prefetch: queryClient.prefetch,
      prefetchQuery: queryClient.prefetch, // Alias
      put: http.put,
      query: queryClient.fetch, // Alias
      request: http.request,
      setData: queryClient.setData,
      setHeaders: http.setHeaders,
      setQueryData: queryClient.setData, // Alias
      subscribe: queryClient.subscribe,
      unsubscribe: queryClient.unsubscribe,
    };
  }

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
  // REST API
  // ========================================================================

  describe('REST API methods', () => {
    it('should support GET requests', async () => {
      const http = createHttpClient({ baseUrl: 'https://api.example.com' });
      const mockData = { id: 1, name: 'Test' };

      fetchMock.mockResolvedValue(mockJsonResponse(mockData));

      const data = await http.get('/users/1');

      expect(data).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('should support POST requests with body', async () => {
      const client = createCombinedClient({ baseUrl: 'https://api.example.com' });
      const mockData = { id: 1, name: 'Created' };

      fetchMock.mockResolvedValue(mockJsonResponse(mockData, 201));

      const data = await client.post('/users', {
        body: { name: 'Created' },
      });

      expect(data).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          body: JSON.stringify({ name: 'Created' }),
          method: 'POST',
        }),
      );
    });

    it('should support PUT, PATCH, DELETE methods', async () => {
      const client = createCombinedClient({ baseUrl: 'https://api.example.com' });

      fetchMock.mockResolvedValue(mockJsonResponse({}));

      await client.put('/users/1', { body: { name: 'Updated' } });
      expect(fetchMock).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ method: 'PUT' }));

      await client.patch('/users/1', { body: { status: 'active' } });
      expect(fetchMock).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ method: 'PATCH' }));

      await client.delete('/users/1');
      expect(fetchMock).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ method: 'DELETE' }));
    });

    it('should handle query parameters', async () => {
      const client = createCombinedClient({ baseUrl: 'https://api.example.com' });

      fetchMock.mockResolvedValue(mockJsonResponse([]));

      await client.get('/users', {
        params: { age: 25, role: 'admin' },
      });

      expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/users?age=25&role=admin', expect.any(Object));
    });
  });

  // ========================================================================
  // QUERY API (New V2 Features)
  // ========================================================================

  describe('Query API - Caching', () => {
    it('should cache query results', async () => {
      const client = createCombinedClient({
        cache: { staleTime: 5000 },
      });
      const mockData = { id: 1, name: 'User' };

      fetchMock.mockResolvedValue(mockJsonResponse(mockData));

      const fetchUser = async () => {
        return await client.get('/users/1');
      };

      // First call - fetches from network
      const result1 = await client.query({
        queryFn: fetchUser,
        queryKey: ['users', 1],
      });

      expect(result1).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Second call - returns from cache (no fetch)
      const result2 = await client.query({
        queryFn: fetchUser,
        queryKey: ['users', 1],
      });

      expect(result2).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledTimes(1); // Still 1!
    });

    it('should refetch when data becomes stale', async () => {
      vi.useFakeTimers();

      const client = createCombinedClient();
      const mockData = { id: 1, name: 'User' };

      fetchMock.mockResolvedValue(mockJsonResponse(mockData));

      const fetchUser = async () => {
        return await client.get('/users/1');
      };

      // First call
      await client.query({
        queryFn: fetchUser,
        queryKey: ['users', 1],
        staleTime: 1000, // 1 second
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Wait for stale time to pass
      vi.advanceTimersByTime(1001);

      // Second call - should refetch
      await client.query({
        queryFn: fetchUser,
        queryKey: ['users', 1],
        staleTime: 1000,
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should deduplicate in-flight requests', async () => {
      const client = createCombinedClient();
      const mockData = { id: 1, name: 'User' };

      fetchMock.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockJsonResponse(mockData)), 100);
          }),
      );

      const fetchUser = async () => {
        return await client.get('/users/1');
      };

      // Fire multiple requests simultaneously
      const [result1, result2, result3] = await Promise.all([
        client.query({ queryFn: fetchUser, queryKey: ['users', 1] }),
        client.query({ queryFn: fetchUser, queryKey: ['users', 1] }),
        client.query({ queryFn: fetchUser, queryKey: ['users', 1] }),
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
      const client = createCombinedClient({ baseUrl: 'https://api.example.com' });
      const mockData = { id: 1, name: 'Created' };

      fetchMock.mockResolvedValue(mockJsonResponse(mockData, 201));

      const result = await client.mutate(
        {
          mutationFn: async (data: { name: string }) => {
            return await client.post('/users', { body: data });
          },
        },
        { name: 'Created' },
      );

      expect(result).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should call onSuccess callback', async () => {
      const client = createCombinedClient();
      const mockData = { id: 1 };
      const onSuccess = vi.fn();

      fetchMock.mockResolvedValue(mockJsonResponse(mockData));

      await client.mutate(
        {
          mutationFn: async () => {
            return await client.post('/users', { body: {} });
          },
          onSuccess,
        },
        {},
      );

      expect(onSuccess).toHaveBeenCalledWith(mockData, {});
    });

    it('should call onError callback on failure', async () => {
      const client = createCombinedClient();
      const onError = vi.fn();

      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(
        client.mutate(
          {
            mutationFn: async () => {
              return await client.post('/users', { body: {} });
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
      const client = createCombinedClient();
      const mockData = { id: 1, name: 'User' };

      fetchMock.mockResolvedValue(mockJsonResponse(mockData));

      const fetchUser = async () => {
        return await client.get('/users/1');
      };

      // First call - fetches
      await client.query({
        queryFn: fetchUser,
        queryKey: ['users', 1],
        staleTime: 10000,
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Invalidate cache
      client.invalidateQueries(['users', 1]);

      // Second call - should refetch even with stale time
      await client.query({
        queryFn: fetchUser,
        queryKey: ['users', 1],
        staleTime: 10000,
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should set query data manually', async () => {
      const client = createCombinedClient();

      // Set data without fetching
      client.setQueryData(['users', 1], { id: 1, name: 'Manual' });

      // Get data back
      const data = client.getQueryData(['users', 1]);

      expect(data).toEqual({ id: 1, name: 'Manual' });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should update existing data with function', async () => {
      const client = createCombinedClient();

      client.setQueryData(['users'], [{ id: 1 }]);

      client.setQueryData<Array<{ id: number }>>(['users'], (old = []) => [...old, { id: 2 }]);

      const data = client.getQueryData(['users']);

      expect(data).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should clear all cache', async () => {
      const client = createCombinedClient();

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
      const client = createCombinedClient();
      let attempts = 0;

      const fetchUser = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Network error');
        }
        return await client.get('/users/1');
      };

      fetchMock.mockResolvedValue(mockJsonResponse({ id: 1 }));

      await client.query({
        queryFn: fetchUser,
        queryKey: ['users', 1],
        retry: 3,
      });

      expect(attempts).toBe(3);
    });

    it('should not retry when retry is false', async () => {
      const client = createCombinedClient();
      let attempts = 0;

      const fetchUser = async () => {
        attempts++;
        throw new Error('Network error');
      };

      await expect(
        client.query({
          queryFn: fetchUser,
          queryKey: ['users', 1],
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
      const client = createCombinedClient();
      const mockData = { id: 1 };
      const onSuccess = vi.fn();

      fetchMock.mockResolvedValue(mockJsonResponse(mockData));

      await client.query({
        onSuccess,
        queryFn: async () => {
          return await client.get('/users/1');
        },
        queryKey: ['users', 1],
      });

      expect(onSuccess).toHaveBeenCalledWith(mockData);
    });

    it('should call onError when query fails', async () => {
      const client = createCombinedClient();
      const onError = vi.fn();

      await expect(
        client.query({
          onError,
          queryFn: async () => {
            throw new Error('Failed');
          },
          queryKey: ['users', 1],
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
      const client = createCombinedClient({ baseUrl: 'https://api.example.com' });

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
      const client = createCombinedClient({
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
      const client = createCombinedClient({ baseUrl: 'https://api.example.com' });

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
      const client = createCombinedClient();

      await expect(
        client.query({
          enabled: false,
          queryFn: async () => ({ id: 1 }),
          queryKey: ['users', 1],
        }),
      ).rejects.toThrow('Query disabled');

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  // ========================================================================
  // CONVENIENCE METHODS
  // ========================================================================

  describe('Convenience Methods', () => {
    it('should get full query state with getQueryState', async () => {
      const client = createCombinedClient();
      const mockData = { id: 1, name: 'Test' };

      fetchMock.mockResolvedValue(mockJsonResponse(mockData));

      // Before query
      const stateBefore = client.getQueryState(['users', 1]);
      expect(stateBefore).toBeNull();

      // Execute query
      await client.query({
        queryFn: async () => mockData,
        queryKey: ['users', 1],
      });

      // After query
      const stateAfter = client.getQueryState(['users', 1]);
      expect(stateAfter).toMatchObject({
        data: mockData,
        error: null,
        isError: false,
        isIdle: false,
        isLoading: false,
        isSuccess: true,
        status: 'success',
      });
      expect(stateAfter?.dataUpdatedAt).toBeGreaterThan(0);
      expect(stateAfter?.fetchedAt).toBeGreaterThan(0);
    });

    it('should prefetch query', async () => {
      const client = createCombinedClient();
      const mockData = { id: 1, name: 'Test' };

      fetchMock.mockResolvedValue(mockJsonResponse(mockData));

      await client.prefetchQuery({
        queryFn: async () => mockData,
        queryKey: ['users', 1],
      });

      // But data should be in the cache
      const cachedData = client.getQueryData(['users', 1]);
      expect(cachedData).toEqual(mockData);
    });

    it('should prefetch and silently ignore errors', async () => {
      const client = createCombinedClient();

      fetchMock.mockRejectedValue(new Error('Network error'));

      // Prefetch should not throw
      await expect(
        client.prefetchQuery({
          queryFn: async () => {
            throw new Error('Network error');
          },
          queryKey: ['users', 1],
          retry: false, // Disable retry to avoid timeout
        }),
      ).resolves.toBeUndefined();
    });

    it('should make requests with custom HTTP method using request', async () => {
      const client = createCombinedClient({ baseUrl: 'https://api.example.com' });
      const mockData = { success: true };

      fetchMock.mockResolvedValue(mockJsonResponse(mockData));

      const data = await client.request('OPTIONS', '/users');

      expect(data).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({ method: 'OPTIONS' }),
      );
    });
  });

  // ========================================================================
  // OBSERVABLE STATE
  // ========================================================================

  describe('Observable State', () => {
    it('should call subscriber with state on changes', async () => {
      const client = createCombinedClient();
      const mockData = { id: 1, name: 'User' };
      const states: any[] = [];

      fetchMock.mockResolvedValue(mockJsonResponse(mockData));

      // Subscribe before querying
      const unsubscribe = client.subscribe(['users', 1], (state) => {
        states.push({ ...state });
      });

      // Execute query
      await client.query({
        queryFn: () => client.get('/users/1'),
        queryKey: ['users', 1],
      });

      // Should have received state updates
      expect(states.length).toBeGreaterThan(0);

      // Final state should be success
      const finalState = states[states.length - 1];
      expect(finalState.isSuccess).toBe(true);
      expect(finalState.data).toEqual(mockData);

      unsubscribe();
    });

    it('should notify subscribers when data is updated via setQueryData', async () => {
      const client = createCombinedClient();
      const states: any[] = [];

      client.subscribe(['users', 1], (state) => {
        states.push({ ...state });
      });

      // Set data manually
      client.setQueryData(['users', 1], { id: 1, name: 'Alice' });

      expect(states.length).toBeGreaterThan(0);
      expect(states[states.length - 1].data).toEqual({ id: 1, name: 'Alice' });
    });
  });

  // ========================================================================
  // REQUEST DEDUPLICATION
  // ========================================================================

  describe('Request Deduplication', () => {
    it('should deduplicate concurrent REST requests by default', async () => {
      const client = createCombinedClient();
      const mockData = { id: 1, name: 'User' };

      fetchMock.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockJsonResponse(mockData)), 100);
          }),
      );

      // Fire multiple identical requests simultaneously
      const [result1, result2, result3] = await Promise.all([
        client.get('/users/1'),
        client.get('/users/1'),
        client.get('/users/1'),
      ]);

      // All should return same data
      expect(result1).toEqual(mockData);
      expect(result2).toEqual(mockData);
      expect(result3).toEqual(mockData);

      // But fetch should only be called once (deduped!)
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should allow opting out of deduplication per request', async () => {
      const client = createCombinedClient();
      const mockData = { id: 1, name: 'User' };

      fetchMock.mockResolvedValue(mockJsonResponse(mockData));

      // Make requests with deduplication disabled
      await Promise.all([client.get('/users/1', { dedupe: false }), client.get('/users/1', { dedupe: false })]);

      // Should make 2 separate requests
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should deduplicate globally when enabled', async () => {
      const client = createCombinedClient({ dedupe: true });
      const mockData = { id: 1 };

      fetchMock.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockJsonResponse(mockData)), 50);
          }),
      );

      const [r1, r2] = await Promise.all([
        client.post('/users', { body: mockData }),
        client.post('/users', { body: mockData }),
      ]);

      expect(r1).toEqual(mockData);
      expect(r2).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  // ========================================================================
  // NESTED CONFIGURATION
  // ========================================================================

  describe('Nested Configuration', () => {
    it('should accept nested cache configuration', async () => {
      const client = createCombinedClient({
        cache: {
          gcTime: 60000,
          staleTime: 10000,
        },
      });

      const mockData = { id: 1 };
      fetchMock.mockResolvedValue(mockJsonResponse(mockData));

      await client.query({
        queryFn: () => client.get('/test'),
        queryKey: ['test'],
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Should use cache (stale time not exceeded)
      await client.query({
        queryFn: () => client.get('/test'),
        queryKey: ['test'],
      });

      expect(fetchMock).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should accept nested refetch configuration', async () => {
      const client = createCombinedClient({
        refetch: {
          onFocus: false,
          onReconnect: false,
        },
      });

      expect(client).toBeDefined();
    });
  });

  // ========================================================================
  // SEPARATE HTTP/QUERY CLIENTS
  // ========================================================================

  describe('Separate Clients', () => {
    describe('createHttpClient', () => {
      it('should create HTTP-only client', async () => {
        const { createHttpClient } = await import('./fetchit');
        const http = createHttpClient({
          baseUrl: 'https://api.example.com',
        });

        const mockData = { id: 1, name: 'Test' };
        fetchMock.mockResolvedValue(mockJsonResponse(mockData));

        const data = await http.get('/users/1');

        expect(data).toEqual(mockData);
        expect(fetchMock).toHaveBeenCalledWith(
          'https://api.example.com/users/1',
          expect.objectContaining({ method: 'GET' }),
        );
      });

      it('should support all HTTP methods', async () => {
        const { createHttpClient } = await import('./fetchit');
        const http = createHttpClient({ baseUrl: 'https://api.example.com' });

        fetchMock.mockResolvedValue(mockJsonResponse({}));

        await http.get('/users');
        await http.post('/users', { body: { name: 'Alice' } });
        await http.put('/users/1', { body: { name: 'Bob' } });
        await http.patch('/users/1', { body: { email: 'new@example.com' } });
        await http.delete('/users/1');

        expect(fetchMock).toHaveBeenCalledTimes(5);
      });

      it('should deduplicate HTTP requests', async () => {
        const { createHttpClient } = await import('./fetchit');
        const http = createHttpClient({ dedupe: true });

        fetchMock.mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => resolve(mockJsonResponse({ id: 1 })), 50);
            }),
        );

        const [r1, r2] = await Promise.all([http.get('/users/1'), http.get('/users/1')]);

        expect(r1).toEqual({ id: 1 });
        expect(r2).toEqual({ id: 1 });
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('createQueryClient', () => {
      it('should create query-only client', async () => {
        const { createQueryClient } = await import('./fetchit');
        const queryClient = createQueryClient({
          cache: { staleTime: 5000 },
        });

        const mockData = { id: 1, name: 'User' };
        fetchMock.mockResolvedValue(mockJsonResponse(mockData));

        const user = await queryClient.fetch({
          queryFn: async () => {
            const response = await fetch('https://api.example.com/users/1');
            return response.json();
          },
          queryKey: ['users', 1],
        });

        expect(user).toEqual(mockData);

        // Should be cached
        const cached = queryClient.getData(['users', 1]);
        expect(cached).toEqual(mockData);
      });

      it('should work with any HTTP client', async () => {
        const { createQueryClient, createHttpClient } = await import('./fetchit');

        const http = createHttpClient({ baseUrl: 'https://api.example.com' });
        const queryClient = createQueryClient({ cache: { staleTime: 10000 } });

        const mockData = { id: 1, name: 'User' };
        fetchMock.mockResolvedValue(mockJsonResponse(mockData));

        // Use query client with http client
        const user = await queryClient.fetch({
          queryFn: () => http.get('/users/1'),
          queryKey: ['users', 1],
        });

        expect(user).toEqual(mockData);
      });

      it('should support cache management', async () => {
        const { createQueryClient } = await import('./fetchit');
        const queryClient = createQueryClient();

        fetchMock.mockResolvedValue(mockJsonResponse({ id: 1 }));

        await queryClient.fetch({
          queryFn: () => fetch('/test').then((r) => r.json()),
          queryKey: ['test'],
        });

        expect(queryClient.getCacheSize()).toBeGreaterThan(0);

        queryClient.setData(['test'], { id: 2 });
        expect(queryClient.getData(['test'])).toEqual({ id: 2 });

        queryClient.invalidate(['test']);
        expect(queryClient.getData(['test'])).toBeUndefined();

        queryClient.clearCache();
        expect(queryClient.getCacheSize()).toBe(0);
      });

      it('should support subscriptions', async () => {
        const { createQueryClient } = await import('./fetchit');
        const queryClient = createQueryClient();

        const states: any[] = [];

        queryClient.subscribe(['test'], (state) => {
          states.push({ ...state });
        });

        queryClient.setData(['test'], { value: 123 });

        expect(states.length).toBeGreaterThan(0);
        expect(states[states.length - 1].data).toEqual({ value: 123 });
      });

      it('should support mutations', async () => {
        const { createQueryClient } = await import('./fetchit');
        const queryClient = createQueryClient();

        fetchMock.mockResolvedValue(mockJsonResponse({ id: 1, name: 'Created' }));

        const result = await queryClient.mutate(
          {
            mutationFn: async (data: { name: string }) => {
              const response = await fetch('/users', {
                body: JSON.stringify(data),
                method: 'POST',
              });
              return response.json();
            },
          },
          { name: 'Alice' },
        );

        expect(result).toEqual({ id: 1, name: 'Created' });
      });
    });
  });
});
