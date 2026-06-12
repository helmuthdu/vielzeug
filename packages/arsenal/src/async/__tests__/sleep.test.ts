import { sleep } from '../sleep';

describe('sleep', () => {
  vi.useFakeTimers();

  it('should resolve after the specified time', async () => {
    const mockFn = vi.fn();

    const sleepPromise = sleep(1000).then(mockFn);

    // Fast-forward time
    vi.advanceTimersByTime(1000);

    await sleepPromise;

    expect(mockFn).toHaveBeenCalled();
  });

  it('should not resolve before the specified time', async () => {
    const mockFn = vi.fn();

    sleep(1000).then(mockFn);

    // Fast-forward time less than the specified duration
    vi.advanceTimersByTime(500);

    expect(mockFn).not.toHaveBeenCalled();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });
});
