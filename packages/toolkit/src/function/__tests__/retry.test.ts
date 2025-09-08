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

  it('should abort if the signal is aborted', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('failure'));

    await expect(retry(mockFn, { delay: 100, signal: AbortSignal.abort(), times: 3 })).rejects.toThrow('Retry aborted');
    expect(mockFn).not.toHaveBeenCalled();
  });
});
