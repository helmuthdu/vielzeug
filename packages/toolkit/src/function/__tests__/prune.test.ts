import { describe, expect, it } from 'vitest';
import { prune } from '../prune';

describe('prune', () => {
  describe('strings', () => {
    it('should trim whitespace from strings', () => {
      expect(prune('  hello  ')).toBe('hello');
      expect(prune('  world')).toBe('world');
      expect(prune('test  ')).toBe('test');
    });

    it('should return undefined for empty or whitespace-only strings', () => {
      expect(prune('')).toBeUndefined();
      expect(prune('   ')).toBeUndefined();
      expect(prune('\t\n')).toBeUndefined();
    });
  });

  describe('arrays', () => {
    it('should remove null and undefined from arrays', () => {
      expect(prune([1, null, 2, undefined, 3])).toEqual([1, 2, 3]);
      expect(prune([null, undefined])).toBeUndefined();
    });

    it('should remove empty strings from arrays', () => {
      expect(prune([1, '', 2, '  ', 3])).toEqual([1, 2, 3]);
      expect(prune(['hello', '', 'world'])).toEqual(['hello', 'world']);
    });

    it('should trim strings in arrays', () => {
      expect(prune(['  hello  ', 'world  '])).toEqual(['hello', 'world']);
    });

    it('should remove empty arrays and objects', () => {
      expect(prune([1, [], {}, 2])).toEqual([1, 2]);
      expect(prune([[], {}])).toBeUndefined();
    });

    it('should recursively clean nested arrays', () => {
      expect(prune([1, [2, null, 3], 4])).toEqual([1, [2, 3], 4]);
      expect(prune([[null], [undefined]])).toBeUndefined();
      expect(prune([1, [2, [3, null]], 4])).toEqual([1, [2, [3]], 4]);
    });

    it('should return undefined for empty arrays', () => {
      expect(prune([])).toBeUndefined();
    });
  });

  describe('objects', () => {
    it('should remove properties with null values', () => {
      expect(prune({ a: 1, b: null, c: 2 })).toEqual({ a: 1, c: 2 });
      expect(prune({ a: null, b: null })).toBeUndefined();
    });

    it('should remove properties with undefined values', () => {
      expect(prune({ a: 1, b: undefined, c: 2 })).toEqual({ a: 1, c: 2 });
    });

    it('should remove properties with empty strings', () => {
      expect(prune({ a: 1, b: '', c: 2 })).toEqual({ a: 1, c: 2 });
      expect(prune({ a: 'hello', b: '  ', c: 'world' })).toEqual({ a: 'hello', c: 'world' });
    });

    it('should trim string values in objects', () => {
      expect(prune({ a: '  hello  ', b: 'world  ' })).toEqual({ a: 'hello', b: 'world' });
    });

    it('should remove properties with empty arrays', () => {
      expect(prune({ a: 1, b: [], c: 2 })).toEqual({ a: 1, c: 2 });
    });

    it('should remove properties with empty objects', () => {
      expect(prune({ a: 1, b: {}, c: 2 })).toEqual({ a: 1, c: 2 });
    });

    it('should recursively clean nested objects', () => {
      expect(prune({ a: 1, b: { c: null, d: 2 }, e: 3 })).toEqual({ a: 1, b: { d: 2 }, e: 3 });
      expect(prune({ a: { b: { c: null } } })).toBeUndefined();
    });

    it('should handle arrays in objects', () => {
      expect(prune({ a: [1, null, 2], b: [null] })).toEqual({ a: [1, 2] });
      expect(prune({ a: ['hello', '', 'world'] })).toEqual({ a: ['hello', 'world'] });
    });

    it('should return undefined for empty objects', () => {
      expect(prune({})).toBeUndefined();
    });
  });

  describe('complex nested structures', () => {
    it('should clean deeply nested objects and arrays', () => {
      const input = {
        a: 1,
        b: {
          c: [1, null, { d: 2, e: null }, '', 3],
          f: null,
          g: { h: '', i: 'value' },
        },
        j: [],
        k: '  trim  ',
      };

      const expected = {
        a: 1,
        b: {
          c: [1, { d: 2 }, 3],
          g: { i: 'value' },
        },
        k: 'trim',
      };

      expect(prune(input)).toEqual(expected);
    });

    it('should handle complex real-world data', () => {
      const userData = {
        address: {
          city: 'New York',
          country: null,
          street: '',
        },
        age: 30,
        email: '  alice@example.com  ',
        hobbies: ['reading', '', null, 'coding'],
        metadata: {
          created: '2024-01-01',
          notes: null,
          tags: [],
        },
        name: 'Alice',
      };

      const expected = {
        address: {
          city: 'New York',
        },
        age: 30,
        email: 'alice@example.com',
        hobbies: ['reading', 'coding'],
        metadata: {
          created: '2024-01-01',
        },
        name: 'Alice',
      };

      expect(prune(userData)).toEqual(expected);
    });
  });

  describe('primitive types', () => {
    it('should return undefined for null', () => {
      expect(prune(null)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(prune(undefined)).toBeUndefined();
    });

    it('should preserve numbers', () => {
      expect(prune(0)).toBe(0);
      expect(prune(42)).toBe(42);
      expect(prune(-5)).toBe(-5);
      expect(prune(3.14)).toBe(3.14);
    });

    it('should preserve booleans', () => {
      expect(prune(true)).toBe(true);
      expect(prune(false)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle objects with numeric keys', () => {
      expect(prune({ 0: 'a', 1: null, 2: 'c' })).toEqual({ 0: 'a', 2: 'c' });
    });

    it('should preserve zero values', () => {
      expect(prune([0, null, 1])).toEqual([0, 1]);
      expect(prune({ a: 0, b: null })).toEqual({ a: 0 });
    });

    it('should preserve false values', () => {
      expect(prune([false, null, true])).toEqual([false, true]);
      expect(prune({ a: false, b: null })).toEqual({ a: false });
    });

    it('should handle mixed types in arrays', () => {
      expect(prune([1, 'hello', true, null, { a: 1 }, [], ''])).toEqual([1, 'hello', true, { a: 1 }]);
    });
  });
});
