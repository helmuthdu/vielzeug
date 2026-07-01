import { type Infer, s, SpellValidationError } from '../index';

describe('optional nullable nullish required', () => {
  it('optional() accepts undefined and still validates concrete values', () => {
    const schema = s.string().min(3).optional();

    expect(schema.parse(undefined)).toBeUndefined();
    expect(schema.parse('hello')).toBe('hello');
    expect(() => schema.parse('hi')).toThrow();
  });

  it('nullable() accepts null and still validates concrete values', () => {
    const schema = s.number().min(0).nullable();

    expect(schema.parse(null)).toBeNull();
    expect(schema.parse(5)).toBe(5);
    expect(() => schema.parse(-1)).toThrow();
  });

  it('nullish() accepts null and undefined', () => {
    const schema = s.string().nullish();

    expect(schema.parse(null)).toBeNull();
    expect(schema.parse(undefined)).toBeUndefined();
    expect(schema.parse('hello')).toBe('hello');
  });

  it('required() removes undefined from optional schema', () => {
    const schema = s.string().optional().required();

    expect(schema.safeParse(undefined).success).toBe(false);
    expect(schema.parse('hello')).toBe('hello');
  });

  it('required() preserves nullability while removing undefined', () => {
    const nullable = s.string().nullable().required();
    const nullish = s.string().nullish().required();

    expect(nullable.parse(null)).toBeNull();
    expect(nullable.safeParse(undefined).success).toBe(false);
    expect(nullish.parse(null)).toBeNull();
    expect(nullish.safeParse(undefined).success).toBe(false);
  });

  it('mode merges preserve wrapper-level state', () => {
    const schema = s
      .string()
      .optional()
      .default('fallback')
      .validate((value) => value !== 'bad' || 'Bad')
      .label('Field')
      .nullable();

    expect(schema.description).toBe('Field');
    expect(schema.parse(undefined)).toBe('fallback');
    expect(schema.parse(null)).toBeNull();

    const result = schema.safeParse('bad');

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0]!.message).toBe('Bad');
  });

  it('required() preserves wrapper defaults, labels, and checks across mode merges', () => {
    const schema = s
      .number()
      .optional()
      .default(42)
      .validate((value) => value !== 0 || 'Zero')
      .label('Answer')
      .required()
      .nullable();

    expect(schema.description).toBe('Answer');
    expect(schema.parse(undefined)).toBe(42);
    expect(schema.parse(null)).toBeNull();

    const result = schema.safeParse(0);

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0]!.message).toBe('Zero');
  });

  it('modifier inference remains correct', () => {
    const schema = s.number().nullish();

    type T = Infer<typeof schema>;

    const a: T = null;
    const b: T = undefined;

    expect(schema.parse(a)).toBeNull();
    expect(schema.parse(b)).toBeUndefined();
  });
});

describe('default and catch', () => {
  it('default() applies only to undefined', () => {
    const schema = s.string().default('x');

    expect(schema.parse(undefined)).toBe('x');
    expect(schema.parse('y')).toBe('y');
  });

  it('catch() returns fallback for validation failures', () => {
    const schema = s.object({ name: s.string() }).catch({ name: 'unknown' });

    expect(schema.parse({ name: 'Ada' })).toEqual({ name: 'Ada' });
    expect(schema.parse('bad' as any)).toEqual({ name: 'unknown' });
  });

  it('validators added after catch() still run', () => {
    const schema = s.string().catch('fallback').min(3);

    expect(schema.parse('hello')).toBe('hello');
    expect(schema.parse('hi')).toBe('fallback');
  });

  it('catch() also applies in parseAsync()', async () => {
    const schema = s.string().catch('fallback');

    await expect(schema.parseAsync(42 as any)).resolves.toBe('fallback');
  });

  it('default() materializes fresh mutable values for each parse', () => {
    const schema = s.object({ tags: s.array(s.string()) }).default({ tags: [] });

    const first = schema.parse(undefined);

    first.tags.push('x');

    const second = schema.parse(undefined);

    expect(second.tags).toEqual([]);
  });

  it('catch() materializes fresh mutable fallback values for each failure', () => {
    const schema = s.object({ tags: s.array(s.string()) }).catch({ tags: [] });

    const first = schema.parse('bad' as any);

    first.tags.push('x');

    const second = schema.parse('bad' as any);

    expect(second.tags).toEqual([]);
  });

  it('default() does not throw for non-cloneable runtime values', () => {
    const fn = () => 1;
    const schema = s.object({ fn: s.any() }).default({ fn });

    const parsed = schema.parse(undefined);

    expect(parsed.fn).toBe(fn);
  });

  it('catch() does not throw for non-cloneable runtime values', () => {
    const fn = () => 1;
    const schema = s.object({ fn: s.any() }).catch({ fn });

    const parsed = schema.parse('bad' as any);

    expect(parsed.fn).toBe(fn);
  });
});

