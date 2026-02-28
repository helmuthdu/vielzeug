/**
 * Test merged effect() function
 */
import { effect, signal } from '..';

describe('Merged effect()', () => {
  describe('Sync effects', () => {
    it('should work with sync functions', () => {
      const count = signal(0);
      let result = 0;

      effect(() => {
        result = count.value * 2;
      });

      expect(result).toBe(0);

      count.value = 5;
      expect(result).toBe(10);
    });

    it('should return cleanup from sync effect', () => {
      const cleanupSpy = vi.fn();

      const dispose = effect(() => {
        return cleanupSpy;
      });

      dispose();
      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('Async effects', () => {
    it('should work with async functions', async () => {
      const count = signal(0);
      const results: number[] = [];

      effect(async () => {
        const value = count.value;
        await Promise.resolve();
        results.push(value);
      });

      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(results).toContain(0);

      count.value = 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(results).toContain(1);
    });

    it('should handle async cleanup', async () => {
      const cleanupSpy = vi.fn();

      const dispose = effect(async () => {
        await Promise.resolve();
        return cleanupSpy;
      });

      await new Promise((resolve) => setTimeout(resolve, 20));

      dispose();
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should handle async errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      effect(async () => {
        await Promise.resolve();
        throw new Error('Test error');
      });

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Auto-detection', () => {
    it('should auto-detect sync functions', () => {
      let runs = 0;

      effect(() => {
        runs++;
      });

      expect(runs).toBe(1);
    });

    it('should auto-detect async functions', async () => {
      let runs = 0;

      effect(async () => {
        runs++; // Runs immediately (sync until first await)
        await Promise.resolve();
        runs++; // Runs after await
      });

      // First increment happens immediately (before await)
      expect(runs).toBe(1);

      await new Promise((resolve) => setTimeout(resolve, 20));
      // Second increment happens after await
      expect(runs).toBe(2);
    });
  });
});

