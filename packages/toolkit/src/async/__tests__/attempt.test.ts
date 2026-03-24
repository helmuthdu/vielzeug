import { attempt } from '../attempt';

describe('attempt', () => {
  it('should execute the function and return an ok result', async () => {
    const mockFn = vi.fn().mockResolvedValue(42);
    const result = await attempt(mockFn);

    expect(result.ok).toBe(true);

    if (result.ok) expect(result.value).toBe(42);

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should retry and return ok on eventual success', async () => {
    const mockFn = vi.fn().mockRejectedValueOnce(new Error('First failure')).mockResolvedValue(42);
    const result = await attempt(mockFn, { times: 2 });

    expect(result.ok).toBe(true);

    if (result.ok) expect(result.value).toBe(42);

    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should return ok: false if all attempts fail', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));
    const result = await attempt(mockFn, { times: 3 });

    expect(result.ok).toBe(false);
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should not call onError if not provided', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));
    const result = await attempt(mockFn, { times: 2 });

    expect(result.ok).toBe(false);
  });

  it('should call onError when all attempts fail', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));
    const onError = vi.fn();

    await attempt(mockFn, { onError, times: 2 });
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should return ok: false when the timeout is exceeded', async () => {
    const mockFn = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 2000)));
    const result = await attempt(mockFn, { timeout: 100, times: 1 });

    expect(result.ok).toBe(false);
  });

  it('should return ok: false and expose the thrown value as error', async () => {
    const mockFn = vi.fn(() => {
      throw 'Non-error value';
    });
    const result = await attempt(mockFn, { times: 1 });

    expect(result.ok).toBe(false);

    if (!result.ok) expect(result.error).toBe('Non-error value');
  });
});
