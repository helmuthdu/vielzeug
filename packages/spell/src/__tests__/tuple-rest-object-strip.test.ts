import { describe, expect, test } from 'vitest';

import { s } from '../s';

describe('TupleSchema.rest()', () => {
  test('accepts tuple with extra elements matching rest schema', () => {
    const schema = s.tuple([s.string()] as const).rest(s.number());

    expect(schema.parse(['hello'])).toEqual(['hello']);
    expect(schema.parse(['hello', 1, 2, 3])).toEqual(['hello', 1, 2, 3]);
  });

  test('rejects extra elements that fail rest schema', () => {
    const schema = s.tuple([s.string()] as const).rest(s.number());

    const result = schema.safeParse(['hello', 'not-a-number']);

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues.length).toBeGreaterThan(0);
  });

  test('still validates fixed-position items', () => {
    const schema = s.tuple([s.string(), s.boolean()] as const).rest(s.number());

    expect(schema.safeParse([42, true, 1]).success).toBe(false);
  });

  test('rejects when required items are missing', () => {
    const schema = s.tuple([s.string(), s.number()] as const).rest(s.boolean());

    const result = schema.safeParse(['only-one']);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].params).toEqual({ min: 2 });
      expect(result.error.issues[0].message).toContain('at least 2');
    }
  });

  test('async parse with rest', async () => {
    const schema = s.tuple([s.string()] as const).rest(s.number());
    const result = await schema.safeParseAsync(['hello', 1, 2]);

    expect(result.success).toBe(true);

    if (result.success) expect(result.data).toEqual(['hello', 1, 2]);
  });

  test('parseAsync() runs async validate() on the rest schema (does not silently skip)', async () => {
    const asyncPositive = s.number().validate(async (n) => n > 0 || 'must be positive');
    const schema = s.tuple([s.string()] as const).rest(asyncPositive);

    await expect(schema.safeParseAsync(['hello', 1, 2])).resolves.toMatchObject({ success: true });
    await expect(schema.safeParseAsync(['hello', 1, -2])).resolves.toMatchObject({ success: false });
  });

  test('rest schema errors include positional path', () => {
    const schema = s.tuple([s.string()] as const).rest(s.number());
    const result = schema.safeParse(['hello', 1, 'bad']);

    expect(result.success).toBe(false);

    if (!result.success) {
      const issue = result.error.issues[0]!;

      expect(typeof issue.path[0]).toBe('number');
    }
  });
});

describe('ObjectSchema unknown-key modes', () => {
  test('strict (default) rejects unknown keys', () => {
    const schema = s.object({ id: s.number() });

    expect(schema.safeParse({ extra: true, id: 1 }).success).toBe(false);
  });

  test('relaxed mode preserves unknown keys', () => {
    const result = s.object({ id: s.number() }).relaxed().parse({ extra: 'kept', id: 1 });

    expect((result as any).extra).toBe('kept');
  });

  test('relaxed mode survives extend/pick/omit', () => {
    const base = s.object({ a: s.string(), b: s.number() }).relaxed();
    const extended = (base as any).extend({ c: s.boolean() });
    const result = extended.parse({ a: 'x', b: 1, c: true, unknown: 99 });

    expect(result.a).toBe('x');
    expect(result.b).toBe(1);
    expect(result.c).toBe(true);
    expect((result as any).unknown).toBe(99);
  });
});
