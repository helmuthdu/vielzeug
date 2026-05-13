import { runWithRetry } from '../retry';

describe('runWithRetry', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('aborts while waiting between retries', async () => {
    vi.useFakeTimers();

    const ac = new AbortController();
    let calls = 0;

    const promise = runWithRetry(
      async () => {
        calls++;
        throw new Error('retryable');
      },
      3,
      10_000,
      () => true,
      ac.signal,
    );
    const assertion = expect(promise).rejects.toMatchObject({ name: 'AbortError' });

    await vi.advanceTimersByTimeAsync(5);
    ac.abort();
    await vi.runOnlyPendingTimersAsync();

    await assertion;
    expect(calls).toBe(1);
  });
});
