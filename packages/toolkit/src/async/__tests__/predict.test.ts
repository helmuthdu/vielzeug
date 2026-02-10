import { predict } from '../predict';

describe('predict', () => {
  it('should resolve the promise if the function completes before the timeout', async () => {
    const mockFn = vi.fn((_signal: AbortSignal) => new Promise((resolve) => setTimeout(() => resolve('success'), 100)));

    const result = await predict(mockFn, { timeout: 500 });
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalled();
  });

  it('should reject the promise if the function exceeds the timeout', async () => {
    const mockFn = vi.fn(
      (_signal: AbortSignal) => new Promise((resolve) => setTimeout(() => resolve('success'), 1000)),
    );

    await expect(predict(mockFn, { timeout: 500 })).rejects.toThrow('Operation aborted');
    expect(mockFn).toHaveBeenCalled();
  });

  it('should reject the promise if the signal is aborted', async () => {
    const controller = new AbortController();
    const mockFn = vi.fn(
      (_signal: AbortSignal) => new Promise((resolve) => setTimeout(() => resolve('success'), 1000)),
    );

    setTimeout(() => controller.abort(), 100);

    await expect(predict(mockFn, { signal: controller.signal, timeout: 500 })).rejects.toThrow('Operation aborted');
    expect(mockFn).toHaveBeenCalled();
  });
});
