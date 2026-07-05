import { type Infer, s } from '../index';

describe('s.record()', () => {
  it('accepts a record with string keys and typed values', () => {
    const schema = s.record(s.string(), s.number());

    expect(schema.parse({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
    expect(schema.parse({})).toEqual({});
  });

  it('rejects non-object inputs', () => {
    expect(() => s.record(s.string(), s.number()).parse('str')).toThrow('Expected object');
  });

  it('validates all values and reports paths', () => {
    const result = s.record(s.string(), s.number()).safeParse({ a: 1, b: 'bad' });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe('b');
    }
  });

  it('infers the record type', () => {
    const schema = s.record(s.string(), s.boolean());

    type T = Infer<typeof schema>;

    const val: T = { x: true, y: false };

    expect(schema.parse(val)).toEqual(val);
  });
});

describe('record parseAsync — optional / catch', () => {
  it('record.optional().parseAsync(undefined) returns undefined', async () => {
    expect(await s.record(s.string(), s.number()).optional().parseAsync(undefined)).toBeUndefined();
  });

  it('record.catch({}).parseAsync(invalid) returns fallback', async () => {
    expect(
      await s
        .record(s.string(), s.number())
        .catch({})
        .parseAsync('bad' as any),
    ).toEqual({});
  });

  it('parseAsync() runs async validate() on the value schema (does not silently skip)', async () => {
    const asyncPositive = s.number().validate(async (n) => n > 0 || 'must be positive');
    const schema = s.record(s.string(), asyncPositive);

    await expect(schema.safeParseAsync({ a: 1 })).resolves.toMatchObject({ success: true });
    await expect(schema.safeParseAsync({ a: -1 })).resolves.toMatchObject({ success: false });
  });

  it('parseAsync() still guards __proto__-style keys', async () => {
    const schema = s.record(s.string(), s.number());
    const result = await schema.safeParseAsync(JSON.parse('{"__proto__": 1, "safe": 2}'));

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data).toEqual({ safe: 2 });
      expect(Object.getPrototypeOf(result.data)).toBe(Object.prototype);
    }
  });
});
