import { describe, expect, test } from 'vitest';

import { s } from '../s';

describe('MapSchema', () => {
  test('accepts Map values', () => {
    const result = s.map(s.string(), s.number()).parse(
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
    const result = s.map(s.string(), s.number()).safeParse({ a: 1 });

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0]!.code).toBe('invalid_type');
  });

  test('validates each key', () => {
    const result = s.map(s.string().min(3), s.number()).safeParse(new Map([['ab', 1]]));

    expect(result.success).toBe(false);
  });

  test('validates each value', () => {
    const result = s.map(s.string(), s.number().positive()).safeParse(new Map([['a', -1]]));

    expect(result.success).toBe(false);
  });

  test('parses empty map', () => {
    expect(s.map(s.string(), s.number()).parse(new Map())).toEqual(new Map());
  });

  test('optional() allows undefined', () => {
    expect(s.map(s.string(), s.number()).optional().parse(undefined)).toBeUndefined();
  });

  test('async parse', async () => {
    const input = new Map([
      ['x', 10],
      ['y', 20],
    ]);
    const result = await s.map(s.string(), s.number()).safeParseAsync(input);

    expect(result.success).toBe(true);

    if (result.success) expect(result.data).toEqual(input);
  });

  test('transforms keys and values', () => {
    const schema = s.map(s.string().trim(), s.number().min(0));
    const result = schema.parse(new Map([[' hello ', 5]]));

    expect(result.get('hello')).toBe(5);
  });
});
