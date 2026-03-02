/**
 * Core - Signal System Tests
 * Comprehensive tests for signals, computed, effects, watchers, and batching
 */
import { batch, computed, effect, readonly, signal, watch } from '../';

describe('Core: Signal System', () => {
  describe('signal()', () => {
    it('should create signal with initial value', () => {
      const count = signal(0);
      expect(count.value).toBe(0);
    });

    it('should update value', () => {
      const count = signal(0);
      count.value = 5;
      expect(count.value).toBe(5);
    });

    it('should support update function', () => {
      const count = signal(0);
      count.update((n) => n + 1);
      expect(count.value).toBe(1);
    });

    it('should support peek without tracking', () => {
      const count = signal(0);
      expect(count.peek()).toBe(0);
    });
  });

  describe('computed()', () => {
    it('should compute derived value', () => {
      const count = signal(5);
      const doubled = computed(() => count.value * 2);
      expect(doubled.value).toBe(10);
    });

    it('should update when dependency changes', () => {
      const count = signal(5);
      const doubled = computed(() => count.value * 2);
      count.value = 10;
      expect(doubled.value).toBe(20);
    });

    it('should cache value', () => {
      let computeCount = 0;
      const count = signal(5);
      const doubled = computed(() => {
        computeCount++;
        return count.value * 2;
      });

      expect(doubled.value).toBe(10);
      expect(doubled.value).toBe(10);
      expect(computeCount).toBe(1);
    });
  });

  describe('readonly()', () => {
    it('should create readonly signal', () => {
      const count = signal(5);
      const readCount = readonly(count);
      expect(readCount.value).toBe(5);
    });

    it('should throw on write', () => {
      const count = signal(5);
      const readCount = readonly(count);
      expect(() => {
        // Type assertion to bypass readonly for testing error case
        (readCount as { value: number }).value = 10;
      }).toThrow();
    });
  });

  describe('effect()', () => {
    it('should run immediately', () => {
      let ran = false;
      effect(() => {
        ran = true;
      });
      expect(ran).toBe(true);
    });

    it('should track dependencies', () => {
      const count = signal(0);
      let effectValue = -1;
      effect(() => {
        effectValue = count.value;
      });
      expect(effectValue).toBe(0);
      count.value = 5;
      expect(effectValue).toBe(5);
    });

    it('should support cleanup', () => {
      let cleanupRan = false;
      const dispose = effect(() => {
        return () => {
          cleanupRan = true;
        };
      });
      dispose();
      expect(cleanupRan).toBe(true);
    });
  });

  describe('watch()', () => {
    it('should watch signal changes', async () => {
      const count = signal(0);
      const values: number[] = [];
      watch(count, (val) => values.push(val));
      count.value = 1;
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(values).toContain(1);
    });

    it('should support immediate', () => {
      const count = signal(5);
      const values: number[] = [];
      watch(count, (val) => values.push(val), { immediate: true });
      expect(values).toEqual([5]);
    });

    it('should watch multiple signals', async () => {
      const a = signal(1);
      const b = signal(2);
      const results: number[][] = [];
      watch([a, b], (values) => results.push([...values]));
      a.value = 10;
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(results[0]).toEqual([10, 2]);
    });
  });

  describe('batch()', () => {
    it('should batch updates', () => {
      const count = signal(0);
      let runs = 0;
      effect(() => {
        count.value;
        runs++;
      });
      batch(() => {
        count.value = 1;
        count.value = 2;
      });
      expect(runs).toBe(2);
    });
  });
});
