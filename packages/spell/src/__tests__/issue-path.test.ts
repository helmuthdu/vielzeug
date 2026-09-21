import { joinIssuePath, type ParseResult, type SyncParsable, s } from '../index';

describe('joinIssuePath', () => {
  test('joins spell-native string and number segments with the default separator', () => {
    expect(joinIssuePath(['permissions', 0, 'slug'])).toBe('permissions.0.slug');
    expect(joinIssuePath(['email'])).toBe('email');
  });

  test('unwraps Standard Schema { key } segments instead of stringifying them', () => {
    expect(joinIssuePath([{ key: 'permissions' }, { key: 0 }, 'slug'])).toBe('permissions.0.slug');
  });

  test('supports a custom separator', () => {
    expect(joinIssuePath(['a', 1], '/')).toBe('a/1');
  });

  test('returns an empty string for empty or undefined paths', () => {
    expect(joinIssuePath([])).toBe('');
    expect(joinIssuePath(undefined)).toBe('');
  });

  test('formats Standard Schema issue paths without casts', () => {
    const result = s.object({ user: s.object({ tags: s.array(s.string().min(2)) }) }).safeParse({
      user: { tags: ['ok', 'x'] },
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(joinIssuePath(result.error.issues[0].path)).toBe('user.tags.1');
  });

  test('formats every PropertyKey segment type', () => {
    const symbol = Symbol('guard');
    expect(joinIssuePath(['a', 0, symbol, { key: 'b' }])).toBe('a.0.Symbol(guard).b');
  });
});

describe('SyncParsable', () => {
  test('accepts schemas built with s in argument position without a cast', () => {
    function validateWith(schema: SyncParsable<unknown>, value: unknown): boolean {
      return schema.safeParse(value).success;
    }

    const schema = s.object({ email: s.string() });

    expect(validateWith(schema, { email: 'a@example.com' })).toBe(true);
    expect(validateWith(schema, { email: 1 })).toBe(false);
  });

  test('carries the parsed output type', () => {
    function parseWith<T>(schema: SyncParsable<T>, value: unknown): ParseResult<T> {
      return schema.safeParse(value);
    }

    const result = parseWith(s.object({ n: s.number() }), { n: 1 });

    if (result.success) {
      expect(result.data.n).toBe(1);
    } else {
      throw new Error('expected parse to succeed');
    }
  });
});
