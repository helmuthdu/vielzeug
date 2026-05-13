import { createQuery, type QueryState } from '../index';

describe('Query Client', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('Fetching & Caching', () => {
    it('is stale by default and refetches on the next call', async () => {
      const qc = createQuery();
      let calls = 0;

      const fn = async () => ({ id: ++calls });

      await qc.query({ fn, key: ['users', 1] });
      await qc.query({ fn, key: ['users', 1] });

      expect(calls).toBe(2);
    });

    it('serves fresh data from cache while staleTime is active', async () => {
      const qc = createQuery();
      let calls = 0;

      const fn = async () => ({ id: ++calls });

      await qc.query({ fn, key: ['users', 1], staleTime: 10_000 });
      await qc.query({ fn, key: ['users', 1], staleTime: 10_000 });

      expect(calls).toBe(1);
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

    it('passes both key and AbortSignal to fn', async () => {
      const qc = createQuery();
      let ctx: { key: readonly unknown[]; signal: AbortSignal } | undefined;

      await qc.query({
        fn: async (nextCtx) => {
          ctx = nextCtx;

          return { id: 1 };
        },
        key: ['signal-test', 1],
      });

      expect(ctx?.key).toEqual(['signal-test', 1]);
      expect(ctx?.signal).toBeInstanceOf(AbortSignal);
    });

    it('prefetch() warms cache and subsequent query uses fresh cached data', async () => {
      const qc = createQuery();
      let calls = 0;

      const fn = async () => ({ id: ++calls });

      await qc.prefetch({ fn, key: ['users', 1], staleTime: 10_000 });

      expect(qc.get(['users', 1])).toEqual({ id: 1 });

      const data = await qc.query({ fn, key: ['users', 1], staleTime: 10_000 });

      expect(data).toEqual({ id: 1 });
      expect(calls).toBe(1);
    });

    it('prefetch() swallows errors by default but stores error state', async () => {
      const qc = createQuery();

      await expect(
        qc.prefetch({
          fn: async () => {
            throw new Error('boom');
          },
          key: ['prefetch-fail'],
        }),
      ).resolves.toBeUndefined();

      expect(qc.getState(['prefetch-fail'])?.status).toBe('error');
      expect(qc.getState(['prefetch-fail'])?.error?.message).toBe('boom');
    });

    it('prefetch({ throwOnError: true }) rethrows failures', async () => {
      const qc = createQuery();

      await expect(
        qc.prefetch({
          fn: async () => {
            throw new Error('boom');
          },
          key: ['prefetch-fail-throw'],
          throwOnError: true,
        }),
      ).rejects.toThrow('boom');
    });
  });

  describe('Retry', () => {
    it('retries the fn up to the specified count before succeeding', async () => {
      const qc = createQuery({ attempts: 3 });
      let attempts = 0;

      await qc.query({
        fn: async () => {
          if (++attempts < 3) throw new Error('transient');

          return { id: 1 };
        },
        key: ['users', 1],
      });

      expect(attempts).toBe(3);
    });

    it('attempts:1 makes exactly one attempt then rejects', async () => {
      const qc = createQuery({ attempts: 1 });
      let attempts = 0;

      await expect(
        qc.query({
          fn: async () => {
            attempts++;
            throw new Error('fail');
          },
          key: ['users', 1],
        }),
      ).rejects.toThrow('fail');

      expect(attempts).toBe(1);
    });
  });

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
      const fn = async () => ({ id: ++calls });

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
  });

  describe('Subscriptions & State', () => {
    it('getState() returns null before any query, then full shape after success', async () => {
      const qc = createQuery();

      expect(qc.getState(['never'])).toBeNull();

      await qc.query({ fn: async () => ({ id: 1 }), key: ['users', 1] });

      expect(qc.getState(['users', 1])).toMatchObject({
        data: { id: 1 },
        error: null,
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

      expect(states.map((s) => s.status)).toEqual(['idle', 'pending', 'success']);
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
        })
        .catch(() => {});

      expect(states.map((s) => s.status)).toEqual(['idle', 'pending', 'error']);
      expect(states[2].error?.message).toBe('boom');
    });

    it('subscribe() cancels a pending GC timer to keep entry alive', async () => {
      vi.useFakeTimers();

      const qc = createQuery({ gcTime: 1_000 });

      await qc.query({ fn: async () => ({ id: 1 }), key: ['x'] });
      qc.subscribe(['x'], () => {});
      vi.advanceTimersByTime(2_000);

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
      expect(qc.getState(['users', 1])).not.toBeNull();
      unsub();
    });

    it('cancel() keeps previous data when aborting a refetch', async () => {
      const qc = createQuery();

      qc.set(['users', 1], { id: 1, name: 'Alice' });

      let reject!: (error: unknown) => void;
      const pending = new Promise<never>((_resolve, nextReject) => {
        reject = nextReject;
      });

      const queryPromise = qc.query({
        fn: async ({ signal }) => {
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));

          return pending;
        },
        key: ['users', 1],
        staleTime: 0,
      });

      qc.cancel(['users', 1]);

      await expect(queryPromise).rejects.toThrow(/aborted/i);
      expect(qc.getState(['users', 1])?.status).toBe('success');
      expect(qc.get(['users', 1])).toEqual({ id: 1, name: 'Alice' });
    });
  });

  describe('enabled / initialData', () => {
    it('enabled:false skips the fetch and keeps entry idle', async () => {
      const qc = createQuery();
      let calls = 0;

      await qc.query({ enabled: false, fn: async () => ({ id: ++calls }), key: ['x'] });

      expect(calls).toBe(0);
      expect(qc.getState(['x'])?.status).toBe('idle');
    });

    it('enabled:false returns existing cached data without refetching', async () => {
      const qc = createQuery();

      qc.set(['x'], { id: 99 });

      const data = await qc.query({ enabled: false, fn: async () => ({ id: 1 }), key: ['x'] });

      expect(data).toEqual({ id: 99 });
    });

    it('initialData seeds the cache as success without a network call', async () => {
      const qc = createQuery();
      let calls = 0;

      const data = await qc.query({
        fn: async () => ({ id: ++calls }),
        initialData: { id: 42 },
        key: ['user', 1],
        staleTime: 10_000,
      });

      expect(data).toEqual({ id: 42 });
      expect(calls).toBe(0);
      expect(qc.getState(['user', 1])?.status).toBe('success');
    });

    it('initialData as factory function is called lazily', async () => {
      const qc = createQuery();
      let factoryCalls = 0;

      await qc.query({
        fn: async () => ({ id: 1 }),
        initialData: () => {
          factoryCalls++;

          return { id: 99 };
        },
        key: ['user', 2],
        staleTime: 10_000,
      });

      expect(factoryCalls).toBe(1);
      expect(qc.get(['user', 2])).toEqual({ id: 99 });
    });

    it('initialData is ignored when data already exists in cache', async () => {
      const qc = createQuery();

      qc.set(['user', 3], { id: 1 });
      await qc.query({
        fn: async () => ({ id: 2 }),
        initialData: { id: 99 },
        key: ['user', 3],
        staleTime: 10_000,
      });

      expect(qc.get(['user', 3])).toEqual({ id: 1 });
    });

    it('placeholderData is visible in subscriber state while pending', async () => {
      const qc = createQuery();

      let resolveQuery!: (v: { id: number }) => void;
      const pending = new Promise<{ id: number }>((res) => {
        resolveQuery = res;
      });

      const states: Array<{ data: unknown; status: string }> = [];

      qc.subscribe(['user', 4], (s) => states.push({ data: s.data, status: s.status }), { placeholderData: { id: 0 } });

      const queryPromise = qc.query({
        fn: () => pending,
        key: ['user', 4],
      });

      // Pending state should expose placeholder
      expect(states.at(-1)).toMatchObject({ data: { id: 0 }, status: 'pending' });

      resolveQuery({ id: 7 });
      await queryPromise;

      // After resolution placeholder is replaced by real data
      expect(states.at(-1)).toMatchObject({ data: { id: 7 }, status: 'success' });
    });
  });

  describe('subscribe with select', () => {
    it('select transforms the data seen by the listener', async () => {
      const qc = createQuery();

      qc.set(['user', 1], { id: 1, name: 'Alice' });

      const names: (string | undefined)[] = [];
      const unsub = qc.subscribe<{ id: number; name: string }, string>(['user', 1], (s) => names.push(s.data), {
        select: (d) => d?.name,
      });

      expect(names).toEqual(['Alice']);
      unsub();
    });

    it('select deduplicates notifications when selected value is unchanged', async () => {
      const qc = createQuery();
      let calls = 0;

      qc.set(['user', 1], { id: 1, name: 'Alice', role: 'admin' });

      const unsub = qc.subscribe<{ id: number; name: string; role: string }, string>(['user', 1], () => calls++, {
        select: (d) => d?.name,
      });

      // Update only `role` — name unchanged, listener must NOT fire again
      qc.set(['user', 1], { id: 1, name: 'Alice', role: 'editor' });

      expect(calls).toBe(1); // only the initial fire

      // Update `name` — listener MUST fire
      qc.set(['user', 1], { id: 1, name: 'Bob', role: 'editor' });
      expect(calls).toBe(2);

      unsub();
    });

    it('select still notifies on status changes even when data is unchanged', async () => {
      const qc = createQuery();
      const statuses: string[] = [];

      qc.subscribe<{ id: number }, { id: number }>(['user', 1], (s) => statuses.push(s.status), { select: (d) => d });

      await qc.query({ fn: async () => ({ id: 1 }), key: ['user', 1] }).catch(() => {});

      expect(statuses).toContain('pending');
      expect(statuses).toContain('success');
    });
  });
});
