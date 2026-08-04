import { describe, expect, it } from 'vitest';

import { getPath, getPathOr, requirePath } from '../getPath';

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
    it('converts numeric bracket notation to dot notation', () => {
      expect(getPath(obj, 'd[1]')).toBe(2);
    });
  });

  describe('fallback lookup', () => {
    it('returns fallback when path is missing', () => {
      expect(getPathOr(obj, 'a.b.x', 'fallback')).toBe('fallback');
    });

    it('returns fallback when path resolves through null', () => {
      expect(getPathOr({ a: null }, 'a.b', 42)).toBe(42);
    });

    it('does not return fallback when path resolves to a defined value', () => {
      expect(getPathOr(obj, 'a.b.c', 99)).toBe(3);
    });

    it('returns fallback for undefined values', () => {
      expect(getPathOr({ x: undefined }, 'x', 5)).toBe(5);
    });
  });

  describe('required lookup', () => {
    it('throws TypeError when path is missing', () => {
      expect(() => requirePath(obj, 'a.b.x')).toThrow(TypeError);
    });

    it('throws TypeError when an intermediate segment is missing', () => {
      expect(() => requirePath(obj, 'z.y')).toThrow(TypeError);
    });

    it('returns an existing value', () => {
      expect(requirePath(obj, 'a.b.c')).toBe(3);
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
      expect(getPathOr({} as Record<string, unknown>, '__proto__', 'safe')).toBe('safe');
    });
  });
});
