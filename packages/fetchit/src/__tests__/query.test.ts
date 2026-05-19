import { createQuery, type QueryFnContext, type QueryState } from '../index';

describe('Query Client', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('Execution & Caching', () => {
    it('is stale by default and refetches on the next call', async () => {
      const qc = createQuery();
      let calls = 0;

      const fn = async () => ({ id: ++calls });

      await qc.fetch({ fn, key: ['users', 1] });
      await qc.fetch({ fn, key: ['users', 1] });

      expect(calls).toBe(2);
    });

    it('serves fresh data from cache while staleTime is active', async () => {
      const qc = createQuery();
      let calls = 0;

      const fn = async () => ({ id: ++calls });

      await qc.fetch({ fn, key: ['users', 1], staleTime: 10_000 });
      await qc.fetch({ fn, key: ['users', 1], staleTime: 10_000 });

      expect(calls).toBe(1);
    });

    it('deduplicates concurrent in-flight queries for the same key', async () => {
      const qc = createQuery();
      let calls = 0;
      const fn = () => new Promise<{ id: number }>((resolve) => setTimeout(() => resolve({ id: ++calls }), 50));

      const [r1, r2, r3] = await Promise.all([
        qc.fetch({ fn, key: ['users', 1] }),
        qc.fetch({ fn, key: ['users', 1] }),
        qc.fetch({ fn, key: ['users', 1] }),
      ]);

      expect(r1).toEqual({ id: 1 });
      expect(r2).toEqual({ id: 1 });
      expect(r3).toEqual({ id: 1 });
      expect(calls).toBe(1);
    });

    it('passes both key and AbortSignal to fn', async () => {
      const qc = createQuery();
      let ctx: { key: readonly unknown[]; signal: AbortSignal } | undefined;

      await qc.fetch({
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

      const data = await qc.fetch({ fn, key: ['users', 1], staleTime: 10_000 });

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
      const qc = createQuery({ maxAttempts: 3 });
      let attempts = 0;

      await qc.fetch({
        fn: async () => {
          if (++attempts < 3) throw new Error('transient');

          return { id: 1 };
        },
        key: ['users', 1],
        retryDelay: 0,
      });

      expect(attempts).toBe(3);
    });

    it('maxAttempts:1 makes exactly one attempt then rejects', async () => {
      const qc = createQuery({ maxAttempts: 1 });
      let attempts = 0;

      await expect(
        qc.fetch({
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

  describe('Cache Manipulation', () => {
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

      await qc.fetch({ fn, key: ['users', 1], staleTime: 10_000 });
      qc.invalidate(['users', 1]);
      await qc.fetch({ fn, key: ['users', 1], staleTime: 10_000 });

      expect(calls).toBe(2);
    });

    it('gcTime:0 evicts the entry immediately after fetch', async () => {
      const qc = createQuery({ gcTime: 0 });

      await qc.fetch({ fn: async () => ({ id: 1 }), key: ['x'] });

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

  describe('Observers & State', () => {
    it('getState() returns null before any query, then full shape after success', async () => {
      const qc = createQuery();

      expect(qc.getState(['never'])).toBeNull();

      await qc.fetch({ fn: async () => ({ id: 1 }), key: ['users', 1] });

      expect(qc.getState(['users', 1])).toMatchObject({
        data: { id: 1 },
        error: null,
        status: 'success',
      });
      expect(qc.getState(['users', 1])!.updatedAt).toBeGreaterThan(0);
    });

    it('subscribe() tracks isFetching through idle → fetching → success', async () => {
      const qc = createQuery();
      const states: QueryState[] = [];

      const unsub = qc.subscribe(['users', 1], (s) => states.push({ ...s }));

      await qc.fetch({ fn: async () => ({ id: 1 }), key: ['users', 1] });
      unsub();

      expect(states.map((s) => s.status)).toEqual(['idle', 'pending', 'success']);
      expect(states[0].isFetching).toBe(false);
      expect(states[1].isFetching).toBe(true);
      expect(states[2].isFetching).toBe(false);
    });

    it('subscribe() tracks isFetching through idle → fetching → error', async () => {
      const qc = createQuery();
      const states: QueryState[] = [];

      qc.subscribe(['fail'], (s) => states.push({ ...s }));
      await qc
        .fetch({
          fn: async () => {
            throw new Error('boom');
          },
          key: ['fail'],
        })
        .catch(() => {});

      expect(states.map((s) => s.status)).toEqual(['idle', 'pending', 'error']);
      expect(states[1].isFetching).toBe(true);
      expect(states[2].error?.message).toBe('boom');
    });

    it('subscribe() cancels a pending GC timer to keep entry alive', async () => {
      vi.useFakeTimers();

      const qc = createQuery({ gcTime: 1_000 });

      await qc.fetch({ fn: async () => ({ id: 1 }), key: ['x'] });
      qc.subscribe(['x'], () => {});
      vi.advanceTimersByTime(2_000);

      expect(qc.get(['x'])).toEqual({ id: 1 });
      vi.useRealTimers();
    });

    it('unsubscribing schedules GC rather than immediately deleting the entry', () => {
      vi.useFakeTimers();

      const qc = createQuery({ gcTime: 1_000 });
      const unsub = qc.subscribe(['x'], () => {});

      unsub();

      // Entry still present immediately after unsubscribe (GC timer not yet fired)
      expect(qc.getState(['x'])).not.toBeNull();

      vi.advanceTimersByTime(1_001);

      expect(qc.getState(['x'])).toBeNull();
      vi.useRealTimers();
    });

    it('refetchOnFocus registers and removes the visibilitychange listener', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');
      const removeSpy = vi.spyOn(document, 'removeEventListener');

      const qc = createQuery({ refetchOnFocus: true });

      expect(addSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

      qc.dispose();

      expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('subscribe() select() transforms the observed data shape', async () => {
      const qc = createQuery();
      const shapes: unknown[] = [];

      qc.subscribe(['users', 1], (s) => shapes.push(s.data), {
        select: (data: { id: number; name: string } | undefined) => (data ? { id: data.id } : undefined),
      });

      await qc.fetch({ fn: async () => ({ id: 1, name: 'Alice' }), key: ['users', 1] });

      expect(shapes[shapes.length - 1]).toEqual({ id: 1 });
    });

    it('invalidate() resets observed set()-only entries to idle when no fn is stored', async () => {
      const qc = createQuery();
      const states: QueryState[] = [];

      qc.set(['manual', 1], { id: 1 });

      const unsub = qc.subscribe(['manual', 1], (s) => states.push({ ...s }));

      qc.invalidate(['manual', 1]);

      expect(states[states.length - 1]?.status).toBe('idle');
      expect(states[states.length - 1]?.data).toBeUndefined();
      // Entry still exists while observer holds it alive
      expect(qc.getState(['manual', 1])).not.toBeNull();
      unsub();
    });

    it('invalidate() revalidates observed entries in the background', async () => {
      const qc = createQuery();
      let calls = 0;

      const fn = async () => ({ id: ++calls });

      await qc.fetch({ fn, key: ['users', 1], staleTime: 10_000 });

      const states: QueryState[] = [];
      const unsub = qc.subscribe(['users', 1], (s) => states.push({ ...s }));

      qc.invalidate(['users', 1]);

      await vi.waitFor(() => {
        expect(qc.get(['users', 1])).toEqual({ id: 2 });
      });

      expect(states.some((s) => s.isFetching)).toBe(true);
      expect(states[states.length - 1]?.status).toBe('success');
      expect(states[states.length - 1]?.data).toEqual({ id: 2 });
      expect(qc.getState(['users', 1])).not.toBeNull();
      unsub();
    });

    it('invalidate() does not corrupt entry staleTime when background refetch completes', async () => {
      const qc = createQuery();
      let calls = 0;

      const fn = async () => ({ id: ++calls });

      // Prime with staleTime: 60_000 — entry should stay fresh for one minute.
      await qc.fetch({ fn, key: ['users', 1], staleTime: 60_000 });

      // Subscribe so invalidate triggers background revalidation, not eviction.
      const unsub2 = qc.subscribe(['users', 1], () => {});

      qc.invalidate(['users', 1]);

      await vi.waitFor(() => {
        expect(qc.get(['users', 1])).toEqual({ id: 2 });
      });

      // entry.staleTime must still be 60_000 after the background refetch.
      // If it were 0, a follow-up query would trigger another fetch.
      const prevCalls = calls;

      await qc.fetch({ fn, key: ['users', 1], staleTime: 60_000 });
      expect(calls).toBe(prevCalls);

      unsub2();
    });

    it('invalidate() + cancel() preserves original updatedAt via rollback', async () => {
      const qc = createQuery();

      // Prime with a known entry.
      await qc.fetch({ fn: async () => ({ id: 1 }), key: ['users', 1], staleTime: 60_000 });

      const originalUpdatedAt = qc.getState(['users', 1])!.updatedAt!;

      expect(originalUpdatedAt).toBeGreaterThan(0);

      // Register a blocking fn without starting a fetch (data is still fresh, so
      // fetchQuery returns from cache but still writes entry.fn = blockingFn).
      let abortRefetch!: () => void;
      const blockingFn = async ({ signal }: QueryFnContext): Promise<{ id: number }> =>
        new Promise<{ id: number }>((_, rej) => {
          abortRefetch = () => rej(new DOMException('Aborted', 'AbortError'));
          signal.addEventListener('abort', () => rej(new DOMException('Aborted', 'AbortError')));
        });

      await qc.fetch({ fn: blockingFn, key: ['users', 1], staleTime: 60_000 });

      // Subscribe so invalidate does background revalidation.
      const unsub3 = qc.subscribe(['users', 1], () => {});

      qc.invalidate(['users', 1]); // Kicks off blockingFn via startFetch.
      qc.cancel(['users', 1]); // Abort before it resolves.

      await new Promise((r) => setTimeout(r, 0));

      // Rollback must restore the original updatedAt — not 0.
      const state = qc.getState(['users', 1]);

      expect(state?.status).toBe('success');
      expect(state?.data).toEqual({ id: 1 });
      expect(state?.updatedAt).toBe(originalUpdatedAt);

      unsub3();
    });

    it('refetchOnReconnect revalidates error entries that still hold stale data', async () => {
      vi.useFakeTimers();

      const qc = createQuery({ refetchOnReconnect: true });
      let calls = 0;
      const unsub = qc.subscribe(['err-recovery'], () => {});

      // Seed with successful data
      qc.set(['err-recovery'], { id: 1 });

      // Simulate a failed refetch that preserves previous data
      await qc.fetch({
        fn: async () => {
          calls++;

          if (calls === 1) return { id: 1 };

          throw new Error('transient');
        },
        key: ['err-recovery'],
        maxAttempts: 1,
        retryDelay: 0,
        staleTime: 0,
      });

      calls = 0;
      await expect(
        qc.fetch({
          fn: async () => {
            calls++;
            throw new Error('fail');
          },
          key: ['err-recovery'],
          maxAttempts: 1,
          retryDelay: 0,
          staleTime: 0,
        }),
      ).rejects.toThrow();

      expect(qc.getState(['err-recovery'])).toMatchObject({ data: { id: 1 }, status: 'error' });

      const callsBefore = calls;

      window.dispatchEvent(new Event('online'));
      await vi.runAllTimersAsync();

      // Should have attempted a revalidation after reconnect
      expect(calls).toBeGreaterThan(callsBefore);

      unsub();
      qc.dispose();
      vi.useRealTimers();
    });

    it('[Symbol.dispose] delegates to dispose()', () => {
      const qc = createQuery();

      expect(qc.disposed).toBe(false);
      qc[Symbol.dispose]();
      expect(qc.disposed).toBe(true);
    });

    it('cancel() keeps previous data when aborting a refetch', async () => {
      const qc = createQuery();

      qc.set(['users', 1], { id: 1, name: 'Alice' });

      let reject!: (error: unknown) => void;
      const pending = new Promise<never>((_resolve, nextReject) => {
        reject = nextReject;
      });

      const queryPromise = qc.fetch({
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

  describe('Execution Controls', () => {
    it('enabled:false skips the fetch and keeps entry idle', async () => {
      const qc = createQuery();
      let calls = 0;

      const result = await qc.fetch({ enabled: false, fn: async () => ({ id: ++calls }), key: ['x'] });

      expect(calls).toBe(0);
      expect(result).toBeUndefined();
      expect(qc.getState(['x'])?.status).toBe('idle');
    });

    it('enabled:false returns existing cached data without refetching', async () => {
      const qc = createQuery();

      qc.set(['x'], { id: 99 });

      const data = await qc.fetch({ enabled: false, fn: async () => ({ id: 1 }), key: ['x'] });

      expect(data).toEqual({ id: 99 });
    });

    it('initialData seeds the cache as success without a network call', async () => {
      const qc = createQuery();
      let calls = 0;

      const data = await qc.fetch({
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

      await qc.fetch({
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
      await qc.fetch({
        fn: async () => ({ id: 2 }),
        initialData: { id: 99 },
        key: ['user', 3],
        staleTime: 10_000,
      });

      expect(qc.get(['user', 3])).toEqual({ id: 1 });
    });

    it('placeholderData is visible while fetching', async () => {
      const qc = createQuery();

      let resolveQuery!: (v: { id: number }) => void;
      const pending = new Promise<{ id: number }>((res) => {
        resolveQuery = res;
      });

      const states: Array<{ data: unknown; isFetching: boolean; status: string }> = [];

      qc.subscribe(['user', 4], (s) => states.push({ data: s.data, isFetching: s.isFetching, status: s.status }), {
        placeholderData: { id: 0 },
      });

      const queryPromise = qc.fetch({
        fn: () => pending,
        key: ['user', 4],
      });

      // Fetching state should expose placeholder with isFetching:true
      expect(states.at(-1)).toMatchObject({ data: { id: 0 }, status: 'pending' });
      expect(states.at(-1)?.isFetching).toBe(true);

      resolveQuery({ id: 7 });
      await queryPromise;

      // After resolution placeholder is replaced by real data
      expect(states.at(-1)).toMatchObject({ data: { id: 7 }, status: 'success' });
    });

    it('prefetch() with enabled:false makes no network request and leaves entry idle', async () => {
      const qc = createQuery();
      let calls = 0;

      await qc.prefetch({ enabled: false, fn: async () => ({ id: ++calls }), key: ['prefetch-disabled'] });

      expect(calls).toBe(0);
      // The entry is created (ensureEntry) but never fetched.
      expect(qc.getState(['prefetch-disabled'])?.status).toBe('idle');
      expect(qc.get(['prefetch-disabled'])).toBeUndefined();
    });
  });

  describe('Selection', () => {
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

      await qc.fetch({ fn: async () => ({ id: 1 }), key: ['user', 1] }).catch(() => {});

      expect(statuses).toContain('idle');
      expect(statuses).toContain('success');

      const fetchingState = qc.getState<{ id: number }>(['user', 1]);

      expect(fetchingState?.status).toBe('success'); // settled by now
    });
  });

  describe('External Store (watch)', () => {
    it('peek() returns idle state for unknown keys before subscribe()', () => {
      const qc = createQuery();
      const store = qc.watch(['unknown']);

      expect(store.peek()).toEqual({
        data: undefined,
        error: null,
        isFetching: false,
        status: 'idle',
        updatedAt: undefined,
      });
    });

    it('subscribe() + peek() reflect query state updates', async () => {
      const qc = createQuery();
      const store = qc.watch<{ id: number }>(['users', 1]);
      let notifications = 0;

      const unsub = store.subscribe(() => {
        notifications++;
      });

      const pending = qc.fetch({
        fn: async () => ({ id: 1 }),
        key: ['users', 1],
      });

      expect(store.peek().status).toBe('pending');
      expect(store.peek().isFetching).toBe(true);

      await pending;

      expect(store.peek()).toMatchObject({
        data: { id: 1 },
        isFetching: false,
        status: 'success',
      });
      expect(notifications).toBe(2);

      unsub();
    });

    it('watch() with select transforms the snapshot data', async () => {
      const qc = createQuery();
      const store = qc.watch<{ id: number; name: string }, { id: number }>(['users', 1], {
        select: (d) => (d ? { id: d.id } : undefined),
      });

      const unsub = store.subscribe(() => {});

      await qc.fetch({ fn: async () => ({ id: 1, name: 'Alice' }), key: ['users', 1] });

      expect(store.peek()).toMatchObject({ data: { id: 1 }, status: 'success' });
      unsub();
    });

    it('peek() applies select before subscribe()', () => {
      const qc = createQuery();

      qc.set(['users', 1], { id: 1, name: 'Alice' });

      const store = qc.watch<{ id: number; name: string }, string>(['users', 1], {
        select: (d) => d?.name,
      });

      expect(store.peek()).toMatchObject({ data: 'Alice', status: 'success' });
    });

    it('subscribe() does not notify immediately on setup', () => {
      const qc = createQuery();
      const store = qc.watch(['users', 1]);
      let notifications = 0;

      const unsub = store.subscribe(() => {
        notifications++;
      });

      expect(notifications).toBe(0);
      unsub();
    });

    it('unsubscribe() stops further notifications', async () => {
      const qc = createQuery();
      const store = qc.watch(['users', 1]);
      let notifications = 0;

      const unsub = store.subscribe(() => {
        notifications++;
      });

      unsub();

      await qc.fetch({ fn: async () => ({ id: 1 }), key: ['users', 1] });

      expect(notifications).toBe(0);
    });
  });
});
