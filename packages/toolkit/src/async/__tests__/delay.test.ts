import { delay } from '../delay';

describe('delay', () => {
  vi.useFakeTimers();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delay the execution of the function by the specified time', async () => {
    const mockFn = vi.fn();
    const promise = delay(mockFn, 1000);

    // Fast-forward time
    vi.advanceTimersByTime(1000);

    await promise;

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should use the default delay of 700ms if no time is specified', async () => {
    const mockFn = vi.fn();
    const promise = delay(mockFn);

    // Fast-forward time
    vi.advanceTimersByTime(700);

    await promise;

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should return the result of the function execution', async () => {
    const mockFn = vi.fn(() => 'result');
    const result = delay(mockFn, 500);

    // Fast-forward time
    vi.advanceTimersByTime(500);

    expect(await result).toBe('result');
  });
});
