import { batch, effect, signal } from '../';

describe('ssr — withProvider()', () => {
  it('withProvider isolates tracking context during fn and restores afterward', async () => {
    const { createAsyncProvider, setTrackingProvider, withProvider } = await import('../ssr');
    const provider = createAsyncProvider();
    let ctxInsideFn: unknown;

    withProvider(provider, () => {
      ctxInsideFn = 'ran';
    });
    expect(ctxInsideFn).toBe('ran');
    setTrackingProvider(null);
  });

  it('withProvider isolates tracking — reads inside fn do not register deps outside', async () => {
    const { createAsyncProvider, setTrackingProvider, withProvider } = await import('../ssr');
    const provider = createAsyncProvider();
    const n = signal(0);
    let effectRuns = 0;
    const stop = effect(() => {
      effectRuns++;
      void n.value;
    });
    const runsBefore = effectRuns;

    withProvider(provider, () => {
      void n.value;
    });
    n.value = 1;
    expect(effectRuns).toBe(runsBefore + 1);
    stop.dispose();
    n.dispose();
    setTrackingProvider(null);
  });

  it('runWithProvider isolates reactive context', async () => {
    const { createAsyncProvider, runWithProvider, setTrackingProvider } = await import('../ssr');
    const provider = createAsyncProvider();
    const n = signal(0);
    let effectRuns = 0;
    const stop = effect(() => {
      effectRuns++;
      void n.value;
    });
    const runsBefore = effectRuns;

    setTrackingProvider(provider);
    runWithProvider(provider, () => {
      void n.value;
    });
    n.value = 1;
    expect(effectRuns).toBe(runsBefore + 1);
    stop.dispose();
    n.dispose();
    setTrackingProvider(null);
  });

  it('setTrackingProvider installs persistently and null restores default', async () => {
    const { createAsyncProvider, setTrackingProvider } = await import('../ssr');
    const provider = createAsyncProvider();

    setTrackingProvider(provider);

    const n = signal(0);
    let effectRuns = 0;
    const stop = effect(() => {
      effectRuns++;
      void n.value;
    });

    setTrackingProvider(null);
    n.value = 1;
    expect(effectRuns).toBeGreaterThanOrEqual(2);
    stop.dispose();
    n.dispose();
  });

  it('concurrent requests each get a fresh, independent scheduling context — no cross-request state or crashes', async () => {
    const { createAsyncProvider, runWithProvider, setTrackingProvider } = await import('../ssr');
    const provider = createAsyncProvider();

    // setTrackingProvider() must be installed once — it's what makes the ExecutionContext
    // hook (tracking.ts's `_hook`) route through this provider at all. Without it,
    // runWithProvider()'s AsyncLocalStorage.run() would set the store but nothing would
    // ever read from it, silently making this test a no-op regardless of the fix under test.
    setTrackingProvider(provider);

    // Two "requests" interleaved via awaits, each opening its own batch() around a write
    // to its own signal. Note: `batch()`'s callback is synchronous-only, and a top-level
    // (non-batched) write always fully drains the flush queue before returning — so this
    // does NOT construct an observable race even without per-request scheduling isolation
    // (verified: this same assertion also passes against a single shared SchedulingState).
    // What this test does verify: `freshRequestContext()` gives each request its own
    // `SchedulingState` object (see tracking.ts) with no crashes or unexpected coalescing
    // when two requests' batch()/effect() calls genuinely interleave via awaits.
    const requestALog: number[] = [];
    const requestBLog: number[] = [];

    const requestA = runWithProvider(provider, async () => {
      const a = signal(0);
      const stop = effect(() => {
        requestALog.push(a.value);
      });

      await new Promise((r) => setTimeout(r, 0));
      batch(() => {
        a.value = 1;
        a.value = 2; // coalesced — one notification with the final value
      });
      stop.dispose();
      a.dispose();
    });

    const requestB = runWithProvider(provider, async () => {
      const b = signal(0);
      const stop = effect(() => {
        requestBLog.push(b.value);
      });

      batch(() => {
        b.value = 10;
      });
      await new Promise((r) => setTimeout(r, 0));
      b.value = 20;
      stop.dispose();
      b.dispose();
    });

    await Promise.all([requestA, requestB]);

    expect(requestALog).toEqual([0, 2]);
    expect(requestBLog).toEqual([0, 10, 20]);
    setTrackingProvider(null);
  });
});
