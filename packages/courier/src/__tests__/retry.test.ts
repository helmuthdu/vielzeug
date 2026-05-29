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

  it('keeps jitter behavior at high retry counts instead of collapsing to a fixed cap', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const startIndex = timeoutSpy.mock.calls.length;
    let calls = 0;

    const promise = runWithRetry(
      async () => {
        if (++calls < 7) {
          throw new Error('retryable');
        }

        return 'ok';
      },
      7,
      undefined,
      () => true,
    );

    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe('ok');

    const retryDelays = timeoutSpy.mock.calls
      .slice(startIndex)
      .map((call) => call[1])
      .filter((value): value is number => typeof value === 'number');

    expect(retryDelays).toEqual([0, 0, 0, 0, 0, 0]);
  });
});
