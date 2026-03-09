import { attempt } from '../attempt';

describe('attempt', () => {
  it('should execute the function and return the result', async () => {
    const mockFn = vi.fn().mockResolvedValue(42);
    const result = await attempt(mockFn);
    expect(result).toBe(42);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should retry the function if it fails and return the result on success', async () => {
    const mockFn = vi.fn().mockRejectedValueOnce(new Error('First failure')).mockResolvedValue(42);
    const result = await attempt(mockFn, { retries: 1 });
    expect(result).toBe(42);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should return undefined if all retries fail', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));
    const result = await attempt(mockFn, { retries: 2 });
    expect(result).toBeUndefined();
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should not call onError if not provided', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));
    const result = await attempt(mockFn, { retries: 1 });
    expect(result).toBeUndefined();
  });

  it('should not call onError when not provided', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));
    const onError = vi.fn();
    await attempt(mockFn, { onError, retries: 1 });
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should timeout if the function takes too long', async () => {
    const mockFn = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 2000)));
    const result = await attempt(mockFn, { timeout: 1000, retries: 0 });
    expect(result).toBeUndefined();
  });

  it('should handle functions that throw non-error values', async () => {
    const mockFn = vi.fn(() => {
      throw 'Non-error value';
    });
    const result = await attempt(mockFn, { retries: 0 });
    expect(result).toBeUndefined();
  });
});
