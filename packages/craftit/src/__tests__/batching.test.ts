/**
 * Craftit - Auto-Batching Tests
 * Tests for automatic update batching and manual batch API
 */
import { batch, computed, effect, signal } from '..';

describe('Auto-Batching', () => {
  describe('Automatic Batching', () => {
    it('should auto-batch synchronous signal updates', async () => {
      const count = signal(0);
      const name = signal('Alice');
      let effectRuns = 0;

      effect(() => {
        count.value;
        name.value;
        effectRuns++;
      });

      expect(effectRuns).toBe(1);

      // Multiple synchronous updates should batch
      count.value = 1;
      name.value = 'Bob';

      // Should still be 1 because batching is automatic
      expect(effectRuns).toBe(1);

      // Wait for microtask to flush
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Now should have updated once more
      expect(effectRuns).toBe(2);
    });

    it('should batch multiple updates to same signal', async () => {
      const count = signal(0);
      let effectRuns = 0;

      effect(() => {
        count.value;
        effectRuns++;
      });

      expect(effectRuns).toBe(1);

      // Multiple updates to same signal
      count.value = 1;
      count.value = 2;
      count.value = 3;

      expect(effectRuns).toBe(1);

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Should only run once more with final value
      expect(effectRuns).toBe(2);
      expect(count.value).toBe(3);
    });

    it('should batch computed signal updates', async () => {
      const a = signal(1);
      const b = signal(2);
      const sum = computed(() => a.value + b.value);
      let effectRuns = 0;

      effect(() => {
        sum.value;
        effectRuns++;
      });

      expect(effectRuns).toBe(1);

      // Update both dependencies
      a.value = 10;
      b.value = 20;

      expect(effectRuns).toBe(1);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(effectRuns).toBe(2);
      expect(sum.value).toBe(30);
    });

    it('should handle nested effects during batching', async () => {
      const count = signal(0);
      const doubled = signal(0);
      let outerRuns = 0;
      let innerRuns = 0;

      effect(() => {
        doubled.value = count.value * 2;
        innerRuns++;
      });

      effect(() => {
        count.value;
        doubled.value;
        outerRuns++;
      });

      expect(outerRuns).toBe(1);
      expect(innerRuns).toBe(1);

      count.value = 5;

      expect(outerRuns).toBe(1);
      expect(innerRuns).toBe(1);

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Both should have run once more
      expect(outerRuns).toBe(2);
      expect(innerRuns).toBe(2);
      expect(doubled.value).toBe(10);
    });
  });

  describe('Manual batch()', () => {
    it('should batch updates within batch() call', () => {
      const count = signal(0);
      const name = signal('Alice');
      let effectRuns = 0;

      effect(() => {
        count.value;
        name.value;
        effectRuns++;
      });

      expect(effectRuns).toBe(1);

      batch(() => {
        count.value = 1;
        name.value = 'Bob';
      });

      // Should run immediately after batch
      expect(effectRuns).toBe(2);
    });

    it('should handle nested batch() calls', () => {
      const a = signal(0);
      const b = signal(0);
      const c = signal(0);
      let effectRuns = 0;

      effect(() => {
        a.value;
        b.value;
        c.value;
        effectRuns++;
      });

      expect(effectRuns).toBe(1);

      batch(() => {
        a.value = 1;

        batch(() => {
          b.value = 2;
        });

        c.value = 3;
      });

      // Should only run once for all updates
      expect(effectRuns).toBe(2);
    });

    it('should execute effects after batch completes', () => {
      const values: number[] = [];
      const count = signal(0);

      effect(() => {
        values.push(count.value);
      });

      expect(values).toEqual([0]);

      batch(() => {
        count.value = 1;
        // Effect should not run yet
        expect(values).toEqual([0]);

        count.value = 2;
        expect(values).toEqual([0]);

        count.value = 3;
        expect(values).toEqual([0]);
      });

      // Effect should run once with final value
      expect(values).toEqual([0, 3]);
    });

    it('should handle errors in batch without breaking batching', () => {
      const count = signal(0);
      let effectRuns = 0;

      effect(() => {
        count.value;
        effectRuns++;
      });

      expect(effectRuns).toBe(1);

      expect(() => {
        batch(() => {
          count.value = 1;
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      // Should still have flushed effects
      expect(effectRuns).toBe(2);
      expect(count.value).toBe(1);
    });

    it('should work with multiple separate batch calls', () => {
      const count = signal(0);
      let effectRuns = 0;

      effect(() => {
        count.value;
        effectRuns++;
      });

      expect(effectRuns).toBe(1);

      batch(() => {
        count.value = 1;
      });

      expect(effectRuns).toBe(2);

      batch(() => {
        count.value = 2;
      });

      expect(effectRuns).toBe(3);

      batch(() => {
        count.value = 3;
      });

      expect(effectRuns).toBe(4);
    });
  });

  describe('Performance Benefits', () => {
    it('should reduce effect executions with batching', async () => {
      const signals = Array.from({ length: 10 }, () => signal(0));
      let effectRuns = 0;

      effect(() => {
        signals.forEach((s) => s.value);
        effectRuns++;
      });

      expect(effectRuns).toBe(1);

      // Without batch: would run 10 times (eventually after auto-batch)
      // With auto-batch: runs once
      signals.forEach((s, i) => {
        s.value = i + 1;
      });

      expect(effectRuns).toBe(1);

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Auto-batched to single execution
      expect(effectRuns).toBe(2);
    });

    it('should batch updates in tight loops', () => {
      const count = signal(0);
      let effectRuns = 0;

      effect(() => {
        count.value;
        effectRuns++;
      });

      expect(effectRuns).toBe(1);

      batch(() => {
        for (let i = 0; i < 100; i++) {
          count.value = i;
        }
      });

      // Only one execution despite 100 updates
      expect(effectRuns).toBe(2);
      expect(count.value).toBe(99);
    });
  });

  describe('Integration with Computed', () => {
    it('should batch computed recalculations', async () => {
      const a = signal(1);
      const b = signal(2);
      const c = signal(3);

      let computeRuns = 0;
      const sum = computed(() => {
        computeRuns++;
        return a.value + b.value + c.value;
      });

      let effectRuns = 0;
      effect(() => {
        sum.value;
        effectRuns++;
      });

      expect(computeRuns).toBe(1);
      expect(effectRuns).toBe(1);

      // Update all dependencies
      a.value = 10;
      b.value = 20;
      c.value = 30;

      // Auto-batched, so no updates yet
      expect(computeRuns).toBe(1);
      expect(effectRuns).toBe(1);

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Should only recompute once
      expect(computeRuns).toBe(2);
      expect(effectRuns).toBe(2);
      expect(sum.value).toBe(60);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty batch', () => {
      const count = signal(0);
      let effectRuns = 0;

      effect(() => {
        count.value;
        effectRuns++;
      });

      expect(effectRuns).toBe(1);

      batch(() => {
        // Do nothing
      });

      // No additional runs
      expect(effectRuns).toBe(1);
    });

    it('should handle signal reads during batch', () => {
      const count = signal(0);
      const values: number[] = [];

      batch(() => {
        count.value = 1;
        values.push(count.value); // Should read new value

        count.value = 2;
        values.push(count.value); // Should read new value
      });

      expect(values).toEqual([1, 2]);
      expect(count.value).toBe(2);
    });

    it('should handle signal.update() during batch', () => {
      const count = signal(0);
      let effectRuns = 0;

      effect(() => {
        count.value;
        effectRuns++;
      });

      expect(effectRuns).toBe(1);

      batch(() => {
        count.update((n) => n + 1);
        count.update((n) => n + 1);
        count.update((n) => n + 1);
      });

      // Only one effect execution
      expect(effectRuns).toBe(2);
      expect(count.value).toBe(3);
    });
  });
});

