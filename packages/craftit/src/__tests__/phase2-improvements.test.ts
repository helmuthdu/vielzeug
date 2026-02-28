/**
 * Craftit - Phase 2 Improvements Tests
 * Tests for unified watch API and computed equality
 */
import { computed, deepEqual, shallowEqual, signal, watch } from '..';

describe('Unified Watch API', () => {
  describe('Single source (backward compatible)', () => {
    it('should watch single signal', () => {
      const count = signal(0);
      const values: number[] = [];

      watch(count, (newVal) => {
        values.push(newVal);
      });

      count.value = 1;
      count.value = 2;

      expect(values).toEqual([1, 2]);
    });

    it('should watch single computed', () => {
      const count = signal(0);
      const doubled = computed(() => count.value * 2);
      const values: number[] = [];

      watch(doubled, (newVal) => {
        values.push(newVal);
      });

      count.value = 1;
      count.value = 2;

      expect(values).toEqual([2, 4]);
    });

    it('should watch function', () => {
      const count = signal(0);
      const values: number[] = [];

      watch(
        () => count.value * 2,
        (newVal) => {
          values.push(newVal);
        },
      );

      count.value = 1;
      count.value = 2;

      expect(values).toEqual([2, 4]);
    });
  });

  describe('Multiple sources (new functionality)', () => {
    it('should watch multiple signals', () => {
      const count = signal(0);
      const name = signal('Alice');
      const results: Array<[number, string]> = [];

      watch([count, name], ([newCount, newName]) => {
        results.push([newCount, newName]);
      });

      count.value = 1;
      expect(results).toEqual([[1, 'Alice']]);

      name.value = 'Bob';
      expect(results).toEqual([
        [1, 'Alice'],
        [1, 'Bob'],
      ]);

      count.value = 2;
      expect(results).toEqual([
        [1, 'Alice'],
        [1, 'Bob'],
        [2, 'Bob'],
      ]);
    });

    it('should provide old values for multiple sources', () => {
      const x = signal(0);
      const y = signal(0);
      const results: Array<{ new: [number, number]; old: [number, number] }> = [];

      watch([x, y], (newVals, oldVals) => {
        results.push({ new: newVals, old: oldVals });
      });

      x.value = 1;
      expect(results[0]).toEqual({ new: [1, 0], old: [0, 0] });

      y.value = 2;
      expect(results[1]).toEqual({ new: [1, 2], old: [1, 0] });
    });

    it('should support immediate option with multiple sources', () => {
      const a = signal(1);
      const b = signal(2);
      const results: Array<[number, number]> = [];

      watch(
        [a, b],
        ([newA, newB]) => {
          results.push([newA, newB]);
        },
        { immediate: true },
      );

      expect(results).toEqual([[1, 2]]);

      a.value = 3;
      expect(results).toEqual([
        [1, 2],
        [3, 2],
      ]);
    });
  });
});

