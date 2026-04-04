/**
 * Core - Signal System Tests
 * Comprehensive tests for signals, computed, effects, watchers, and batching
 */
import { batch, computed, effect, readonly, signal, toValue, untrack, watch, writable } from '../index';

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

      count.value = untrack(() => count.value) + 1;
      expect(count.value).toBe(1);
    });

    it('should support peek without tracking', () => {
      const count = signal(0);

      expect(untrack(() => count.value)).toBe(0);
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
    it('should expose a ReadonlySignal view of the same signal', () => {
      const count = signal(5);
      const readCount = readonly(count);

      expect(readCount.value).toBe(5);
      count.value = 10;
      expect(readCount.value).toBe(10); // same underlying signal — stays in sync
    });

    it('should track changes reactively when read inside an effect', () => {
      const count = signal(5);
      const readCount = readonly(count);
      let last = -1;
      const stop = effect(() => {
        last = readCount.value;
      });

      expect(last).toBe(5);
      count.value = 99;
      expect(last).toBe(99);
      stop();
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

    it('should watch a derived signal', () => {
      const a = signal(1);
      const b = signal(2);
      const sum = computed(() => a.value + b.value);
      const values: number[] = [];
      const stop = watch(sum, (val) => values.push(val), { immediate: true });

      a.value = 10;
      b.value = 20;
      stop();
      a.value = 99;

      expect(values).toEqual([3, 12, 30]);
    });

    it('should support once for a derived signal', () => {
      const count = signal(0);
      const parity = computed(() => count.value % 2);
      const values: number[] = [];

      watch(parity, (val) => values.push(val), { immediate: true, once: true });
      count.value = 1;
      count.value = 2;

      expect(values).toEqual([0, 1]);
    });

    it('{ equals } suppresses notification for semantically equal values', () => {
      const s = signal([1, 2, 3]);
      let fires = 0;

      watch(s, () => fires++, { equals: (a, b) => a.length === b.length });
      s.value = [4, 5, 6]; // same length — suppressed
      expect(fires).toBe(0);
      s.value = [1, 2, 3, 4]; // different length — fires
      expect(fires).toBe(1);
    });
  });

  describe('batch()', () => {
    it('should batch updates', () => {
      const count = signal(0);
      let runs = 0;

      effect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
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

        return untrack(() => count.value);
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
    it('should return the same writable signal instance', () => {
      const count = signal(4);
      const writableCount = writable(count);

      expect(writableCount).toBe(count);
      expect(writableCount.value).toBe(4);
    });

    it('should allow writes through the returned signal', () => {
      const count = signal(4);
      const writableCount = writable(count);

      writableCount.value = 10;
      expect(count.value).toBe(10);
    });

    it('should stay in sync with the original signal', () => {
      const count = signal(3);
      const writableCount = writable(count);

      count.value = 5;
      expect(writableCount.value).toBe(5);

      writableCount.value = 8;
      expect(count.value).toBe(8);
    });
  });
});