describe('metadata and type-level helpers', () => {
  it('is() returns true for valid values and false for invalid values', () => {
    expect(s.string().is('hello')).toBe(true);
    expect(s.string().is(123)).toBe(false);
  });

  it('is() narrows unknown values in control flow', () => {
    const value: unknown = 'hi';

    if (s.string().is(value)) {
      expect(value.toUpperCase()).toBe('HI');
    }
  });

  it('describe() stores and preserves description metadata through transform()', () => {
    const schema = s
      .string()
      .label('raw input')
      .transform((s) => s.toUpperCase());

    expect(schema.description).toBe('raw input');
    expect(schema.parse('a')).toBe('A');
  });

  it('Infer infers object output types', () => {
    const schema = s.object({ id: s.number(), name: s.string() });

    type T = Infer<typeof schema>;

    const value: T = { id: 1, name: 'Alice' };

    expect(schema.parse(value)).toEqual(value);
  });

  it('Infer infers nullable and optional output unions', () => {
    const schema = s.string().nullish();

    type T = Infer<typeof schema>;

    const a: T = null;
    const b: T = undefined;

    expect(schema.parse(a)).toBeNull();
    expect(schema.parse(b)).toBeUndefined();
  });
});

describe('assert()', () => {
  it('does not throw for valid values', () => {
    expect(() => s.string().min(3).assert('hello')).not.toThrow();
  });

  it('throws SpellValidationError for invalid values', () => {
    expect(() => s.string().assert(42)).toThrow(SpellValidationError);
  });

  it('narrows the type as an assertion', () => {
    const value: unknown = 'hello';

    s.string().assert(value);

    expect(value.toUpperCase()).toBe('HELLO');
  });

  it('prepends label to root-level error messages', () => {
    try {
      s.string().assert(42, 'userId');
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(SpellValidationError);
      expect((e as SpellValidationError).issues[0].message).toMatch(/^userId:/);
    }
  });

  it('does not prepend label to nested path issues', () => {
    try {
      s.object({ name: s.string() }).assert({ name: 42 }, 'payload');
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(SpellValidationError);

      const issue = (e as SpellValidationError).issues[0];

      expect(issue.path).toEqual(['name']);
      expect(issue.message).not.toMatch(/^payload:/);
    }
  });

  it('throws without label prefix when no label is given', () => {
    try {
      s.string().assert(42);
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(SpellValidationError);
      expect((e as SpellValidationError).issues[0].message).not.toMatch(/^undefined:/);
    }
  });
});

describe('equals()', () => {
  it('returns true for structurally identical primitive schemas', () => {
    expect(s.string().equals(s.string())).toBe(true);
    expect(s.number().min(1).equals(s.number().min(1))).toBe(true);
  });

  it('returns false for different schema kinds', () => {
    expect(s.string().equals(s.number())).toBe(false);
  });

  it('returns false when annotations differ', () => {
    expect(s.string().min(3).equals(s.string().min(5))).toBe(false);
  });

  it('returns true for identical optional wrappers', () => {
    expect(s.string().optional().equals(s.string().optional())).toBe(true);
  });

  it('returns false when wrapper modes differ', () => {
    expect(s.string().optional().equals(s.string().nullable())).toBe(false);
  });

  it('returns true for identical object schemas', () => {
    const a = s.object({ id: s.number(), name: s.string() });
    const b = s.object({ id: s.number(), name: s.string() });

    expect(a.equals(b)).toBe(true);
  });

  it('returns false when object shapes differ', () => {
    expect(s.object({ a: s.string() }).equals(s.object({ b: s.string() }))).toBe(false);
  });

  it('returns false when description differs', () => {
    expect(s.string().label('A').equals(s.string().label('B'))).toBe(false);
  });

  it('returns false when isOptional differs', () => {
    expect(s.string().optional().equals(s.string())).toBe(false);
  });
});

describe('walk() fallback', () => {
  it('returns null when no handler matches and no unknown fallback is provided', () => {
    expect(s.string().walk({})).toBeNull();
  });

  it('calls the unknown fallback when no specific handler matches', () => {
    const result = s.string().walk({ unknown: () => 'caught' });

    expect(result).toBe('caught');
  });
});

describe('kind getter', () => {
  it('returns the correct kind for primitive schemas', () => {
    expect(s.string().kind).toBe('string');
    expect(s.number().kind).toBe('number');
    expect(s.boolean().kind).toBe('boolean');
    expect(s.bigint().kind).toBe('bigint');
    expect(s.date().kind).toBe('date');
    expect(s.never().kind).toBe('never');
    expect(s.unknown().kind).toBe('any');
    expect(s.any().kind).toBe('any');
  });

  it('returns correct kind for composite schemas', () => {
    expect(s.array(s.string()).kind).toBe('array');
    expect(s.object({ a: s.string() }).kind).toBe('object');
    expect(s.union([s.string(), s.number()]).kind).toBe('union');
    expect(s.intersect([s.object({ a: s.string() }), s.object({ b: s.number() })]).kind).toBe('intersect');
    expect(s.tuple([s.string(), s.number()]).kind).toBe('tuple');
    expect(s.set(s.string()).kind).toBe('set');
    expect(s.map(s.string(), s.number()).kind).toBe('map');
    expect(s.record(s.string(), s.number()).kind).toBe('record');
  });

  it('wrapper kind reflects the inner schema kind', () => {
    expect(s.string().optional().kind).toBe('string');
    expect(s.number().nullable().kind).toBe('number');
  });

  it('returns pipe for piped schemas', () => {
    expect(s.string().pipe(s.number()).kind).toBe('pipe');
  });
});
