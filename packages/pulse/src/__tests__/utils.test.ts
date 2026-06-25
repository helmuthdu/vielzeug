import { combineSignals, defaultReconnectDelay, sleep } from '../_utils';

describe('combineSignals', () => {
  it('returns the same signal when given only one', () => {
    const ctrl = new AbortController();

    expect(combineSignals(ctrl.signal)).toBe(ctrl.signal);
  });

  it('returns an already-aborted signal when the first is aborted', () => {
    const a = AbortSignal.abort('reason-a');
    const b = new AbortController().signal;

    expect(combineSignals(a, b).aborted).toBe(true);
  });

  it('aborts the combined signal when the first aborts', () => {
    const a = new AbortController();
    const b = new AbortController();
    const combined = combineSignals(a.signal, b.signal);

    a.abort('a-reason');

    expect(combined.aborted).toBe(true);
  });

  it('aborts the combined signal when the second aborts', () => {
    const a = new AbortController();
    const b = new AbortController();
    const combined = combineSignals(a.signal, b.signal);

    b.abort('b-reason');

    expect(combined.aborted).toBe(true);
  });

  it('works with more than two signals', () => {
    const a = new AbortController();
    const b = new AbortController();
    const c = new AbortController();
    const combined = combineSignals(a.signal, b.signal, c.signal);

    c.abort();

    expect(combined.aborted).toBe(true);
  });
});

describe('sleep', () => {
  it('resolves after the specified delay', async () => {
    vi.useFakeTimers();

    const p = sleep(100);

    vi.advanceTimersByTime(100);

    await expect(p).resolves.toBeUndefined();

    vi.useRealTimers();
  });

  it('resolves immediately when signal is pre-aborted', async () => {
    const signal = AbortSignal.abort();
    const p = sleep(10_000, signal);

    await expect(p).resolves.toBeUndefined();
  });

  it('resolves early when signal aborts before timeout', async () => {
    vi.useFakeTimers();

    const ctrl = new AbortController();
    const p = sleep(10_000, ctrl.signal);

    ctrl.abort();

    await expect(p).resolves.toBeUndefined();

    vi.useRealTimers();
  });
});

describe('defaultReconnectDelay', () => {
  it('returns a number', () => {
    expect(typeof defaultReconnectDelay(0)).toBe('number');
  });

  it('returns 0 or more', () => {
    expect(defaultReconnectDelay(0)).toBeGreaterThanOrEqual(0);
  });

  it('never exceeds maxMs', () => {
    for (let i = 0; i < 20; i++) {
      expect(defaultReconnectDelay(i, 5000)).toBeLessThanOrEqual(5000);
    }
  });
});
