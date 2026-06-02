import { describe, expect, test } from 'vitest';

import { s } from '../s';

describe('SetSchema', () => {
  test('accepts Set values', () => {
    const result = s.set(s.string()).parse(new Set(['a', 'b', 'c']));

    expect(result).toEqual(new Set(['a', 'b', 'c']));
  });

  test('rejects non-Set input', () => {
    const result = s.set(s.string()).safeParse(['a', 'b']);

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0]!.code).toBe('invalid_type');
  });

  test('validates each item', () => {
    const result = s.set(s.number()).safeParse(new Set([1, 'two', 3]));

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues.length).toBeGreaterThan(0);
  });

  test('min() constraint', () => {
    const schema = s.set(s.string()).min(2);

    expect(schema.parse(new Set(['a', 'b'])).size).toBe(2);
    expect(schema.safeParse(new Set(['a'])).success).toBe(false);
  });

  test('max() constraint', () => {
    const schema = s.set(s.string()).max(2);

    expect(schema.parse(new Set(['a', 'b'])).size).toBe(2);
    expect(schema.safeParse(new Set(['a', 'b', 'c'])).success).toBe(false);
  });

  test('size() constraint', () => {
    const schema = s.set(s.string()).size(2);

    expect(schema.parse(new Set(['x', 'y'])).size).toBe(2);
    expect(schema.safeParse(new Set(['x'])).success).toBe(false);
    expect(schema.safeParse(new Set(['x', 'y', 'z'])).success).toBe(false);
  });

  test('nonEmpty() constraint', () => {
    expect(
      s
        .set(s.number())
        .nonEmpty()
        .parse(new Set([1])).size,
    ).toBe(1);
    expect(s.set(s.number()).nonEmpty().safeParse(new Set()).success).toBe(false);
  });

  test('optional() allows undefined', () => {
    expect(s.set(s.string()).optional().parse(undefined)).toBeUndefined();
  });

  test('parses empty set', () => {
    expect(s.set(s.string()).parse(new Set())).toEqual(new Set());
  });

  test('async parse', async () => {
    const result = await s.set(s.number()).safeParseAsync(new Set([1, 2, 3]));

    expect(result.success).toBe(true);

    if (result.success) expect(result.data).toEqual(new Set([1, 2, 3]));
  });
});
