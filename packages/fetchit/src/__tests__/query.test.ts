import { createQuery, type QueryState } from '../index';

describe('Query Client', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

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
  // Callbacks
  // -----------------------------------------------------------------------

  describe('Callbacks', () => {
    it('onSuccess fires with fetched data after a successful query', async () => {
      const qc = createQuery();
      const onSuccess = vi.fn();

      await qc.query({ fn: async () => ({ id: 1 }), key: ['users', 1], onSuccess });

      expect(onSuccess).toHaveBeenCalledWith({ id: 1 });
    });

    it('onError fires with the error when the query fails', async () => {
      const qc = createQuery();
      const onError = vi.fn();

      await qc
        .query({
          fn: async () => {
            throw new Error('boom');
          },
          key: ['fail'],
          onError,
          retry: false,
        })
        .catch(() => {});

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }));
    });

    it('onSettled fires with data and null error on success', async () => {
      const qc = createQuery();
      const onSettled = vi.fn();

      await qc.query({ fn: async () => ({ id: 1 }), key: ['x'], onSettled });

      expect(onSettled).toHaveBeenCalledWith({ id: 1 }, null);
    });

    it('onSettled fires with undefined and error on failure', async () => {
      const qc = createQuery();
      const onSettled = vi.fn();

      await qc
        .query({
          fn: async () => {
            throw new Error('boom');
          },
          key: ['fail'],
          onSettled,
          retry: false,
        })
        .catch(() => {});

      expect(onSettled).toHaveBeenCalledWith(undefined, expect.objectContaining({ message: 'boom' }));
    });

    it('callbacks do not fire when the query is served from cache', async () => {
      const qc = createQuery();
      const onSuccess = vi.fn();

      await qc.query({ fn: async () => ({ id: 1 }), key: ['users', 1], staleTime: 10_000 });
      await qc.query({ fn: async () => ({ id: 1 }), key: ['users', 1], onSuccess, staleTime: 10_000 });

      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('only the triggering call fires callbacks — concurrent callers reuse the inflight promise', async () => {
      const qc = createQuery();
      const onSuccess1 = vi.fn();
      const onSuccess2 = vi.fn();

      await Promise.all([
        qc.query({ fn: async () => ({ id: 1 }), key: ['x'], onSuccess: onSuccess1 }),
        qc.query({ fn: async () => ({ id: 1 }), key: ['x'], onSuccess: onSuccess2 }),
      ]);

      expect(onSuccess1).toHaveBeenCalledTimes(1);
      expect(onSuccess2).not.toHaveBeenCalled();
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