describe('Computed Equality', () => {
  describe('Default equality (Object.is)', () => {
    it('should use Object.is by default', () => {
      const count = signal(0);
      let computeCount = 0;

      const doubled = computed(() => {
        computeCount++;
        return count.value * 2;
      });

      expect(doubled.value).toBe(0);
      expect(computeCount).toBe(1);

      count.value = 0; // Same value - signal uses Object.is, won't trigger
      expect(doubled.value).toBe(0);
      expect(computeCount).toBe(1); // Doesn't recompute (signal didn't change)

      count.value = 1;
      expect(doubled.value).toBe(2);
      expect(computeCount).toBe(2);
    });
  });

  describe('Custom equality', () => {
    it('should use custom equality function', () => {
      const items = signal([1, 2, 3]);
      let computeCount = 0;

      const summary = computed(
        () => {
          computeCount++;
          return {
            count: items.value.length,
            sum: items.value.reduce((a, b) => a + b, 0),
          };
        },
        {
          equals: (a, b) => a.count === b.count && a.sum === b.sum,
        },
      );

      expect(summary.value).toEqual({ count: 3, sum: 6 });
      expect(computeCount).toBe(1);

      // Change items but keep same count and sum
      items.value = [2, 2, 2];
      expect(summary.value).toEqual({ count: 3, sum: 6 });
      // Recomputes but result is equal
      expect(computeCount).toBe(2);
    });

    it('should work with shallowEqual', () => {
      const user = signal({ name: 'Alice', age: 30 });
      let computeCount = 0;

      const userInfo = computed(
        () => {
          computeCount++;
          return { name: user.value.name, age: user.value.age };
        },
        { equals: shallowEqual },
      );

      expect(userInfo.value).toEqual({ name: 'Alice', age: 30 });
      expect(computeCount).toBe(1);

      // Same values, different object
      user.value = { name: 'Alice', age: 30 };
      expect(userInfo.value).toEqual({ name: 'Alice', age: 30 });
      expect(computeCount).toBe(2); // Recomputed but equal
    });

    it('should work with deepEqual', () => {
      const data = signal({ users: [{ name: 'Alice' }] });
      let computeCount = 0;

      const processed = computed(
        () => {
          computeCount++;
          return { users: data.value.users.map((u) => ({ name: u.name })) };
        },
        { equals: deepEqual },
      );

      expect(processed.value).toEqual({ users: [{ name: 'Alice' }] });
      expect(computeCount).toBe(1);

      // Same structure, different objects
      data.value = { users: [{ name: 'Alice' }] };
      expect(processed.value).toEqual({ users: [{ name: 'Alice' }] });
      expect(computeCount).toBe(2);
    });
  });

  describe('Array length optimization', () => {
    it('should optimize array length computation', () => {
      const items = signal([1, 2, 3]);
      let computeCount = 0;

      const count = computed(
        () => {
          computeCount++;
          return items.value.length;
        },
        { equals: Object.is }, // Primitive comparison
      );

      expect(count.value).toBe(3);
      expect(computeCount).toBe(1);

      // Different array, same length
      items.value = [4, 5, 6];
      expect(count.value).toBe(3);
      expect(computeCount).toBe(2); // Recomputes but result is equal
    });
  });
});

describe('Equality Utilities', () => {
  describe('shallowEqual', () => {
    it('should return true for same object', () => {
      const obj = { a: 1, b: 2 };
      expect(shallowEqual(obj, obj)).toBe(true);
    });

    it('should return true for shallow equal objects', () => {
      expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    });

    it('should return false for different objects', () => {
      expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
    });

    it('should return false for different keys', () => {
      expect(shallowEqual({ a: 1 }, { b: 1 })).toBe(false);
    });

    it('should not deep compare nested objects', () => {
      const obj1 = { a: { b: 1 } };
      const obj2 = { a: { b: 1 } };
      expect(shallowEqual(obj1, obj2)).toBe(false); // Different object references
    });
  });

  describe('deepEqual', () => {
    it('should return true for primitives', () => {
      expect(deepEqual(1, 1)).toBe(true);
      expect(deepEqual('hello', 'hello')).toBe(true);
      expect(deepEqual(true, true)).toBe(true);
    });

    it('should return false for different primitives', () => {
      expect(deepEqual(1, 2)).toBe(false);
      expect(deepEqual('a', 'b')).toBe(false);
    });

    it('should deep compare objects', () => {
      expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
      expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
    });

    it('should deep compare arrays', () => {
      expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    });

    it('should deep compare nested structures', () => {
      const obj1 = { users: [{ name: 'Alice', tags: ['admin'] }] };
      const obj2 = { users: [{ name: 'Alice', tags: ['admin'] }] };
      expect(deepEqual(obj1, obj2)).toBe(true);

      const obj3 = { users: [{ name: 'Alice', tags: ['user'] }] };
      expect(deepEqual(obj1, obj3)).toBe(false);
    });
  });
});

