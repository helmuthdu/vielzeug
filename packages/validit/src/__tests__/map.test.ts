import { describe, expect, test } from 'vitest';

import { v } from '../v';

describe('MapSchema', () => {
  test('accepts Map values', () => {
    const result = v.map(v.string(), v.number()).parse(
      new Map([
        ['a', 1],
        ['b', 2],
      ]),
    );

    expect(result).toEqual(
      new Map([
        ['a', 1],
        ['b', 2],
      ]),
    );
  });

  test('rejects non-Map input', () => {
    const result = v.map(v.string(), v.number()).safeParse({ a: 1 });

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0]!.code).toBe('invalid_type');
  });

  test('validates each key', () => {
    const result = v.map(v.string().min(3), v.number()).safeParse(new Map([['ab', 1]]));

    expect(result.success).toBe(false);
  });

  test('validates each value', () => {
    const result = v.map(v.string(), v.number().positive()).safeParse(new Map([['a', -1]]));

    expect(result.success).toBe(false);
  });

  test('parses empty map', () => {
    expect(v.map(v.string(), v.number()).parse(new Map())).toEqual(new Map());
  });

  test('optional() allows undefined', () => {
    expect(v.map(v.string(), v.number()).optional().parse(undefined)).toBeUndefined();
  });

  test('async parse', async () => {
    const input = new Map([
      ['x', 10],
      ['y', 20],
    ]);
    const result = await v.map(v.string(), v.number()).safeParseAsync(input);

    expect(result.success).toBe(true);

    if (result.success) expect(result.data).toEqual(input);
  });

  test('transforms keys and values', () => {
    const schema = v.map(v.string().trim(), v.number().min(0));
    const result = schema.parse(new Map([[' hello ', 5]]));

    expect(result.get('hello')).toBe(5);
  });
});
