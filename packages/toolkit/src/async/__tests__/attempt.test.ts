import { attempt } from '../attempt';

describe('attempt', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('should log an error if no error handler is provided', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));
    await attempt(mockFn, { retries: 1 });
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('all attempts failed'),
      expect.objectContaining({ cause: expect.any(Error) }),
    );
  });

  it('should not log if onError is provided', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));
    const onError = vi.fn();
    await attempt(mockFn, { onError, retries: 1 });
    expect(console.error).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should timeout if the function takes too long', async () => {
    const mockFn = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 2000)));
    const result = await attempt(mockFn, { timeout: 1000 });
    expect(result).toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('all attempts failed'),
      expect.objectContaining({ cause: expect.anything() }),
    );
  });

  it('should use the identifier in logs if provided', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));
    await attempt(mockFn, { identifier: 'testFunction', retries: 1 });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('attempt(testFunction)'), expect.any(Object));
  });

  it('should handle functions that throw non-error values', async () => {
    const mockFn = vi.fn(() => {
      throw 'Non-error value';
    });
    const result = await attempt(mockFn);
    expect(result).toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('all attempts failed'),
      expect.objectContaining({
        cause: expect.stringContaining('Non-error value'),
      }),
    );
  });
});
