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

  it('rejects immediately when the signal is already aborted', async () => {
    const controller = new AbortController();

    controller.abort();

    const promise = sleep(1000, controller.signal);

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejects and clears the pending timer when aborted mid-flight', async () => {
    const controller = new AbortController();
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');

    const promise = sleep(1000, controller.signal);

    vi.advanceTimersByTime(500);
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(clearSpy).toHaveBeenCalled();

    // The timer must actually be cleared — advancing past the original delay must not
    // trigger any further (unobserved) resolution work.
    vi.advanceTimersByTime(1000);
    clearSpy.mockRestore();
  });

  it('removes its abort listener once the sleep resolves normally', async () => {
    const controller = new AbortController();
    const removeSpy = vi.spyOn(controller.signal, 'removeEventListener');

    const promise = sleep(1000, controller.signal);

    vi.advanceTimersByTime(1000);
    await promise;

    expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  afterEach(() => {
    vi.clearAllTimers();
  });
});
