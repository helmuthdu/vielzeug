import { describe, expect, it } from 'vitest';

import { hash } from '../hash';

describe('hash', () => {
  describe('primitives', () => {
    it('handles string', () => {
      expect(hash('hello')).toBe('"hello"');
    });

    it('handles number', () => {
      expect(hash(42)).toBe('42');
    });

    it('handles boolean', () => {
      expect(hash(true)).toBe('true');
      expect(hash(false)).toBe('false');
    });

    it('handles null', () => {
      expect(hash(null)).toBe('null');
    });

    it('handles undefined', () => {
      expect(hash(undefined)).toBe('undefined');
    });

    it('handles bigint', () => {
      expect(hash(123n)).toBe('123n');
    });
  });

  describe('objects', () => {
    it('sorts object keys alphabetically', () => {
      expect(hash({ a: 1, b: 2 })).toBe('{"a":1,"b":2}');
    });

    it('produces stable output for same-content objects with different key order', () => {
      const a = hash({ a: 1, m: 5, z: 9 });
      const b = hash({ a: 1, m: 5, z: 9 });

      expect(a).toBe(b);
    });

    it('handles empty object', () => {
      expect(hash({})).toBe('{}');
    });

    it('omits undefined values from objects', () => {
      expect(hash({ a: 1, b: undefined })).toBe('{"a":1}');
    });
  });

  describe('arrays', () => {
    it('preserves array order', () => {
      expect(hash([3, 1, 2])).toBe('[3,1,2]');
    });

    it('handles empty array', () => {
      expect(hash([])).toBe('[]');
    });

    it('handles nested arrays', () => {
      expect(hash([[1, 2], [3]])).toBe('[[1,2],[3]]');
    });
  });

  describe('special types', () => {
    it('serializes Date to ISO string format', () => {
      const d = new Date('2024-01-01T00:00:00Z');

      expect(hash(d)).toBe('[Date:2024-01-01T00:00:00.000Z]');
    });

    it('handles Invalid Date', () => {
      expect(hash(new Date('bad'))).toBe('[Date:Invalid]');
    });

    it('serializes RegExp', () => {
      expect(hash(/foo/gi)).toBe('[RegExp:foo/gi]');
    });

    it('serializes Set with sorted elements', () => {
      expect(hash(new Set([3, 1, 2]))).toBe('[Set:1,2,3]');
    });

    it('serializes Map', () => {
      const m = new Map([
        ['b', 2],
        ['a', 1],
      ]);
      const result = hash(m);

      expect(result).toContain('"a"=>1');
      expect(result).toContain('"b"=>2');
    });
  });

  describe('circular references', () => {
    it('handles circular reference with [Circular] sentinel', () => {
      const obj: Record<string, unknown> = { a: 1 };

      obj['self'] = obj;
      expect(hash(obj)).toContain('[Circular]');
    });
  });

  describe('class instances', () => {
    class MyClass {
      override toString() {
        return 'MyClass';
      }
    }

    it('coerces class instances to string by default', () => {
      expect(hash(new MyClass())).toBe('MyClass');
    });

    it('throws TypeError for class instances when onClassInstance: throw', () => {
      expect(() => hash(new MyClass(), { onClassInstance: 'throw' })).toThrow(TypeError);
    });
  });
});
