import { describe, expect, it } from 'vitest';

import { stringify } from '../stringify';

describe('stringify', () => {
  describe('primitives', () => {
    it('handles string', () => {
      expect(stringify('hello')).toBe('"hello"');
    });

    it('handles number', () => {
      expect(stringify(42)).toBe('42');
    });

    it('handles boolean', () => {
      expect(stringify(true)).toBe('true');
      expect(stringify(false)).toBe('false');
    });

    it('handles null', () => {
      expect(stringify(null)).toBe('null');
    });

    it('handles undefined', () => {
      expect(stringify(undefined)).toBe('undefined');
    });

    it('handles bigint', () => {
      expect(stringify(123n)).toBe('123n');
    });
  });

  describe('objects', () => {
    it('sorts object keys alphabetically', () => {
      expect(stringify({ a: 1, b: 2 })).toBe('{"a":1,"b":2}');
    });

    it('produces stable output for same-content objects with different key order', () => {
      const a = stringify({ a: 1, m: 5, z: 9 });
      const b = stringify({ a: 1, m: 5, z: 9 });

      expect(a).toBe(b);
    });

    it('handles empty object', () => {
      expect(stringify({})).toBe('{}');
    });

    it('omits undefined values from objects', () => {
      expect(stringify({ a: 1, b: undefined })).toBe('{"a":1}');
    });
  });

  describe('arrays', () => {
    it('preserves array order', () => {
      expect(stringify([3, 1, 2])).toBe('[3,1,2]');
    });

    it('handles empty array', () => {
      expect(stringify([])).toBe('[]');
    });

    it('handles nested arrays', () => {
      expect(stringify([[1, 2], [3]])).toBe('[[1,2],[3]]');
    });
  });

  describe('special types', () => {
    it('serializes Date to ISO string format', () => {
      const d = new Date('2024-01-01T00:00:00Z');

      expect(stringify(d)).toBe('[Date:2024-01-01T00:00:00.000Z]');
    });

    it('handles Invalid Date', () => {
      expect(stringify(new Date('bad'))).toBe('[Date:Invalid]');
    });

    it('serializes RegExp', () => {
      expect(stringify(/foo/gi)).toBe('[RegExp:foo/gi]');
    });

    it('serializes Set with sorted elements', () => {
      expect(stringify(new Set([3, 1, 2]))).toBe('[Set:1,2,3]');
    });

    it('serializes Map', () => {
      const m = new Map([
        ['b', 2],
        ['a', 1],
      ]);
      const result = stringify(m);

      expect(result).toContain('"a"=>1');
      expect(result).toContain('"b"=>2');
    });
  });

  describe('circular references', () => {
    it('handles circular reference with [Circular] sentinel', () => {
      const obj: Record<string, unknown> = { a: 1 };

      obj['self'] = obj;
      expect(stringify(obj)).toContain('[Circular]');
    });
  });

  describe('class instances', () => {
    class MyClass {
      override toString() {
        return 'MyClass';
      }
    }

    it('coerces class instances to string by default', () => {
      expect(stringify(new MyClass())).toBe('MyClass');
    });

    it('throws TypeError for class instances when onClassInstance: throw', () => {
      expect(() => stringify(new MyClass(), { onClassInstance: 'throw' })).toThrow(TypeError);
    });
  });
});
