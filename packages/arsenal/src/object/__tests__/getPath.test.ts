import { describe, expect, it } from 'vitest';

import { getPath } from '../getPath';

const obj = { a: { b: { c: 3 } }, d: [1, 2, 3], e: 0, f: false };

describe('getPath', () => {
  describe('basic resolution', () => {
    it('resolves a shallow path', () => {
      expect(getPath({ x: 1 }, 'x')).toBe(1);
    });

    it('resolves a deep dot-notation path', () => {
      expect(getPath(obj, 'a.b.c')).toBe(3);
    });

    it('returns undefined for missing path', () => {
      expect(getPath(obj, 'a.b.x')).toBeUndefined();
    });

    it('returns undefined for partially missing path', () => {
      expect(getPath(obj, 'z.y.x')).toBeUndefined();
    });

    it('resolves falsy but defined values (0, false)', () => {
      expect(getPath(obj, 'e')).toBe(0);
      expect(getPath(obj, 'f')).toBe(false);
    });
  });

  describe('bracket notation', () => {
    it('converts bracket notation to dot notation by default', () => {
      expect(getPath(obj, 'd[1]')).toBe(2);
    });

    it('throws TypeError when bracketNotation: false and bracket syntax used', () => {
      expect(() => getPath(obj, 'd[1]', { bracketNotation: false })).toThrow(TypeError);
    });

    it('does not throw with bracketNotation: false and no brackets', () => {
      expect(getPath(obj, 'a.b.c', { bracketNotation: false })).toBe(3);
    });
  });

  describe('fallback option', () => {
    it('returns fallback when path is missing', () => {
      expect(getPath(obj, 'a.b.x', { fallback: 'fallback' })).toBe('fallback');
    });

    it('returns fallback when path resolves through null', () => {
      expect(getPath({ a: null }, 'a.b', { fallback: 42 })).toBe(42);
    });

    it('does not return fallback when path resolves to a defined value', () => {
      expect(getPath(obj, 'a.b.c', { fallback: 99 })).toBe(3);
    });

    it('returns fallback for empty path result (undefined value)', () => {
      expect(getPath({ x: undefined }, 'x', { fallback: 5 })).toBe(5);
    });
  });

  describe('strict mode', () => {
    it('throws Error when strict: true and path is missing', () => {
      expect(() => getPath(obj, 'a.b.x', { strict: true })).toThrow(Error);
    });

    it('throws Error when strict: true and intermediate segment is missing', () => {
      expect(() => getPath(obj, 'z.y', { strict: true })).toThrow(Error);
    });

    it('strict takes precedence over fallback', () => {
      expect(() => getPath(obj, 'a.b.x', { fallback: 'fb', strict: true })).toThrow(Error);
    });

    it('does not throw when strict: true and path exists', () => {
      expect(getPath(obj, 'a.b.c', { strict: true })).toBe(3);
    });
  });

  describe('unsafe path segments', () => {
    it('returns undefined for __proto__ segment', () => {
      expect(getPath({} as Record<string, unknown>, '__proto__')).toBeUndefined();
    });

    it('returns undefined for constructor segment', () => {
      expect(getPath({} as Record<string, unknown>, 'constructor')).toBeUndefined();
    });

    it('returns undefined for prototype segment', () => {
      expect(getPath({} as Record<string, unknown>, 'prototype')).toBeUndefined();
    });

    it('returns fallback for unsafe segment', () => {
      expect(getPath({} as Record<string, unknown>, '__proto__', { fallback: 'safe' })).toBe('safe');
    });
  });
});
