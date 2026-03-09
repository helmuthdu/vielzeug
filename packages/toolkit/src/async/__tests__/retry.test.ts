import { retry } from '../retry';
import { sleep } from '../sleep';

vi.mock('../sleep', () => ({
  sleep: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../logger', () => ({
  Logit: {
    warn: vi.fn(),
  },
}));

describe('retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resolve if the function succeeds on the first attempt', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');
    const result = await retry(mockFn, { times: 3 });
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should retry the function until it succeeds', async () => {
    const mockFn = vi.fn().mockRejectedValueOnce(new Error('failure')).mockResolvedValueOnce('success');
    const result = await retry(mockFn, { times: 3 });
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should throw an error if all attempts fail', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('failure'));
    await expect(retry(mockFn, { times: 3 })).rejects.toThrow('failure');
    expect(mockFn).toHaveBeenCalledTimes(3); // 3 retries
  });

  it('should respect the delay between retries', async () => {
    const mockFn = vi.fn().mockRejectedValueOnce(new Error('failure')).mockResolvedValueOnce('success');
    await retry(mockFn, { delay: 500, times: 3 });
    expect(sleep).toHaveBeenCalledWith(500);
  });

  it('should apply exponential backoff', async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('failure'))
      .mockRejectedValueOnce(new Error('failure'))
      .mockResolvedValueOnce('success');
    await retry(mockFn, { backoff: 2, delay: 100, times: 3 });
    expect(sleep).toHaveBeenNthCalledWith(1, 100);
    expect(sleep).toHaveBeenNthCalledWith(2, 200);
  });

  it('should support custom backoff function', async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('failure'))
      .mockRejectedValueOnce(new Error('failure'))
      .mockResolvedValueOnce('success');

    const customBackoff = (attempt: number, delay: number) => delay + attempt * 100;

    await retry(mockFn, { backoff: customBackoff, delay: 100, times: 3 });

    // First attempt fails, delay is 100.
    // Next delay = 100 + 1*100 = 200.
    // Retry 1: sleeps 100.
    // Retry 2: sleeps 200.
    expect(sleep).toHaveBeenNthCalledWith(1, 100);
    expect(sleep).toHaveBeenNthCalledWith(2, 200);
  });

  it('should abort if the signal is aborted', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('failure'));

    const err = (await retry(mockFn, { delay: 100, signal: AbortSignal.abort(), times: 3 }).catch((e) => e)) as Error;
    expect(mockFn).not.toHaveBeenCalled();
    expect(err.name).toBe('AbortError');
  });

  it('retryDelay: uses a custom per-attempt delay function (0-based)', async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('success');
    const retryDelay = vi.fn((attempt: number) => (attempt + 1) * 100);

    await retry(mockFn, { retryDelay, times: 3 });

    expect(sleep).toHaveBeenNthCalledWith(1, 100); // attempt 0 → 100 ms
    expect(sleep).toHaveBeenNthCalledWith(2, 200); // attempt 1 → 200 ms
  });

  it('retryDelay: supersedes delay and backoff', async () => {
    const mockFn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce('ok');

    await retry(mockFn, { backoff: 10, delay: 999, retryDelay: () => 42, times: 3 });

    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(42);
  });

  it('shouldRetry: stops retrying immediately when predicate returns false', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('fatal'));

    await expect(retry(mockFn, { shouldRetry: () => false, times: 5 })).rejects.toThrow('fatal');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('shouldRetry: receives the error and 0-based failure count', async () => {
    const shouldRetry = vi.fn().mockReturnValue(true);
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('err1'))
      .mockRejectedValueOnce(new Error('err2'))
      .mockResolvedValueOnce('success');

    await retry(mockFn, { shouldRetry, times: 3 });

    expect(shouldRetry).toHaveBeenNthCalledWith(1, expect.any(Error), 0);
    expect(shouldRetry).toHaveBeenNthCalledWith(2, expect.any(Error), 1);
  });
});
