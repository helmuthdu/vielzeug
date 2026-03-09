/**
 * Core - Signal System Tests
 * Comprehensive tests for signals, computed, effects, watchers, and batching
 */
import { batch, computed, effect, readonly, signal, toValue, watch, writable } from '../';

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

    it('should support updating via setter', () => {
      const count = signal(0);
      count.value = count.peek() + 1;
      expect(count.value).toBe(1);
    });

    it('should support peek without tracking', () => {
      const count = signal(0);
      expect(count.peek()).toBe(0);
    });

    it('watch() stops watching after cleanup is called', () => {
      const count = signal(0);
      const values: number[] = [];
      const stop = watch(count, (val) => values.push(val));
      count.value = 1;
      count.value = 2;
      expect(values).toEqual([1, 2]);
      stop();
      count.value = 3;
      expect(values).toEqual([1, 2]);
    });

    it('watch() receives current and previous value', () => {
      const count = signal(10);
      const pairs: [number, number][] = [];
      watch(count, (next, prev) => pairs.push([next, prev]));
      count.value = 20;
      count.value = 30;
      expect(pairs).toEqual([
        [20, 10],
        [30, 20],
      ]);
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

    it('fires cb (no args) when any signal in the source array changes', () => {
      const a = signal(1);
      const b = signal(2);
      let fires = 0;
      const stop = watch([a, b], () => fires++);
      a.value = 10;
      b.value = 20;
      stop();
      a.value = 99; // after dispose — silent
      expect(fires).toBe(2);
    });

    it('array form: { immediate } fires cb on subscription', () => {
      const a = signal(1);
      const b = signal(2);
      let fires = 0;
      const stop = watch([a, b], () => fires++, { immediate: true });
      expect(fires).toBe(1); // immediate
      a.value = 10;
      stop();
      expect(fires).toBe(2);
    });

    it('array form: { once } auto-unsubscribes after the first change', () => {
      const a = signal(0);
      const b = signal(0);
      let fires = 0;
      watch([a, b], () => fires++, { once: true });
      a.value = 1;
      b.value = 1;
      a.value = 2;
      expect(fires).toBe(1);
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

    it('should return the callback return value', () => {
      const count = signal(0);
      const result = batch(() => {
        count.value = 42;
        return count.peek();
      });
      expect(result).toBe(42);
    });
  });

  describe('toValue()', () => {
    it('should unwrap a signal to its current value', () => {
      const count = signal(7);
      expect(toValue(count)).toBe(7);
    });

    it('should return a plain value unchanged', () => {
      expect(toValue(42)).toBe(42);
      expect(toValue('hello')).toBe('hello');
      expect(toValue(null)).toBe(null);
    });

    it('should track reads when called inside an effect', () => {
      const count = signal(1);
      let effectValue = -1;
      effect(() => {
        effectValue = toValue(count);
      });
      expect(effectValue).toBe(1);
      count.value = 5;
      expect(effectValue).toBe(5);
    });
  });

  describe('writable()', () => {
    it('should read from the getter reactively', () => {
      const count = signal(4);
      const doubled = writable(
        () => count.value * 2,
        (v) => (count.value = v / 2),
      );
      expect(doubled.value).toBe(8);
      count.value = 10;
      expect(doubled.value).toBe(20);
    });

    it('should forward writes to the setter', () => {
      const count = signal(4);
      const doubled = writable(
        () => count.value * 2,
        (v) => (count.value = v / 2),
      );
      doubled.value = 20;
      expect(count.value).toBe(10);
    });

    it('should keep source and derived in sync bi-directionally', () => {
      const base = signal(3);
      const tripled = writable(
        () => base.value * 3,
        (v) => (base.value = Math.round(v / 3)),
      );
      tripled.value = 30;
      expect(base.value).toBe(10);
      base.value = 5;
      expect(tripled.value).toBe(15);
    });
  });
});
