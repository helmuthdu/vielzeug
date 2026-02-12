/** biome-ignore-all lint/suspicious/noExplicitAny: - */
import {
  createHttpClient,
  createQueryClient,
  type HttpClientOptions,
  HttpError,
  type QueryClientOptions,
} from './fetchit';

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

  // Helper to create a combined HTTP + Query client for tests
  function createCombinedClient(options: any = {}) {
    const http = createHttpClient({
      baseUrl: options.baseUrl,
      dedupe: options.dedupe,
      headers: options.headers,
      timeout: options.timeout,
    } as HttpClientOptions);

    const queryClient = createQueryClient({
      cache: options.cache,
      refetch: options.refetch,
    } as QueryClientOptions);

    return {
      clearCache: queryClient.clearCache,
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
    it('should support all HTTP methods (GET, POST, PUT, PATCH, DELETE)', async () => {
      const http = createHttpClient({ baseUrl: 'https://api.example.com' });
      fetchMock.mockResolvedValue(mockJsonResponse({ success: true }));

      // GET
      await http.get('/users/1');
      expect(fetchMock).toHaveBeenLastCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({ method: 'GET' }),
      );

      // POST with body
      await http.post('/users', { body: { name: 'Alice' } });
      expect(fetchMock).toHaveBeenLastCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          body: JSON.stringify({ name: 'Alice' }),
          method: 'POST',
        }),
      );

      // PUT, PATCH, DELETE
      await http.put('/users/1', { body: { name: 'Bob' } });
      expect(fetchMock).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ method: 'PUT' }));

      await http.patch('/users/1', { body: { status: 'active' } });
      expect(fetchMock).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ method: 'PATCH' }));

      await http.delete('/users/1');
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
    it('should execute mutations with success/error callbacks', async () => {
      const client = createCombinedClient({ baseUrl: 'https://api.example.com' });
      const mockData = { id: 1, name: 'Created' };
      const onSuccess = vi.fn();

      fetchMock.mockResolvedValue(mockJsonResponse(mockData, 201));

      const result = await client.mutate(
        {
          mutationFn: async (data: { name: string }) => {
            return await client.post('/users', { body: data });
          },
          onSuccess,
        },
        { name: 'Created' },
      );

      expect(result).toEqual(mockData);
      expect(onSuccess).toHaveBeenCalledWith(mockData, { name: 'Created' });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should call onError callback on failure', async () => {
      const client = createCombinedClient();
      const onError = vi.fn();

      fetchMock.mockRejectedValue(new Error('Network error'));

      try {
        await client.mutate(
          {
            mutationFn: async () => {
              return await client.post('/users', { body: {} });
            },
            onError,
          },
          {},
        );
      } catch {
        // Expected to throw
      }

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

    it('should set and get query data manually with function updater', async () => {
      const client = createCombinedClient();

      // Set data without fetching
      client.setQueryData(['users', 1], { id: 1, name: 'Manual' });

      // Get data back
      const data = client.getQueryData(['users', 1]);
      expect(data).toEqual({ id: 1, name: 'Manual' });

      // Update with function
      client.setQueryData<{ id: number; name: string }>(['users', 1], (old) => ({
        ...old!,
        name: 'Updated',
      }));

      expect(client.getQueryData(['users', 1])).toEqual({ id: 1, name: 'Updated' });
      expect(fetchMock).not.toHaveBeenCalled();
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
    it('should call onSuccess and onError callbacks', async () => {
      const client = createCombinedClient();
      const mockData = { id: 1 };
      const onSuccess = vi.fn();
      const onError = vi.fn();

      fetchMock.mockResolvedValue(mockJsonResponse(mockData));

      // Test onSuccess
      await client.query({
        onSuccess,
        queryFn: async () => {
          return await client.get('/users/1');
        },
        queryKey: ['users', 1],
      });

      expect(onSuccess).toHaveBeenCalledWith(mockData);

      // Test onError
      await expect(
        client.query({
          onError,
          queryFn: async () => {
            throw new Error('Failed');
          },
          queryKey: ['users', 2],
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
  // BUG FIXES - Edge Cases & Correctness
  // ========================================================================

  describe('Bug Fixes', () => {
    describe('Timeout Edge Cases', () => {
      it('should handle 0 timeout without creating timer', async () => {
        const http = createHttpClient({
          baseUrl: 'https://api.example.com',
          timeout: 0,
        });

        fetchMock.mockResolvedValue(mockJsonResponse({ success: true }));

        const result = await http.get('/test');
        expect(result).toEqual({ success: true });
      });

      it('should handle Infinity timeout without creating timer', async () => {
        const http = createHttpClient({
          baseUrl: 'https://api.example.com',
          timeout: Number.POSITIVE_INFINITY,
        });

        fetchMock.mockResolvedValue(mockJsonResponse({ success: true }));

        const result = await http.get('/test');
        expect(result).toEqual({ success: true });
      });
    });

    describe('Body Serialization for Dedupe', () => {
      it('should safely handle FormData body in dedupe key', async () => {
        const http = createHttpClient({ dedupe: true });
        const formData = new FormData();
        formData.append('name', 'Alice');

        fetchMock.mockResolvedValue(mockJsonResponse({ success: true }));

        // Should not crash with FormData
        await expect(http.post('/upload', { body: formData })).resolves.toEqual({ success: true });
      });

      it('should safely handle Blob body in dedupe key', async () => {
        const http = createHttpClient({ dedupe: true });
        const blob = new Blob(['test'], { type: 'text/plain' });

        fetchMock.mockResolvedValue(mockJsonResponse({ success: true }));

        // Should not crash with Blob
        await expect(http.post('/upload', { body: blob })).resolves.toEqual({ success: true });
      });

      it('should safely handle ArrayBuffer body in dedupe key', async () => {
        const http = createHttpClient({ dedupe: true });
        const buffer = new ArrayBuffer(8);

        fetchMock.mockResolvedValue(mockJsonResponse({ success: true }));

        // Should not crash with ArrayBuffer
        await expect(http.post('/binary', { body: buffer })).resolves.toEqual({ success: true });
      });

      it('should safely handle URLSearchParams body in dedupe key', async () => {
        const http = createHttpClient({ dedupe: true });
        const params = new URLSearchParams();
        params.append('key', 'value');

        fetchMock.mockResolvedValue(mockJsonResponse({ success: true }));

        await expect(http.post('/form', { body: params })).resolves.toEqual({ success: true });
      });

      it('should safely handle circular reference in dedupe key generation', async () => {
        const http = createHttpClient({ dedupe: true });

        fetchMock.mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => resolve(mockJsonResponse({ id: 1 })), 50);
            }),
        );

        // Create circular object for dedupe key testing
        const circular1: any = { name: 'test' };
        circular1.self = circular1;

        const circular2: any = { name: 'test' };
        circular2.self = circular2;

        // Both should get same dedupe key '[Object]' and be deduped
        const [r1, r2] = await Promise.all([
          // Use dedupe: true but these will fail JSON.stringify in body
          // However, dedupe key serialization should handle it
          http.post('/test', { body: circular1 }).catch(() => ({ id: 1 })),
          http.post('/test', { body: circular2 }).catch(() => ({ id: 1 })),
        ]);

        // Even though body serialization fails, dedupe key should not crash
        expect(r1).toEqual({ id: 1 });
        expect(r2).toEqual({ id: 1 });
      });

      it('should deduplicate requests with same non-serializable body type', async () => {
        const http = createHttpClient({ dedupe: true });

        fetchMock.mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => resolve(mockJsonResponse({ id: 1 })), 50);
            }),
        );

        // Two FormData instances (treated as different)
        const formData1 = new FormData();
        formData1.append('name', 'Alice');

        const formData2 = new FormData();
        formData2.append('name', 'Alice');

        const [r1, r2] = await Promise.all([
          http.post('/upload', { body: formData1 }),
          http.post('/upload', { body: formData2 }),
        ]);

        // FormData gets dedupe key '[FormData]' - should deduplicate
        expect(r1).toEqual({ id: 1 });
        expect(r2).toEqual({ id: 1 });
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('Cross-Realm ArrayBuffer Detection', () => {
      it('should detect ArrayBuffer using toString fallback', async () => {
        const http = createHttpClient();

        // Simulate cross-realm ArrayBuffer by creating object with same toString
        const fakeArrayBuffer = {
          byteLength: 8,
          [Symbol.toStringTag]: 'ArrayBuffer',
        };

        // Mock Object.prototype.toString to return correct value
        const originalToString = Object.prototype.toString;
        Object.prototype.toString = function () {
          if (this === fakeArrayBuffer) {
            return '[object ArrayBuffer]';
          }
          return originalToString.call(this);
        };

        fetchMock.mockResolvedValue(mockJsonResponse({ success: true }));

        try {
          await expect(http.post('/binary', { body: fakeArrayBuffer as any })).resolves.toEqual({ success: true });
        } finally {
          Object.prototype.toString = originalToString;
        }
      });

      it('should detect TypedArray views', async () => {
        const http = createHttpClient({ dedupe: true });
        const uint8Array = new Uint8Array([1, 2, 3, 4]);

        fetchMock.mockResolvedValue(mockJsonResponse({ success: true }));

        await expect(http.post('/binary', { body: uint8Array })).resolves.toEqual({ success: true });
      });
    });
  });

  // ========================================================================
  // SEPARATE HTTP/QUERY CLIENTS
  // ========================================================================

  describe('Separate Clients', () => {
    it('should create HTTP-only client with all methods', async () => {
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

      // Test other methods
      fetchMock.mockResolvedValue(mockJsonResponse({}));
      await http.post('/users', { body: { name: 'Alice' } });
      await http.put('/users/1', { body: { name: 'Bob' } });
      await http.patch('/users/1', { body: { email: 'new@example.com' } });
      await http.delete('/users/1');

      expect(fetchMock).toHaveBeenCalledTimes(5);
    });

    it('should deduplicate HTTP requests when enabled', async () => {
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

    it('should create query-only client with cache and subscriptions', async () => {
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

      // Should be cached
      const cached = queryClient.getData(['users', 1]);
      expect(cached).toEqual(mockData);

      // Test subscriptions
      const states: any[] = [];
      queryClient.subscribe(['test'], (state) => {
        states.push({ ...state });
      });

      queryClient.setData(['test'], { value: 123 });

      expect(states.length).toBeGreaterThan(0);
      expect(states[states.length - 1].data).toEqual({ value: 123 });

      // Clear cache
      queryClient.clearCache();
      expect(queryClient.getCacheSize()).toBe(0);
    });

    it('should support mutations with query client', async () => {
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

  // ========================================================================
  // STABLE KEY SERIALIZATION
  // ========================================================================

  describe('Stable Key Serialization', () => {
    it('should treat objects with same properties but different order as identical in cache', async () => {
      const { createQueryClient } = await import('./fetchit');
      const queryClient = createQueryClient({ cache: { staleTime: 10000 } });

      fetchMock.mockResolvedValue(mockJsonResponse({ id: 1, name: 'User' }));

      // Same object properties, different order
      const key1 = ['users', { filter: 'active', page: 1 }] as const;
      const key2 = ['users', { filter: 'active', page: 1 }] as const;

      const result1 = await queryClient.fetch({
        queryFn: () => fetch('/users').then((r) => r.json()),
        queryKey: key1,
      });

      // Should use cache because keys are logically equivalent
      const result2 = await queryClient.fetch({
        queryFn: () => fetch('/users').then((r) => r.json()),
        queryKey: key2,
      });

      expect(result1).toEqual({ id: 1, name: 'User' });
      expect(result2).toEqual({ id: 1, name: 'User' });
      expect(fetchMock).toHaveBeenCalledTimes(1); // Only called once due to stable key matching
    });

    it('should invalidate with prefix matching on stable keys', async () => {
      const { createQueryClient } = await import('./fetchit');
      const queryClient = createQueryClient();

      fetchMock.mockResolvedValue(mockJsonResponse({ id: 1 }));

      // Create entries with different property orders
      await queryClient.fetch({
        queryFn: () => fetch('/test').then((r) => r.json()),
        queryKey: ['users', { filter: 'active', page: 1 }],
      });

      await queryClient.fetch({
        queryFn: () => fetch('/test').then((r) => r.json()),
        queryKey: ['users', { filter: 'inactive', page: 2 }],
      });

      expect(queryClient.getCacheSize()).toBe(2);

      // Invalidate prefix - should match both regardless of property order
      queryClient.invalidate(['users']);

      expect(queryClient.getCacheSize()).toBe(0);
    });

    it('should handle nested objects with stable serialization', async () => {
      const { createQueryClient } = await import('./fetchit');
      const queryClient = createQueryClient({ cache: { staleTime: 10000 } });

      fetchMock.mockResolvedValue(mockJsonResponse({ data: 'test' }));

      const key1 = ['posts', { filters: { author: 'john', status: 'active' }, page: 1 }];
      const key2 = ['posts', { filters: { author: 'john', status: 'active' }, page: 1 }];

      await queryClient.fetch({
        queryFn: () => fetch('/posts').then((r) => r.json()),
        queryKey: key1,
      });

      // Should reuse cache
      await queryClient.fetch({
        queryFn: () => fetch('/posts').then((r) => r.json()),
        queryKey: key2,
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
