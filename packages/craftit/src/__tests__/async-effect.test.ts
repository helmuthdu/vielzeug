/**
 * Craftit - Async Effect Tests
 * Tests for async effect functionality
 */
import { effect, signal } from '..';

describe('effect()', () => {
  it('should run async effect immediately', async () => {
    const spy = vi.fn();

    effect(async () => {
      await Promise.resolve();
      spy();
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should track dependencies', async () => {
    const count = signal(0);
    const results: number[] = [];

    effect(async () => {
      const value = count.value;
      await Promise.resolve();
      results.push(value);
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(results).toContain(0);

    count.value = 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(results).toContain(1);

    count.value = 2;
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(results).toContain(2);
  });

  it('should support cleanup function', async () => {
    const cleanupSpy = vi.fn();
    const count = signal(0);

    effect(async () => {
      void count.value; // Track dependency
      await Promise.resolve();
      return cleanupSpy;
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(cleanupSpy).not.toHaveBeenCalled();

    // Trigger re-run
    count.value++;
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(cleanupSpy).toHaveBeenCalledTimes(1);

    // Trigger another re-run
    count.value++;
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(cleanupSpy).toHaveBeenCalledTimes(2);
  });

  it('should handle disposal', async () => {
    const cleanupSpy = vi.fn();
    const spy = vi.fn();

    const dispose = effect(async () => {
      await Promise.resolve();
      spy();
      return cleanupSpy;
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(cleanupSpy).not.toHaveBeenCalled();

    dispose();

    expect(cleanupSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    effect(async () => {
      await Promise.resolve();
      throw new Error('Test error');
    });

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleErrorSpy.mock.calls[0][0]).toContain('Async effect error');

    consoleErrorSpy.mockRestore();
  });

  it('should work with fetch example', async () => {
    const userId = signal(1);
    const data = signal<any>(null);

    // Mock fetch
    globalThis.fetch = vi.fn((url) => {
      const id = url.toString().split('/').pop();
      return Promise.resolve({
        json: () => Promise.resolve({ id, name: `User ${id}` }),
      } as Response);
    });

    effect(async () => {
      const response = await fetch(`/api/users/${userId.value}`);
      data.value = await response.json();
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(data.value).toEqual({ id: '1', name: 'User 1' });

    userId.value = 2;
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(data.value).toEqual({ id: '2', name: 'User 2' });

    vi.restoreAllMocks();
  });
});






