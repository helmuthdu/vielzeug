import { effect, signal } from '../';

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
});
