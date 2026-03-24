import { ValidationError, v } from '../index';

describe('v.array()', () => {
  it('accepts arrays, rejects non-arrays', () => {
    expect(v.array(v.string()).parse(['a', 'b'])).toEqual(['a', 'b']);
    expect(v.array(v.string()).parse([])).toEqual([]);
    expect(() => v.array(v.string()).parse('not an array')).toThrow('Expected array');
  });

  it('validates each item and puts the index in the path', () => {
    const result = v.array(v.string()).safeParse([1, 2]);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].path).toEqual([0]);
      expect(result.error.issues[1].path).toEqual([1]);
    }
  });

  it('min / max / length', () => {
    expect(v.array(v.number()).min(2).parse([1, 2])).toEqual([1, 2]);
    expect(() => v.array(v.number()).min(2).parse([1])).toThrow('Must have at least 2 items');
    expect(() => v.array(v.number()).max(2).parse([1, 2, 3])).toThrow('Must have at most 2 items');
    expect(() => v.array(v.number()).length(2).parse([1])).toThrow('Must have exactly 2 items');
  });

  it('validates nested arrays', () => {
    const schema = v.array(v.array(v.number()));

    expect(schema.parse([[1, 2], [3]])).toEqual([[1, 2], [3]]);
    expect(() => schema.parse([[1, 'x']])).toThrow(ValidationError);
  });

  it('refine() on an array receives the parsed items, not the raw input', () => {
    const schema = v
      .array(v.coerce.number())
      .refine((items) => items.every((n) => typeof n === 'number'), 'Items should be numbers');

    expect(schema.parse(['1', '2', '3'])).toEqual([1, 2, 3]);
  });
});

describe('array — field-level transforms', () => {
  it('coerce.number() inside array coerces each item', () => {
    expect(v.array(v.coerce.number()).parse(['1', '2', '3'])).toEqual([1, 2, 3]);
  });

  it('trim() inside array items preserves trimmed values', () => {
    expect(v.array(v.string().trim()).parse(['  a  ', '  b  '])).toEqual(['a', 'b']);
  });

  it('default() inside array fills missing item values', () => {
    expect(v.array(v.string().default('x')).parse([undefined, 'hello'])).toEqual(['x', 'hello']);
  });
});

describe('array parseAsync — optional / nullable / catch', () => {
  it('array.optional().parseAsync(undefined) returns undefined', async () => {
    expect(await v.array(v.string()).optional().parseAsync(undefined)).toBeUndefined();
  });

  it('array.nullable().parseAsync(null) returns null', async () => {
    expect(await v.array(v.string()).nullable().parseAsync(null)).toBeNull();
  });

  it('array.catch([]).parseAsync(invalid) returns fallback', async () => {
    expect(
      await v
        .array(v.string())
        .catch([])
        .parseAsync('not-an-array' as any),
    ).toEqual([]);
  });
});
