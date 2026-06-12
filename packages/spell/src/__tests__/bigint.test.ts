import { describe, expect, test, vi } from 'vitest';

import { s } from '../s';

describe('BigIntSchema', () => {
  test('accepts bigint values', () => {
    expect(s.bigint().parse(42n)).toBe(42n);
    expect(s.bigint().parse(0n)).toBe(0n);
    expect(s.bigint().parse(-5n)).toBe(-5n);
  });

  test('rejects non-bigint', () => {
    const result = s.bigint().safeParse(42);

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0]!.code).toBe('invalid_type');
  });

  test('min() constraint', () => {
    const schema = s.bigint().min(10n);

    expect(schema.parse(10n)).toBe(10n);
    expect(schema.parse(100n)).toBe(100n);
    expect(schema.safeParse(9n).success).toBe(false);
  });

  test('max() constraint', () => {
    const schema = s.bigint().max(100n);

    expect(schema.parse(100n)).toBe(100n);
    expect(schema.safeParse(101n).success).toBe(false);
  });

  test('positive()', () => {
    expect(s.bigint().positive().parse(1n)).toBe(1n);
    expect(s.bigint().positive().safeParse(0n).success).toBe(false);
    expect(s.bigint().positive().safeParse(-1n).success).toBe(false);
  });

  test('negative()', () => {
    expect(s.bigint().negative().parse(-1n)).toBe(-1n);
    expect(s.bigint().negative().safeParse(0n).success).toBe(false);
  });

  test('nonNegative()', () => {
    expect(s.bigint().nonNegative().parse(0n)).toBe(0n);
    expect(s.bigint().nonNegative().parse(1n)).toBe(1n);
    expect(s.bigint().nonNegative().safeParse(-1n).success).toBe(false);
  });

  test('nonPositive()', () => {
    expect(s.bigint().nonPositive().parse(0n)).toBe(0n);
    expect(s.bigint().nonPositive().parse(-1n)).toBe(-1n);
    expect(s.bigint().nonPositive().safeParse(1n).success).toBe(false);
  });

  test('multipleOf()', () => {
    expect(s.bigint().multipleOf(3n).parse(9n)).toBe(9n);
    expect(s.bigint().multipleOf(3n).safeParse(10n).success).toBe(false);
  });

  test('optional() and nullable()', () => {
    expect(s.bigint().optional().parse(undefined)).toBeUndefined();
    expect(s.bigint().nullable().parse(null)).toBeNull();
  });

  describe('toDescriptor() — constraint warning', () => {
    test('warns when bigint has constraints (they are not serializable)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      s.bigint().min(1n).toDescriptor();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('toDescriptor(): this bigint schema has constraints'),
      );
      warnSpy.mockRestore();
    });

    test('does not warn when bigint has no constraints', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      s.bigint().toDescriptor();

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('coerce', () => {
    test('converts integer strings to bigint', () => {
      expect(s.coerce.bigint().parse('42')).toBe(42n);
      expect(s.coerce.bigint().parse('-10')).toBe(-10n);
    });

    test('converts safe integer numbers to bigint', () => {
      expect(s.coerce.bigint().parse(7)).toBe(7n);
      expect(s.coerce.bigint().parse(-3)).toBe(-3n);
    });

    test('passes bigint through unchanged', () => {
      expect(s.coerce.bigint().parse(5n)).toBe(5n);
    });

    test('rejects non-integer numbers', () => {
      expect(s.coerce.bigint().safeParse(3.5).success).toBe(false);
      expect(s.coerce.bigint().safeParse(Number.NaN).success).toBe(false);
    });

    test('rejects non-numeric strings', () => {
      expect(s.coerce.bigint().safeParse('abc').success).toBe(false);
      expect(s.coerce.bigint().safeParse('').success).toBe(false);
    });
  });
});
