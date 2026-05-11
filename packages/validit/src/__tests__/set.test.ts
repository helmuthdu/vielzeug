import { describe, expect, test } from 'vitest';

import { v } from '../v';

describe('SetSchema', () => {
  test('accepts Set values', () => {
    const result = v.set(v.string()).parse(new Set(['a', 'b', 'c']));

    expect(result).toEqual(new Set(['a', 'b', 'c']));
  });

  test('rejects non-Set input', () => {
    const result = v.set(v.string()).safeParse(['a', 'b']);

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0]!.code).toBe('invalid_type');
  });

  test('validates each item', () => {
    const result = v.set(v.number()).safeParse(new Set([1, 'two', 3]));

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues.length).toBeGreaterThan(0);
  });

  test('min() constraint', () => {
    const schema = v.set(v.string()).min(2);

    expect(schema.parse(new Set(['a', 'b'])).size).toBe(2);
    expect(schema.safeParse(new Set(['a'])).success).toBe(false);
  });

  test('max() constraint', () => {
    const schema = v.set(v.string()).max(2);

    expect(schema.parse(new Set(['a', 'b'])).size).toBe(2);
    expect(schema.safeParse(new Set(['a', 'b', 'c'])).success).toBe(false);
  });

  test('size() constraint', () => {
    const schema = v.set(v.string()).size(2);

    expect(schema.parse(new Set(['x', 'y'])).size).toBe(2);
    expect(schema.safeParse(new Set(['x'])).success).toBe(false);
    expect(schema.safeParse(new Set(['x', 'y', 'z'])).success).toBe(false);
  });

  test('nonEmpty() constraint', () => {
    expect(
      v
        .set(v.number())
        .nonEmpty()
        .parse(new Set([1])).size,
    ).toBe(1);
    expect(v.set(v.number()).nonEmpty().safeParse(new Set()).success).toBe(false);
  });

  test('optional() allows undefined', () => {
    expect(v.set(v.string()).optional().parse(undefined)).toBeUndefined();
  });

  test('parses empty set', () => {
    expect(v.set(v.string()).parse(new Set())).toEqual(new Set());
  });

  test('async parse', async () => {
    const result = await v.set(v.number()).safeParseAsync(new Set([1, 2, 3]));

    expect(result.success).toBe(true);

    if (result.success) expect(result.data).toEqual(new Set([1, 2, 3]));
  });
});
