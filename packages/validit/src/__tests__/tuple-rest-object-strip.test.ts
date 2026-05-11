import { describe, expect, test } from 'vitest';

import { v } from '../v';

describe('TupleSchema.rest()', () => {
  test('accepts tuple with extra elements matching rest schema', () => {
    const schema = v.tuple([v.string()] as const).rest(v.number());

    expect(schema.parse(['hello'])).toEqual(['hello']);
    expect(schema.parse(['hello', 1, 2, 3])).toEqual(['hello', 1, 2, 3]);
  });

  test('rejects extra elements that fail rest schema', () => {
    const schema = v.tuple([v.string()] as const).rest(v.number());

    const result = schema.safeParse(['hello', 'not-a-number']);

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues.length).toBeGreaterThan(0);
  });

  test('still validates fixed-position items', () => {
    const schema = v.tuple([v.string(), v.boolean()] as const).rest(v.number());

    expect(schema.safeParse([42, true, 1]).success).toBe(false);
  });

  test('rejects when required items are missing', () => {
    const schema = v.tuple([v.string(), v.number()] as const).rest(v.boolean());

    expect(schema.safeParse(['only-one']).success).toBe(false);
  });

  test('async parse with rest', async () => {
    const schema = v.tuple([v.string()] as const).rest(v.number());
    const result = await schema.safeParseAsync(['hello', 1, 2]);

    expect(result.success).toBe(true);

    if (result.success) expect(result.data).toEqual(['hello', 1, 2]);
  });

  test('rest schema errors include positional path', () => {
    const schema = v.tuple([v.string()] as const).rest(v.number());
    const result = schema.safeParse(['hello', 1, 'bad']);

    expect(result.success).toBe(false);

    if (!result.success) {
      const issue = result.error.issues[0]!;

      expect(typeof issue.path[0]).toBe('number');
    }
  });
});

describe('ObjectSchema.strip()', () => {
  test('silently removes unknown keys', () => {
    const schema = v.object({ name: v.string() }).strip();
    const result = schema.parse({ extra: 'ignored', name: 'Alice' });

    expect(result).toEqual({ name: 'Alice' });
    expect('extra' in result).toBe(false);
  });

  test('does not error on unknown keys', () => {
    const schema = v.object({ id: v.number() }).strip();

    expect(schema.safeParse({ id: 1, unknown: true }).success).toBe(true);
  });

  test('strict mode still rejects unknown keys', () => {
    const schema = v.object({ id: v.number() });

    expect(schema.safeParse({ extra: true, id: 1 }).success).toBe(false);
  });

  test('relaxed mode preserves unknown keys', () => {
    const result = v.object({ id: v.number() }).relaxed().parse({ extra: 'kept', id: 1 });

    expect((result as any).extra).toBe('kept');
  });

  test('strip() survives partial/extend/pick/omit', () => {
    const base = v.object({ a: v.string(), b: v.number() }).strip();
    const extended = base.extend({ c: v.boolean() });
    const result = extended.parse({ a: 'x', b: 1, c: true, unknown: 99 });

    expect(result).toEqual({ a: 'x', b: 1, c: true });
    expect('unknown' in result).toBe(false);
  });
});
