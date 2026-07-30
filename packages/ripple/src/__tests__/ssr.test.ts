import { batch, effect, signal } from '../';
import { getExecutionContext } from '../execution-context';

describe('ssr — runWithProvider()', () => {
  it('runs fn synchronously and returns its result directly (no await required)', async () => {
    const { createAsyncProvider, runWithProvider } = await import('../ssr');
    const provider = createAsyncProvider();

    const result = runWithProvider(provider, () => 'sync-result');

    expect(result).toBe('sync-result');
  });

  it('isolates tracking — reads inside fn do not register deps on an effect created outside it', async () => {
    const { createAsyncProvider, runWithProvider } = await import('../ssr');
    const provider = createAsyncProvider();
    const n = signal(0);
    let effectRuns = 0;
    const stop = effect(() => {
      effectRuns++;
      void n.value;
    });
    const runsBefore = effectRuns;

    await runWithProvider(provider, async () => {
      void n.value;
    });
    n.value = 1;
    expect(effectRuns).toBe(runsBefore + 1);
    stop.dispose();
    n.dispose();
  });

  it('restores the previously installed hook once an async fn settles — not before', async () => {
    const { createAsyncProvider, runWithProvider } = await import('../ssr');
    const outer = createAsyncProvider();
    const inner = createAsyncProvider();

    await runWithProvider(outer, async () => {
      const outerScheduling = getExecutionContext().scheduling;

      await runWithProvider(inner, async () => {
        // Inner's own fresh context, not outer's — identity differs.
        expect(getExecutionContext().scheduling).not.toBe(outerScheduling);
      });

      // Back inside outer's call after inner settled — outer's hook (and the same
      // per-request context outer started with) must be active again here.
      expect(getExecutionContext().scheduling).toBe(outerScheduling);
    });
  });

  it('restores the previous hook even when fn throws synchronously', async () => {
    const { createAsyncProvider, runWithProvider } = await import('../ssr');
    const provider = createAsyncProvider();

    expect(() =>
      runWithProvider(provider, () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');

    // A second call must still work — the failed call didn't leave a stale hook installed.
    const result = runWithProvider(provider, () => 'recovered');

    expect(result).toBe('recovered');
  });

  it('restores the previous hook even when an async fn rejects', async () => {
    const { createAsyncProvider, runWithProvider } = await import('../ssr');
    const provider = createAsyncProvider();

    await expect(
      runWithProvider(provider, async () => {
        throw new Error('async boom');
      }),
    ).rejects.toThrow('async boom');

    const result = await runWithProvider(provider, async () => 'recovered');

    expect(result).toBe('recovered');
  });

  it('concurrent requests sharing one provider each get a fresh, independent scheduling context', async () => {
    const { createAsyncProvider, runWithProvider } = await import('../ssr');
    const provider = createAsyncProvider();

    // Two "requests" interleaved via awaits, each opening its own batch() around a write
    // to its own signal — verifies runWithProvider() gives each call its own SchedulingState
    // (see ssr/index.ts's freshRequestContext()) with no crashes or unexpected coalescing
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
  });
});
