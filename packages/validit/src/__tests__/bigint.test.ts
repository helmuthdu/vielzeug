import { describe, expect, test } from 'vitest';

import { v } from '../v';

describe('BigIntSchema', () => {
  test('accepts bigint values', () => {
    expect(v.bigint().parse(42n)).toBe(42n);
    expect(v.bigint().parse(0n)).toBe(0n);
    expect(v.bigint().parse(-5n)).toBe(-5n);
  });

  test('rejects non-bigint', () => {
    const result = v.bigint().safeParse(42);

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0]!.code).toBe('invalid_bigint');
  });

  test('min() constraint', () => {
    const schema = v.bigint().min(10n);

    expect(schema.parse(10n)).toBe(10n);
    expect(schema.parse(100n)).toBe(100n);
    expect(schema.safeParse(9n).success).toBe(false);
  });

  test('max() constraint', () => {
    const schema = v.bigint().max(100n);

    expect(schema.parse(100n)).toBe(100n);
    expect(schema.safeParse(101n).success).toBe(false);
  });

  test('positive()', () => {
    expect(v.bigint().positive().parse(1n)).toBe(1n);
    expect(v.bigint().positive().safeParse(0n).success).toBe(false);
    expect(v.bigint().positive().safeParse(-1n).success).toBe(false);
  });

  test('negative()', () => {
    expect(v.bigint().negative().parse(-1n)).toBe(-1n);
    expect(v.bigint().negative().safeParse(0n).success).toBe(false);
  });

  test('nonNegative()', () => {
    expect(v.bigint().nonNegative().parse(0n)).toBe(0n);
    expect(v.bigint().nonNegative().parse(1n)).toBe(1n);
    expect(v.bigint().nonNegative().safeParse(-1n).success).toBe(false);
  });

  test('nonPositive()', () => {
    expect(v.bigint().nonPositive().parse(0n)).toBe(0n);
    expect(v.bigint().nonPositive().parse(-1n)).toBe(-1n);
    expect(v.bigint().nonPositive().safeParse(1n).success).toBe(false);
  });

  test('multipleOf()', () => {
    expect(v.bigint().multipleOf(3n).parse(9n)).toBe(9n);
    expect(v.bigint().multipleOf(3n).safeParse(10n).success).toBe(false);
  });

  test('optional() and nullable()', () => {
    expect(v.bigint().optional().parse(undefined)).toBeUndefined();
    expect(v.bigint().nullable().parse(null)).toBeNull();
  });

  describe('coerce', () => {
    test('converts integer strings to bigint', () => {
      expect(v.coerce.bigint().parse('42')).toBe(42n);
      expect(v.coerce.bigint().parse('-10')).toBe(-10n);
    });

    test('converts safe integer numbers to bigint', () => {
      expect(v.coerce.bigint().parse(7)).toBe(7n);
      expect(v.coerce.bigint().parse(-3)).toBe(-3n);
    });

    test('passes bigint through unchanged', () => {
      expect(v.coerce.bigint().parse(5n)).toBe(5n);
    });

    test('rejects non-integer numbers', () => {
      expect(v.coerce.bigint().safeParse(3.5).success).toBe(false);
      expect(v.coerce.bigint().safeParse(Number.NaN).success).toBe(false);
    });

    test('rejects non-numeric strings', () => {
      expect(v.coerce.bigint().safeParse('abc').success).toBe(false);
      expect(v.coerce.bigint().safeParse('').success).toBe(false);
    });
  });
});
