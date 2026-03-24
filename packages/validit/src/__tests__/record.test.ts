import { type Infer, v } from '../index';

describe('v.record()', () => {
  it('accepts a record with string keys and typed values', () => {
    const schema = v.record(v.string(), v.number());

    expect(schema.parse({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
    expect(schema.parse({})).toEqual({});
  });

  it('rejects non-object inputs', () => {
    expect(() => v.record(v.string(), v.number()).parse('str')).toThrow('Expected object');
  });

  it('validates all values and reports paths', () => {
    const result = v.record(v.string(), v.number()).safeParse({ a: 1, b: 'bad' });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe('b');
    }
  });

  it('infers the record type', () => {
    const schema = v.record(v.string(), v.boolean());

    type T = Infer<typeof schema>;

    const val: T = { x: true, y: false };

    expect(schema.parse(val)).toEqual(val);
  });
});

describe('record parseAsync — optional / catch', () => {
  it('record.optional().parseAsync(undefined) returns undefined', async () => {
    expect(await v.record(v.string(), v.number()).optional().parseAsync(undefined)).toBeUndefined();
  });

  it('record.catch({}).parseAsync(invalid) returns fallback', async () => {
    expect(
      await v
        .record(v.string(), v.number())
        .catch({})
        .parseAsync('bad' as any),
    ).toEqual({});
  });
});
