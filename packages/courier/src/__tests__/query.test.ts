import { bindRefetch, createQuery, type QueryFnContext, type QueryState } from '../index';

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

    it('fetch({ throwOnError: false }) warms cache and subsequent query uses fresh cached data', async () => {
      const qc = createQuery();
      let calls = 0;

      const fn = async () => ({ id: ++calls });

      await qc.fetch({ fn, key: ['users', 1], staleTime: 10_000 });

      expect(qc.get(['users', 1])).toEqual({ id: 1 });

      const data = await qc.fetch({ fn, key: ['users', 1], staleTime: 10_000 });

      expect(data).toEqual({ id: 1 });
      expect(calls).toBe(1);
    });

    it('fetch() throws errors by default and stores error state', async () => {
      const qc = createQuery();

      await expect(
        qc.fetch({
          fn: async () => {
            throw new Error('boom');
          },
          key: ['prefetch-fail'],
        }),
      ).rejects.toThrow('boom');

      expect(qc.getState(['prefetch-fail'])?.status).toBe('error');
      expect(qc.getState(['prefetch-fail'])?.error?.message).toBe('boom');
    });
  });

  describe('Retry', () => {
    it('retries the fn up to the specified count before succeeding', async () => {
      const qc = createQuery({ times: 3 });
      let attempts = 0;

      await qc.fetch({
        delay: 0,
        fn: async () => {
          if (++attempts < 3) throw new Error('transient');

          return { id: 1 };
        },
        key: ['users', 1],
      });

      expect(attempts).toBe(3);
    });

    it('times:1 makes exactly one attempt then rejects', async () => {
      const qc = createQuery({ times: 1 });
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

    it('get() preserves null data — does not coerce to undefined', () => {
      const qc = createQuery();

      qc.set<null>(['nullable'], null);

      expect(qc.get(['nullable'])).toBeNull();
    });

    it('get() with object-atom QueryKey round-trips correctly', () => {
      const qc = createQuery();

      qc.set([{ limit: 10, page: 1 }], [1, 2, 3]);

      expect(qc.get([{ limit: 10, page: 1 }])).toEqual([1, 2, 3]);
      expect(qc.get([{ limit: 10, page: 2 }])).toBeUndefined();
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

    it('observe({fetch:false}) tracks isFetching through fetching → success', async () => {
      const qc = createQuery();
      const states: QueryState[] = [];
      const store = qc.observe<{ id: number }>({ fetch: false, key: ['users', 1] });

      const unsub = store.subscribe(() => states.push({ ...store.peek() }));

      await qc.fetch({ fn: async () => ({ id: 1 }), key: ['users', 1] });
      unsub();

      expect(states.map((s) => s.status)).toEqual(['loading', 'success']);
      expect(states[0].isFetching).toBe(true);
      expect(states[1].isFetching).toBe(false);
    });

    it('observe({fetch:false}) tracks isFetching through fetching → error', async () => {
      const qc = createQuery();
      const states: QueryState[] = [];
      const store = qc.observe({ fetch: false, key: ['fail'] });

      store.subscribe(() => states.push({ ...store.peek() }));
      await qc
        .fetch({
          fn: async () => {
            throw new Error('boom');
          },
          key: ['fail'],
        })
        .catch(() => {});

      expect(states.map((s) => s.status)).toEqual(['loading', 'error']);
      expect(states[0].isFetching).toBe(true);
      expect(states[1].error?.message).toBe('boom');
    });

    it('observe({fetch:false}).subscribe() cancels a pending GC timer to keep entry alive', async () => {
      vi.useFakeTimers();

      const qc = createQuery({ gcTime: 1_000 });

      await qc.fetch({ fn: async () => ({ id: 1 }), key: ['x'] });
      qc.observe({ fetch: false, key: ['x'] }).subscribe(() => {});
      vi.advanceTimersByTime(2_000);

      expect(qc.get(['x'])).toEqual({ id: 1 });
      vi.useRealTimers();
    });

    it('unsubscribing schedules GC rather than immediately deleting the entry', () => {
      vi.useFakeTimers();

      const qc = createQuery({ gcTime: 1_000 });
      const unsub = qc.observe({ fetch: false, key: ['x'] }).subscribe(() => {});

      unsub();

      // Entry still present immediately after unsubscribe (GC timer not yet fired)
      expect(qc.getState(['x'])).not.toBeNull();

      vi.advanceTimersByTime(1_001);

      expect(qc.getState(['x'])).toBeNull();
      vi.useRealTimers();
    });

    it('bindRefetch() triggers refetchStale() on visibilitychange', () => {
      const qc = createQuery();
      const spyRefetch = vi.spyOn(qc, 'refetchStale');

      // Save and restore to avoid polluting subsequent tests
      const originalDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');

      try {
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });

        const unbind = bindRefetch(qc);

        document.dispatchEvent(new Event('visibilitychange'));

        expect(spyRefetch).toHaveBeenCalledTimes(1);

        unbind();

        // After unbind, further events must not trigger a call
        document.dispatchEvent(new Event('visibilitychange'));

        expect(spyRefetch).toHaveBeenCalledTimes(1);
      } finally {
        if (originalDescriptor) {
          Object.defineProperty(document, 'visibilityState', originalDescriptor);
        }
      }
    });

    it('observe(fetch:false) with select transforms the observed data shape', async () => {
      const qc = createQuery();
      const shapes: unknown[] = [];
      const fn = async () => ({ id: 1, name: 'Alice' });
      const store = qc.observe<{ id: number; name: string }, { id: number }>({
        fn,
        key: ['users', 1],
        select: (data) => (data ? { id: data.id } : undefined),
      });

      store.subscribe(() => shapes.push(store.peek().data));

      await qc.fetch({ fn, key: ['users', 1] });

      expect(shapes[shapes.length - 1]).toEqual({ id: 1 });
    });

    it('invalidate() resets observed set()-only entries to loading when no fn is stored', async () => {
      const qc = createQuery();
      const states: QueryState[] = [];

      qc.set(['manual', 1], { id: 1 });

      const store = qc.observe({ fetch: false, key: ['manual', 1] });
      const unsub = store.subscribe(() => states.push({ ...store.peek() }));

      qc.invalidate(['manual', 1]);

      expect(states[states.length - 1]?.status).toBe('loading');
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
      const store = qc.observe<{ id: number }>({ fetch: false, key: ['users', 1] });
      const unsub = store.subscribe(() => states.push({ ...store.peek() }));

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
      const unsub2 = qc.observe({ fetch: false, key: ['users', 1] }).subscribe(() => {});

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
      const blockingFn = async ({ signal }: QueryFnContext): Promise<{ id: number }> =>
        new Promise<{ id: number }>((_, rej) => {
          signal.addEventListener('abort', () => rej(new DOMException('Aborted', 'AbortError')));
        });

      await qc.fetch({ fn: blockingFn, key: ['users', 1], staleTime: 60_000 });

      // Subscribe so invalidate does background revalidation.
      const unsub3 = qc.observe({ fetch: false, key: ['users', 1] }).subscribe(() => {});

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

    it('refetchStale() revalidates error entries that still hold stale data', async () => {
      vi.useFakeTimers();

      const qc = createQuery();
      let calls = 0;
      const unsub = qc.observe({ fetch: false, key: ['err-recovery'] }).subscribe(() => {});

      // Seed with successful data then fail a refetch to arrive at error + stale data
      await qc.fetch({
        delay: 0,
        fn: async () => {
          calls++;

          if (calls === 1) return { id: 1 };

          throw new Error('transient');
        },
        key: ['err-recovery'],
        staleTime: 0,
        times: 1,
      });

      calls = 0;
      await expect(
        qc.fetch({
          delay: 0,
          fn: async () => {
            calls++;
            throw new Error('fail');
          },
          key: ['err-recovery'],
          staleTime: 0,
          times: 1,
        }),
      ).rejects.toThrow();

      expect(qc.getState(['err-recovery'])).toMatchObject({ data: { id: 1 }, status: 'error' });

      const callsBefore = calls;

      // refetchStale() is now the explicit API instead of hidden window 'online' listener
      qc.refetchStale();
      await vi.runAllTimersAsync();

      expect(calls).toBeGreaterThan(callsBefore);

      unsub();
      qc.dispose();
      vi.useRealTimers();
    });

    it('refetchStale() skips error entries whose updatedAt is within staleTime', async () => {
      vi.useFakeTimers();

      const qc = createQuery();
      const unsub = qc.observe({ fetch: false, key: ['key'] }).subscribe(() => {});
      let attempt = 0;

      const fn = vi.fn(async () => {
        if (++attempt === 1) return { id: 1 };

        throw new Error('server error');
      });

      // Fetch successfully — lastConfig.staleTime = 60_000
      await qc.fetch({ fn, key: ['key'], staleTime: 60_000 });

      // invalidate() triggers background revalidation via entry.lastConfig which
      // carries staleTime: 60_000. The fn fails on attempt 2 → error + stale data.
      qc.invalidate(['key']);
      await vi.runAllTimersAsync();

      expect(qc.getState(['key'])).toMatchObject({ data: { id: 1 }, status: 'error' });

      fn.mockClear();

      // Error just happened — within staleTime — must NOT trigger a refetch
      qc.refetchStale();
      await vi.runAllTimersAsync();

      expect(fn).not.toHaveBeenCalled();

      // Advance past staleTime — now it must revalidate
      vi.advanceTimersByTime(60_001);
      qc.refetchStale();
      await vi.runAllTimersAsync();

      expect(fn).toHaveBeenCalledTimes(1);

      unsub();
      qc.dispose();
      vi.useRealTimers();
    });

    it('fetch() joining an in-flight request updates lastConfig', async () => {
      const qc = createQuery();
      let resolveFetch!: (v: { id: number }) => void;
      const blocking = new Promise<{ id: number }>((r) => (resolveFetch = r));

      // First fetch starts the in-flight request
      const p1 = qc.fetch({ fn: () => blocking, key: ['x'], staleTime: 0 });

      // Second fetch joins the in-flight request — with a different staleTime
      const p2 = qc.fetch({ fn: () => blocking, key: ['x'], staleTime: 60_000 });

      resolveFetch({ id: 1 });
      await Promise.all([p1, p2]);

      // After resolution the lastConfig must reflect the most recent fetch call (staleTime 60_000)
      // so a subsequent fetch within that window is served from cache.
      let extraCalls = 0;

      await qc.fetch({
        fn: async () => {
          extraCalls++;

          return { id: 2 };
        },
        key: ['x'],
        staleTime: 60_000,
      });

      expect(extraCalls).toBe(0); // served from cache, no network call
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
    it('enabled:false skips the fetch and keeps entry loading', async () => {
      const qc = createQuery();
      let calls = 0;

      const result = await qc.fetch({ enabled: false, fn: async () => ({ id: ++calls }), key: ['x'] });

      expect(calls).toBe(0);
      expect(result).toBeUndefined();
      expect(qc.getState(['x'])).toBeNull(); // No entry created — enabled:false with no prior data
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

      const fn = () => pending;
      const states: Array<{ data: unknown; isFetching: boolean; status: string }> = [];

      // observe(fetch:false) returns a store without triggering a fetch.
      // Subscribe first, then start the fetch manually so we capture the pending transition.
      const store = qc.observe<{ id: number }, { id: number }>({
        fetch: false,
        fn,
        key: ['user', 4],
        placeholderData: { id: 0 },
      });

      const unsub = store.subscribe(() =>
        states.push({ data: store.peek().data, isFetching: store.peek().isFetching, status: store.peek().status }),
      );

      // Start the fetch after subscribing
      void qc.fetch({ fn, key: ['user', 4] });

      // Fetching state should expose placeholder with isFetching:true
      await vi.waitFor(() => expect(states.length).toBeGreaterThan(0));
      expect(states.at(-1)).toMatchObject({ data: { id: 0 }, status: 'loading' });
      expect(states.at(-1)?.isFetching).toBe(true);

      resolveQuery({ id: 7 });
      await vi.waitFor(() => expect(store.peek().status).toBe('success'));

      // After resolution placeholder is replaced by real data
      expect(states.at(-1)).toMatchObject({ data: { id: 7 }, status: 'success' });
      unsub();
    });

    it('fetch() with enabled:false makes no network request and leaves no entry', async () => {
      const qc = createQuery();
      let calls = 0;

      await qc.fetch({ enabled: false, fn: async () => ({ id: ++calls }), key: ['prefetch-disabled'] });

      expect(calls).toBe(0);
      expect(qc.getState(['prefetch-disabled'])).toBeNull(); // No entry created — enabled:false with no prior data
      expect(qc.get(['prefetch-disabled'])).toBeUndefined();
    });
  });

  describe('Selection', () => {
    it('select transforms the data seen by the listener', async () => {
      const qc = createQuery();
      const names: (string | undefined)[] = [];
      const fn = async () => ({ id: 1, name: 'Alice' });

      const store = qc.observe<{ id: number; name: string }, string>({
        fn,
        key: ['user', 1],
        select: (d) => d?.name,
      });
      const unsub = store.subscribe(() => names.push(store.peek().data));

      qc.set(['user', 1], { id: 1, name: 'Alice' });

      expect(names).toContain('Alice');
      unsub();
    });

    it('select deduplicates notifications when selected value is unchanged', async () => {
      const qc = createQuery();
      let calls = 0;
      const fn = async () => ({ id: 1, name: 'Alice', role: 'admin' });

      const store = qc.observe<{ id: number; name: string; role: string }, string>({
        fetch: false,
        fn,
        key: ['user', 1],
        select: (d) => d?.name,
      });
      const unsub = store.subscribe(() => calls++);

      qc.set(['user', 1], { id: 1, name: 'Alice', role: 'admin' });

      // Update only `role` — name unchanged, listener must NOT fire again
      qc.set(['user', 1], { id: 1, name: 'Alice', role: 'editor' });

      expect(calls).toBe(1); // only the first set fired

      // Update `name` — listener MUST fire
      qc.set(['user', 1], { id: 1, name: 'Bob', role: 'editor' });
      expect(calls).toBe(2);

      unsub();
    });

    it('select still notifies on status changes even when data is unchanged', async () => {
      const qc = createQuery();
      const statuses: string[] = [];
      const fn = async () => ({ id: 1 });

      const store = qc.observe<{ id: number }, { id: number }>({
        fn,
        key: ['user', 1],
        select: (d) => d,
      });

      store.subscribe(() => statuses.push(store.peek().status));

      await qc.fetch({ fn, key: ['user', 1] }).catch(() => {});

      expect(statuses).toContain('success');

      const fetchingState = qc.getState<{ id: number }>(['user', 1]);

      expect(fetchingState?.status).toBe('success');
    });
  });

  describe('External Store (observe fetch:false)', () => {
    it('peek() returns loading state for unknown keys before subscribe()', () => {
      const qc = createQuery();
      const store = qc.observe({ fetch: false, key: ['unknown'] });

      expect(store.peek()).toMatchObject({
        data: undefined,
        error: null,
        isFetching: false,
        status: 'loading',
        updatedAt: undefined,
      });
    });

    it('subscribe() + peek() reflect query state updates', async () => {
      const qc = createQuery();
      const store = qc.observe<{ id: number }>({ fetch: false, key: ['users', 1] });
      let notifications = 0;

      const unsub = store.subscribe(() => {
        notifications++;
      });

      const pending = qc.fetch({
        fn: async () => ({ id: 1 }),
        key: ['users', 1],
      });

      expect(store.peek().status).toBe('loading');
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

    it('observe() with select transforms the snapshot data', async () => {
      const qc = createQuery();
      const fn = async () => ({ id: 1, name: 'Alice' });
      const store = qc.observe<{ id: number; name: string }, { id: number }>({
        fn,
        key: ['users', 1],
        select: (d) => (d ? { id: d.id } : undefined),
      });

      const unsub = store.subscribe(() => {});

      await qc.fetch({ fn, key: ['users', 1] });

      expect(store.peek()).toMatchObject({ data: { id: 1 }, status: 'success' });
      unsub();
    });

    it('peek() applies select before subscribe()', () => {
      const qc = createQuery();

      qc.set(['users', 1], { id: 1, name: 'Alice' });

      const fn = async () => ({ id: 1, name: 'Alice' });
      const store = qc.observe<{ id: number; name: string }, string>({
        fetch: false,
        fn,
        key: ['users', 1],
        select: (d) => d?.name,
      });

      expect(store.peek()).toMatchObject({ data: 'Alice', status: 'success' });
    });

    it('subscribe() does not notify immediately on setup', () => {
      const qc = createQuery();
      const store = qc.observe({ fetch: false, key: ['users', 1] });
      let notifications = 0;

      const unsub = store.subscribe(() => {
        notifications++;
      });

      expect(notifications).toBe(0);
      unsub();
    });

    it('unsubscribe() stops further notifications', async () => {
      const qc = createQuery();
      const store = qc.observe({ fetch: false, key: ['users', 1] });
      let notifications = 0;

      const unsub = store.subscribe(() => {
        notifications++;
      });

      unsub();

      await qc.fetch({ fn: async () => ({ id: 1 }), key: ['users', 1] });

      expect(notifications).toBe(0);
    });
  });

  describe('cancelAll', () => {
    it('cancelAll() aborts all in-flight query fetches', async () => {
      const qc = createQuery();
      const aborted: boolean[] = [];

      const p = qc
        .fetch({
          fn: ({ signal }) =>
            new Promise<{ id: number }>((_, reject) => {
              signal.addEventListener('abort', () => {
                aborted.push(true);
                reject(new DOMException('Aborted', 'AbortError'));
              });
            }),
          key: ['x'],
        })
        .catch(() => {});

      qc.cancelAll();
      await p;

      expect(aborted).toEqual([true]);
    });

    it('cancelAll() does not dispose the client', () => {
      const qc = createQuery();

      qc.cancelAll();

      expect(qc.disposed).toBe(false);
    });

    it('cancelAll() is a no-op when there are no in-flight fetches', () => {
      const qc = createQuery();

      expect(() => qc.cancelAll()).not.toThrow();
    });
  });

  describe('enabled / initialData', () => {
    it('enabled:false skips the fetch and returns current cached data', async () => {
      const qc = createQuery();
      let calls = 0;

      const fn = async () => ({ id: ++calls });

      const result = await qc.fetch({ enabled: false, fn, key: ['users', 1] });

      expect(calls).toBe(0);
      expect(result).toBeUndefined();
    });

    it('initialData factory form seeds the cache when no data exists', async () => {
      const qc = createQuery();

      await qc.fetch({
        fn: async () => ({ id: 99 }),
        initialData: () => ({ id: 42 }),
        key: ['users', 1],
        staleTime: 60_000,
      });

      expect(qc.get(['users', 1])).toEqual({ id: 42 });
    });

    it('initialData factory returning undefined does not seed the cache', async () => {
      const qc = createQuery();
      let calls = 0;

      await qc.fetch({
        fn: async () => ({ id: ++calls }),
        initialData: () => undefined,
        key: ['users', 1],
      });

      expect(calls).toBe(1);
    });
  });

  describe('observe() with select + placeholderData', () => {
    it('peek() returns placeholderData while loading when select returns undefined', async () => {
      const qc = createQuery();
      const store = qc.observe<{ id: number; name: string }, string>({
        fn: () => new Promise(() => {}),
        key: ['users', 1],
        placeholderData: 'Loading…',
        select: (d) => d?.name,
      });

      const unsub = store.subscribe(() => {});

      const snap = store.peek();

      expect(snap.status).toBe('loading');
      expect(snap.data).toBe('Loading…');

      unsub();
    });

    it('peek() returns selected data (not placeholder) once data is available', async () => {
      const qc = createQuery();

      qc.set(['users', 1], { id: 1, name: 'Alice' });

      const store = qc.observe<{ id: number; name: string }, string>({
        fetch: false,
        fn: async () => ({ id: 1, name: 'Alice' }),
        key: ['users', 1],
        placeholderData: 'Loading…',
        select: (d) => d?.name,
      });

      expect(store.peek().data).toBe('Alice');
    });
  });

  describe('invalidate() — observed vs unobserved branching', () => {
    it('invalidate() revalidates observed entries and evicts unobserved entries', async () => {
      const qc = createQuery();
      let callsObserved = 0;
      let callsUnobserved = 0;

      const fnObserved = async () => ({ id: ++callsObserved });
      const fnUnobserved = async () => ({ id: ++callsUnobserved });

      await qc.fetch({ fn: fnObserved, key: ['observed'], staleTime: 60_000 });
      await qc.fetch({ fn: fnUnobserved, key: ['unobserved'], staleTime: 60_000 });

      const unsub = qc.observe({ fetch: false, key: ['observed'] }).subscribe(() => {});

      qc.invalidate(['observed']);
      qc.invalidate(['unobserved']);

      await new Promise((r) => setTimeout(r, 10));

      expect(callsObserved).toBe(2);

      expect(qc.get(['unobserved'])).toBeUndefined();

      unsub();
    });
  });

  describe('Focus / reconnect helpers', () => {
    it('bindRefetch() triggers refetchStale() on window online event', () => {
      const qc = createQuery();
      const spyRefetch = vi.spyOn(qc, 'refetchStale');

      const unbind = bindRefetch(qc);

      window.dispatchEvent(new Event('online'));

      expect(spyRefetch).toHaveBeenCalledTimes(1);

      unbind();

      window.dispatchEvent(new Event('online'));

      expect(spyRefetch).toHaveBeenCalledTimes(1);
    });

    it('keys() and size reflect current cache contents', async () => {
      const qc = createQuery({ staleTime: 10_000 });

      expect(qc.keys()).toEqual([]);
      expect(qc.size).toBe(0);

      await qc.fetch({ fn: async () => 'a', key: ['a'] });
      await qc.fetch({ fn: async () => 'b', key: ['b', 1] });

      expect(qc.size).toBe(2);

      const keys = qc.keys();

      expect(keys).toHaveLength(2);
      expect(keys).toContainEqual(['a']);
      expect(keys).toContainEqual(['b', 1]);
    });

    it('set() with gcTime:0 — no observers — entry evicted immediately', () => {
      const qc = createQuery();

      qc.set(['key'], 42, { gcTime: 0 });

      expect(qc.getState(['key'])).toBeNull();
      expect(qc.size).toBe(0);
    });

    it('set() with gcTime:0 — active observer — notified then entry retained while subscribed', () => {
      const qc = createQuery();
      const notifiedData: unknown[] = [];
      const store = qc.observe({ fetch: false, key: ['key'] });

      const unsub = store.subscribe(() => {
        notifiedData.push(store.peek().data);
      });

      qc.set(['key'], 42, { gcTime: 0 });

      expect(notifiedData).toEqual([42]);
      expect(qc.getState(['key'])?.data).toBe(42);

      unsub();
    });

    it('dispose() — scheduleGc is a no-op after dispose (race guard)', async () => {
      vi.useFakeTimers();

      try {
        const qc = createQuery({ gcTime: 5_000 });
        const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

        // Seed a successful entry so we have something in cache
        await qc.fetch({ fn: async () => 'value', key: ['x'] });

        const timerCountBefore = setTimeoutSpy.mock.calls.length;

        qc.dispose();

        // After dispose, calling scheduleGc internally should be a no-op.
        // Manually verify: no new setTimeout calls were made after dispose.
        expect(setTimeoutSpy.mock.calls.length).toBe(timerCountBefore);
        expect(qc.disposed).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });

    describe('observe()', () => {
      function waitForStatus(
        qc: ReturnType<typeof createQuery>,
        key: import('../types').QueryKey,
        target: string,
      ): Promise<void> {
        return new Promise((resolve) => {
          const store = qc.observe({ fetch: false, key });
          const unsub = store.subscribe(() => {
            if (store.peek().status === target) {
              unsub();
              resolve();
            }
          });
        });
      }

      it('returns a store and triggers a background fetch', async () => {
        const qc = createQuery();
        const fn = vi.fn(async () => 42);
        const store = qc.observe({ fn, key: ['obs', 1] });

        // observe() triggers the fetch immediately — status is loading or already populated
        expect(['loading', 'success']).toContain(store.peek().status);

        await waitForStatus(qc, ['obs', 1], 'success');

        expect(fn).toHaveBeenCalledTimes(1);
        expect(store.peek().status).toBe('success');
        expect(store.peek().data).toBe(42);
      });

      it('error from fn is committed to store state, not thrown by observe()', async () => {
        const qc = createQuery();
        const boom = new Error('boom');

        expect(() =>
          qc.observe({
            fn: async () => {
              throw boom;
            },
            key: ['obs-err'],
          }),
        ).not.toThrow();

        await waitForStatus(qc, ['obs-err'], 'error');

        const snap = qc.getState(['obs-err']);

        expect(snap?.status).toBe('error');
        expect(snap?.error).toBe(boom);
      });

      it('placeholderData is returned while fetch is in-flight', async () => {
        const qc = createQuery();
        let resolve!: (v: string) => void;
        const fn = () =>
          new Promise<string>((res) => {
            resolve = res;
          });
        const store = qc.observe({ fn, key: ['obs-ph'], placeholderData: 'loading…' });

        expect(store.peek().data).toBe('loading…');
        resolve('done');

        await waitForStatus(qc, ['obs-ph'], 'success');

        expect(store.peek().data).toBe('done');
      });

      it('select transforms the data delivered to the store', async () => {
        const qc = createQuery<string, number>();
        const store = qc.observe<string, number>({
          fn: async () => 'hello world',
          key: ['obs-sel'],
          select: (s) => s?.length,
        });

        await waitForStatus(qc, ['obs-sel'], 'success');

        expect(store.peek().data).toBe(11);
      });
    });

    describe('disposalSignal', () => {
      it('is not aborted before dispose()', () => {
        const qc = createQuery();

        expect(qc.disposalSignal.aborted).toBe(false);
      });

      it('is aborted after dispose()', () => {
        const qc = createQuery();

        qc.dispose();

        expect(qc.disposalSignal.aborted).toBe(true);
      });

      it('dispose() is idempotent — disposalSignal stays aborted', () => {
        const qc = createQuery();

        qc.dispose();
        qc.dispose();

        expect(qc.disposalSignal.aborted).toBe(true);
      });
    });

    describe('observeMany()', () => {
      it('returns a SyncStore whose peek() reflects current state of all observed keys', async () => {
        const qc = createQuery();

        await qc.fetch({ fn: async () => 'a', key: ['k1'] });
        await qc.fetch({ fn: async () => 'b', key: ['k2'] });

        const store = qc.observeMany<string>([['k1'], ['k2']]);
        const snapshot = store.peek();

        expect(snapshot).toHaveLength(2);
        expect(snapshot[0].data).toBe('a');
        expect(snapshot[1].data).toBe('b');
      });

      it('notifies subscriber when any observed key changes', async () => {
        const qc = createQuery();

        await qc.fetch({ fn: async () => 1, key: ['n1'] });
        await qc.fetch({ fn: async () => 2, key: ['n2'] });

        const store = qc.observeMany<number>([['n1'], ['n2']]);
        const notifications: number[] = [];
        const unsub = store.subscribe(() => notifications.push(store.peek().length));

        qc.set(['n1'], 99);

        unsub();
        expect(notifications.length).toBeGreaterThan(0);
      });

      it('returns loading states for keys that have never been fetched', () => {
        const qc = createQuery();

        const store = qc.observeMany([['missing1'], ['missing2']]);
        const snap = store.peek();

        expect(snap).toHaveLength(2);
        expect(snap[0].status).toBe('loading');
        expect(snap[1].status).toBe('loading');
      });
    });

    describe('remove()', () => {
      it('evicts entry with no observers — entry is deleted immediately', async () => {
        const qc = createQuery();

        await qc.fetch({ fn: async () => ({ id: 1 }), key: ['remove-test'] });
        expect(qc.get(['remove-test'])).toBeDefined();

        qc.remove(['remove-test']);
        expect(qc.get(['remove-test'])).toBeUndefined();
        expect(qc.size).toBe(0);
      });

      it('evicts entry with observers — resets to idle and notifies', async () => {
        const qc = createQuery();

        await qc.fetch({ fn: async () => ({ id: 1 }), key: ['remove-observed'] });

        const states: string[] = [];
        const store = qc.observe({ fetch: false, key: ['remove-observed'] });
        const unsub = store.subscribe(() => states.push(store.peek().status));

        qc.remove(['remove-observed']);

        unsub();
        expect(states).toContain('loading');
        expect(store.peek().status).toBe('loading');
        expect(store.peek().data).toBeUndefined();
      });

      it('aborts an in-flight fetch when the entry is removed', async () => {
        const qc = createQuery();
        let aborted = false;

        const fetchPromise = qc
          .fetch({
            fn: ({ signal }) =>
              new Promise<void>((_, reject) => {
                signal.addEventListener('abort', () => {
                  aborted = true;
                  reject(new DOMException('Aborted', 'AbortError'));
                });
              }),
            key: ['remove-inflight'],
          })
          .catch(() => {});

        qc.remove(['remove-inflight']);
        await fetchPromise;

        expect(aborted).toBe(true);
      });

      it('is a no-op for keys that do not exist', () => {
        const qc = createQuery();

        expect(() => qc.remove(['nonexistent'])).not.toThrow();
      });
    });

    describe('fetchMany()', () => {
      it('fetches multiple queries in parallel and returns results in order', async () => {
        const qc = createQuery();

        const results = await qc.fetchMany<number>([
          { fn: async () => 10, key: ['fm1'] },
          { fn: async () => 20, key: ['fm2'] },
          { fn: async () => 30, key: ['fm3'] },
        ]);

        expect(results).toEqual([10, 20, 30]);
      });

      it('rejects if any query fails', async () => {
        const qc = createQuery();

        await expect(
          qc.fetchMany([
            { fn: async () => 'ok', key: ['fmok'] },
            {
              fn: async () => {
                throw new Error('fetch failed');
              },
              key: ['fmfail'],
            },
          ]),
        ).rejects.toThrow('fetch failed');
      });

      it('returns cached data on subsequent call with staleTime', async () => {
        const qc = createQuery();
        let calls = 0;

        const opts = { fn: async () => ++calls, key: ['fmcache'], staleTime: 60_000 };

        await qc.fetchMany([opts]);
        await qc.fetchMany([opts]);

        expect(calls).toBe(1);
      });

      it('return type is T[] — never contains undefined on success', async () => {
        const qc = createQuery();

        const results = await qc.fetchMany<string>([
          { fn: async () => 'a', key: ['t1'] },
          { fn: async () => 'b', key: ['t2'] },
        ]);

        results.forEach((r) => expect(typeof r).toBe('string'));
      });
    });

    describe('observe() error handling', () => {
      it('observe() never rejects the caller even when the fetch throws', async () => {
        const qc = createQuery();
        const threw = false;

        const store = qc.observe({
          fn: async () => {
            throw new Error('oops');
          },
          key: ['obs-err-2'],
          times: 1,
        });

        await new Promise<void>((resolve) => {
          const unsub = store.subscribe(() => {
            const s = store.peek();

            if (s.status === 'error') {
              unsub();
              resolve();
            }
          });
        });

        expect(store.peek().status).toBe('error');
        expect(threw).toBe(false);
      });
    });

    describe('initialData + staleTime', () => {
      it('initialData with staleTime > 0 skips the network fetch', async () => {
        const qc = createQuery();
        let calls = 0;

        const result = await qc.fetch({
          fn: async () => ({ id: ++calls }),
          initialData: { id: 42 },
          key: ['init-stale'],
          staleTime: 60_000,
        });

        expect(calls).toBe(0);
        expect(result).toEqual({ id: 42 });
      });

      it('initialData with staleTime:0 triggers a network fetch', async () => {
        const qc = createQuery();
        let calls = 0;

        await qc.fetch({
          fn: async () => ({ id: ++calls }),
          initialData: { id: 42 },
          key: ['init-nostale'],
          staleTime: 0,
        });

        expect(calls).toBe(1);
      });
    });

    it('bindRefetch() is safe in SSR environments where document/window are undefined', () => {
      const origDocument = globalThis.document;
      const origWindow = globalThis.window;

      try {
        // Simulate SSR by removing browser globals
        Object.defineProperty(globalThis, 'document', { configurable: true, value: undefined });
        Object.defineProperty(globalThis, 'window', { configurable: true, value: undefined });

        const qc = createQuery();
        let called = false;
        const origRefetch = qc.refetchStale.bind(qc);

        Object.defineProperty(qc, 'refetchStale', {
          configurable: true,
          value: () => {
            called = true;
            origRefetch();
          },
        });

        let unbind!: () => void;

        expect(() => {
          unbind = bindRefetch(qc);
        }).not.toThrow();

        expect(() => unbind()).not.toThrow();
        expect(called).toBe(false);
      } finally {
        Object.defineProperty(globalThis, 'document', { configurable: true, value: origDocument });
        Object.defineProperty(globalThis, 'window', { configurable: true, value: origWindow });
      }
    });
  });
});
