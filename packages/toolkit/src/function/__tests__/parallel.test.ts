import { describe, expect, it, vi } from 'vitest';
import { parallel } from '../parallel';

describe('parallel', () => {
  describe('basic functionality', () => {
    it('should process all items and return ordered results', async () => {
      const input = [1, 2, 3, 4, 5];
      const results = await parallel(2, input, async (n) => n * 2);

      expect(results).toEqual([2, 4, 6, 8, 10]);
    });

    it('should maintain order regardless of completion time', async () => {
      const delays = [50, 10, 30, 5, 20];
      const results = await parallel(3, delays, async (delay, index) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        return index;
      });

      expect(results).toEqual([0, 1, 2, 3, 4]);
    });

    it('should work with empty array', async () => {
      const results = await parallel(2, [], async (n) => n);
      expect(results).toEqual([]);
    });

    it('should work with single item', async () => {
      const results = await parallel(2, [42], async (n) => n * 2);
      expect(results).toEqual([84]);
    });
  });

  describe('parallelism control', () => {
    it('should respect concurrency limit', async () => {
      let concurrentCount = 0;
      let maxConcurrent = 0;

      const results = await parallel(2, [1, 2, 3, 4, 5], async (n) => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);

        await new Promise(resolve => setTimeout(resolve, 10));

        concurrentCount--;
        return n;
      });

      expect(maxConcurrent).toBe(2);
      expect(results).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle limit of 1 (sequential)', async () => {
      const order: number[] = [];

      await parallel(1, [1, 2, 3], async (n) => {
        order.push(n);
        await new Promise(resolve => setTimeout(resolve, 10));
        return n;
      });

      expect(order).toEqual([1, 2, 3]);
    });

    it('should handle limit greater than array length', async () => {
      const input = [1, 2, 3];
      const results = await parallel(10, input, async (n) => n * 2);

      expect(results).toEqual([2, 4, 6]);
    });
  });

  describe('callback parameters', () => {
    it('should pass item, index, and array to callback', async () => {
      const input = ['a', 'b', 'c'];
      const calls: Array<[string, number, string[]]> = [];

      await parallel(2, input, async (item, index, array) => {
        calls.push([item, index, array]);
        return item;
      });

      expect(calls).toEqual([
        ['a', 0, input],
        ['b', 1, input],
        ['c', 2, input],
      ]);
    });
  });

  describe('error handling', () => {
    it('should throw error if limit is less than 1', async () => {
      await expect(
        parallel(0, [1, 2, 3], async (n) => n)
      ).rejects.toThrow('Limit must be at least 1');

      await expect(
        parallel(-1, [1, 2, 3], async (n) => n)
      ).rejects.toThrow('Limit must be at least 1');
    });

    it('should propagate errors from callback', async () => {
      await expect(
        parallel(2, [1, 2, 3], async (n) => {
          if (n === 2) {
            throw new Error('Test error');
          }
          return n;
        })
      ).rejects.toThrow('Test error');
    });

    it('should stop processing after first error', async () => {
      const processed: number[] = [];

      await expect(
        parallel(2, [1, 2, 3, 4, 5], async (n) => {
          processed.push(n);
          await new Promise(resolve => setTimeout(resolve, 10));
          if (n === 3) {
            throw new Error('Error at 3');
          }
          return n;
        })
      ).rejects.toThrow('Error at 3');

      // Should not process all items after error
      expect(processed.length).toBeLessThan(5);
    });
  });

  describe('abort signal', () => {
    it('should abort if signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        parallel(2, [1, 2, 3], async (n) => n, controller.signal)
      ).rejects.toThrow('Aborted');
    });

    it('should abort processing when signal is triggered', async () => {
      const controller = new AbortController();
      const processed: number[] = [];

      setTimeout(() => controller.abort(), 25);

      await expect(
        parallel(2, [1, 2, 3, 4, 5], async (n) => {
          processed.push(n);
          await new Promise(resolve => setTimeout(resolve, 20));
          return n;
        }, controller.signal)
      ).rejects.toThrow('Aborted');

      // Should not process all items
      expect(processed.length).toBeLessThan(5);
    });

    it('should complete successfully if not aborted', async () => {
      const controller = new AbortController();

      const results = await parallel(
        2,
        [1, 2, 3],
        async (n) => n * 2,
        controller.signal
      );

      expect(results).toEqual([2, 4, 6]);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle async API calls with rate limiting', async () => {
      const urls = ['url1', 'url2', 'url3', 'url4', 'url5'];
      const fetchMock = vi.fn(async (url: string) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return `data-${url}`;
      });

      const results = await parallel(2, urls, fetchMock);

      expect(results).toEqual([
        'data-url1',
        'data-url2',
        'data-url3',
        'data-url4',
        'data-url5',
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(5);
    });

    it('should process large array efficiently', async () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      const startTime = Date.now();

      const results = await parallel(10, items, async (n) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return n * 2;
      });

      const duration = Date.now() - startTime;

      expect(results.length).toBe(100);
      expect(results[0]).toBe(0);
      expect(results[99]).toBe(198);

      // With limit of 10, should take roughly 50ms (100 items / 10 parallel * 5ms)
      // Allow some buffer for overhead
      expect(duration).toBeLessThan(100);
    });

    it('should handle mixed success and failure scenarios', async () => {
      const items = [1, 2, 3, 4, 5];

      await expect(
        parallel(2, items, async (n) => {
          await new Promise(resolve => setTimeout(resolve, 5));
          if (n === 4) {
            throw new Error('Failed at 4');
          }
          return n * 2;
        })
      ).rejects.toThrow('Failed at 4');
    });
  });
});
