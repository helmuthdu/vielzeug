import { type Infer, s } from '../index';

describe('s.tuple()', () => {
  const schema = s.tuple([s.string(), s.number(), s.boolean()] as const);

  it('accepts a matching tuple', () => {
    expect(schema.parse(['hello', 42, true])).toEqual(['hello', 42, true]);
  });

  it('rejects wrong length', () => {
    expect(() => schema.parse(['hello', 42])).toThrow();
    expect(() => schema.parse(['hello', 42, true, 'extra'])).toThrow();
  });

  it('rejects wrong element types', () => {
    const result = schema.safeParse(['hello', 'notanumber', true]);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe(1);
    }
  });

  it('infers the tuple type', () => {
    type T = Infer<typeof schema>;

    const val: T = ['hello', 42, true];

    expect(schema.parse(val)).toEqual(val);
  });
});

describe('tuple parseAsync: optional / catch', () => {
  it('tuple.optional().parseAsync(undefined) returns undefined', async () => {
    expect(await s.tuple([s.string()]).optional().parseAsync(undefined)).toBeUndefined();
  });

  it('tuple.catch().parseAsync(invalid) returns fallback', async () => {
    expect(
      await s
        .tuple([s.string()])
        .catch(['x'] as any)
        .parseAsync(42 as any),
    ).toEqual(['x']);
  });

  it('parseAsync() runs async checkAsync() on item schemas (does not silently skip)', async () => {
    const asyncPositive = s.number().checkAsync(async (n) => n > 0 || 'must be positive');
    const tupleSchema = s.tuple([asyncPositive]);

    await expect(tupleSchema.safeParseAsync([1])).resolves.toMatchObject({ success: true });
    await expect(tupleSchema.safeParseAsync([-1])).resolves.toMatchObject({ success: false });
  });
});

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

  test('parseAsync() runs async checkAsync() on the rest schema (does not silently skip)', async () => {
    const asyncPositive = s.number().checkAsync(async (n) => n > 0 || 'must be positive');
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
