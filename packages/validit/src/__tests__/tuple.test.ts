import { type Infer, v } from '../index';

describe('v.tuple()', () => {
  const schema = v.tuple([v.string(), v.number(), v.boolean()] as const);

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

describe('tuple parseAsync — optional / catch', () => {
  it('tuple.optional().parseAsync(undefined) returns undefined', async () => {
    expect(await v.tuple([v.string()]).optional().parseAsync(undefined)).toBeUndefined();
  });

  it('tuple.catch().parseAsync(invalid) returns fallback', async () => {
    expect(
      await v
        .tuple([v.string()])
        .catch(['x'] as any)
        .parseAsync(42 as any),
    ).toEqual(['x']);
  });
});
