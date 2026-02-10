import { Logit } from '@vielzeug/logit';
import { attempt } from '../attempt';

vi.mock('@vielzeug/logit', () => ({
  Logit: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('attempt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('should log an error if no error handler is provided and silent is false', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));
    await attempt(mockFn, { retries: 1, silent: false });
    expect(Logit.error).toHaveBeenCalledTimes(1);
    expect(Logit.error).toHaveBeenCalledWith(
      expect.stringContaining('all attempts failed'),
      expect.objectContaining({ cause: expect.any(Error) }),
    );
  });

  it('should not log an error if silent is true', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));
    await attempt(mockFn, { retries: 1, silent: true });
    expect(Logit.error).not.toHaveBeenCalled();
  });

  it('should timeout if the function takes too long', async () => {
    const mockFn = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 2000)));
    const result = await attempt(mockFn, { timeout: 1000 });
    expect(result).toBeUndefined();
    expect(Logit.error).toHaveBeenCalledWith(
      expect.stringContaining('all attempts failed'),
      expect.objectContaining({ cause: expect.anything() }),
    );
  });

  it('should use the identifier in logs if provided', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));
    await attempt(mockFn, { identifier: 'testFunction', retries: 1 });
    expect(Logit.error).toHaveBeenCalledWith(expect.stringContaining('attempt(testFunction)'), expect.any(Object));
  });

  it('should handle functions that throw non-error values', async () => {
    const mockFn = vi.fn(() => {
      throw 'Non-error value';
    });
    const result = await attempt(mockFn);
    expect(result).toBeUndefined();
    expect(Logit.error).toHaveBeenCalledWith(
      expect.stringContaining('all attempts failed'),
      expect.objectContaining({
        cause: expect.stringContaining('Non-error value'),
      }),
    );
  });
});
