import { sleep } from '../../async/sleep';
import { retry } from '../retry';

vi.mock('../../async/sleep', () => ({
  sleep: vi.fn(() => Promise.resolve()),
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
    expect(sleep).toHaveBeenCalledWith(500, undefined);
  });

  it('supports per-attempt delay functions', async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('failure'))
      .mockRejectedValueOnce(new Error('failure'))
      .mockResolvedValueOnce('success');

    await retry(mockFn, { delay: (attempt) => 100 * 2 ** attempt, times: 3 });
    expect(sleep).toHaveBeenNthCalledWith(1, 100, undefined);
    expect(sleep).toHaveBeenNthCalledWith(2, 200, undefined);
  });

  it('supports custom linear delay functions', async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('failure'))
      .mockRejectedValueOnce(new Error('failure'))
      .mockResolvedValueOnce('success');

    const customDelay = (attempt: number) => 100 + attempt * 100;

    await retry(mockFn, { delay: customDelay, times: 3 });

    expect(sleep).toHaveBeenNthCalledWith(1, 100, undefined);
    expect(sleep).toHaveBeenNthCalledWith(2, 200, undefined);
  });

  it('should abort if the signal is aborted', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('failure'));

    const err = (await retry(mockFn, { delay: 100, signal: AbortSignal.abort(), times: 3 }).catch((e) => e)) as Error;

    expect(mockFn).not.toHaveBeenCalled();
    expect(err.name).toBe('AbortError');
  });

  it('delay function receives a 0-based failure count', async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('success');
    const retryDelay = vi.fn((attempt: number) => (attempt + 1) * 100);

    await retry(mockFn, { delay: retryDelay, times: 3 });

    expect(sleep).toHaveBeenNthCalledWith(1, 100, undefined); // attempt 0 → 100 ms
    expect(sleep).toHaveBeenNthCalledWith(2, 200, undefined); // attempt 1 → 200 ms
  });

  it('delay function takes precedence over static delay behavior', async () => {
    const mockFn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce('ok');

    await retry(mockFn, { delay: () => 42, times: 3 });

    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(42, undefined);
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

  it('onError is called with the final error before throwing', async () => {
    const onError = vi.fn();
    const err = new Error('final');
    const mockFn = vi.fn().mockRejectedValue(err);

    await expect(retry(mockFn, { onError, times: 3 })).rejects.toThrow('final');
    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(err);
  });

  it('onError is called when shouldRetry halts retries early', async () => {
    const onError = vi.fn();
    const err = new Error('fatal');
    const mockFn = vi.fn().mockRejectedValue(err);

    await expect(retry(mockFn, { onError, shouldRetry: () => false, times: 5 })).rejects.toThrow('fatal');
    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(err);
  });

  it('fn receives an AbortSignal when timeout is set', async () => {
    const received: AbortSignal[] = [];
    const mockFn = vi.fn().mockImplementation(async (sig?: AbortSignal) => {
      received.push(sig!);

      return 'ok';
    });

    await retry(mockFn, { timeout: 5000, times: 1 });

    expect(received).toHaveLength(1);
    expect(received[0]).toBeInstanceOf(AbortSignal);
  });

  it('fn does not receive a signal when neither timeout nor signal is set', async () => {
    const mockFn = vi.fn().mockResolvedValue('ok');

    await retry(mockFn, { times: 1 });

    expect(mockFn).toHaveBeenCalledWith(undefined);
  });
});
