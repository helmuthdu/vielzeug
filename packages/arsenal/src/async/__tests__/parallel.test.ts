import { parallel } from '../parallel';

describe('parallel', () => {
  describe('basic functionality', () => {
    it('should process all items and return ordered results', async () => {
      const input = [1, 2, 3, 4, 5];
      const results = await parallel(input, async (n) => n * 2, { limit: 2 });

      expect(results).toEqual([2, 4, 6, 8, 10]);
    });

    it('should maintain order regardless of completion time', async () => {
      const delays = [50, 10, 30, 5, 20];
      const results = await parallel(
        delays,
        async (delay, index) => {
          await new Promise((resolve) => setTimeout(resolve, delay));

          return index;
        },
        { limit: 3 },
      );

      expect(results).toEqual([0, 1, 2, 3, 4]);
    });

    it('should work with empty array', async () => {
      const results = await parallel([], async (n) => n, { limit: 2 });

      expect(results).toEqual([]);
    });

    it('should work with single item', async () => {
      const results = await parallel([42], async (n) => n * 2, { limit: 2 });

      expect(results).toEqual([84]);
    });
  });

  describe('parallelism control', () => {
    it('should respect concurrency limit', async () => {
      let concurrentCount = 0;
      let maxConcurrent = 0;

      const results = await parallel(
        [1, 2, 3, 4, 5],
        async (n) => {
          concurrentCount++;
          maxConcurrent = Math.max(maxConcurrent, concurrentCount);

          await new Promise((resolve) => setTimeout(resolve, 10));

          concurrentCount--;

          return n;
        },
        { limit: 2 },
      );

      expect(maxConcurrent).toBe(2);
      expect(results).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle limit of 1 (sequential)', async () => {
      const order: number[] = [];

      await parallel(
        [1, 2, 3],
        async (n) => {
          order.push(n);
          await new Promise((resolve) => setTimeout(resolve, 10));

          return n;
        },
        { limit: 1 },
      );

      expect(order).toEqual([1, 2, 3]);
    });

    it('should handle limit greater than array length', async () => {
      const input = [1, 2, 3];
      const results = await parallel(input, async (n) => n * 2, { limit: 10 });

      expect(results).toEqual([2, 4, 6]);
    });

    it('should default to unbounded parallelism', async () => {
      let maxConcurrent = 0;
      let concurrent = 0;

      await parallel([1, 2, 3, 4, 5], async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((r) => setTimeout(r, 10));
        concurrent--;
      });

      expect(maxConcurrent).toBe(5);
    });
  });

  describe('error handling', () => {
    it('should throw if limit is less than 1', async () => {
      await expect(parallel([1, 2, 3], async (n) => n, { limit: 0 })).rejects.toThrow(
        'parallel: limit must be at least 1, got 0',
      );
    });

    it('should propagate errors from the callback', async () => {
      await expect(
        parallel([1, 2, 3], async (n) => {
          if (n === 2) throw new Error('Error on 2');

          return n;
        }),
      ).rejects.toThrow('Error on 2');
    });

    it('should abort if the signal is aborted before starting', async () => {
      const controller = new AbortController();

      controller.abort();

      await expect(parallel([1, 2, 3], async (n) => n, { signal: controller.signal })).rejects.toThrow();
    });

    it('should abort mid-flight', async () => {
      const controller = new AbortController();
      let processed = 0;

      const promise = parallel(
        [1, 2, 3, 4, 5],
        async (n) => {
          processed++;

          if (processed === 2) {
            controller.abort();
          }

          await new Promise((resolve) => setTimeout(resolve, 20));

          return n;
        },
        { limit: 1, signal: controller.signal },
      );

      await expect(promise).rejects.toThrow();
    });
  });

  describe('abortOnError', () => {
    it('stops picking up new items in other workers once one callback throws', async () => {
      const started: number[] = [];
      let resolveBlocker!: () => void;

      const promise = parallel(
        [1, 2, 3, 4, 5, 6],
        async (n) => {
          started.push(n);

          if (n === 2) {
            throw new Error('boom');
          }

          if (n === 1) {
            // Keep worker A busy until after worker B has thrown, so we can observe that
            // worker A picks up no further items once abortOnError kicks in.
            await new Promise<void>((r) => (resolveBlocker = r));
          }

          return n;
        },
        { abortOnError: true, limit: 2 },
      );

      // Both workers have already synchronously grabbed their first item (and worker B has
      // already thrown) by this point — release worker A's blocker so it can observe the abort.
      resolveBlocker();

      await expect(promise).rejects.toThrow('boom');

      // Only the first two items (one per worker) should ever have started.
      expect(started).toEqual([1, 2]);
    });

    it('does not change behavior when abortOnError is false (default)', async () => {
      const started: number[] = [];

      const promise = parallel(
        [1, 2, 3, 4],
        async (n) => {
          started.push(n);

          if (n === 1) throw new Error('boom');

          return n;
        },
        { limit: 1 },
      );

      await expect(promise).rejects.toThrow('boom');

      // Without abortOnError, subsequent workers are unaffected by an earlier item's failure —
      // this test uses limit: 1 (sequential) so the throw itself stops the single worker's loop,
      // matching pre-existing behavior.
      expect(started).toEqual([1]);
    });
  });
});
