import { type Infer, type InferOutput, ValidationError, v } from '../index';

describe('ValidationError', () => {
  it('formats a root-level issue as "value: message [code]"', () => {
    const err = new ValidationError([{ code: 'custom', message: 'Invalid', path: [] }]);

    expect(err.message).toBe('value: Invalid [custom]');
  });

  it('formats nested paths with dots', () => {
    const err = new ValidationError([{ code: 'required', message: 'Required', path: ['user', 'address', 'city'] }]);

    expect(err.message).toBe('user.address.city: Required [required]');
  });

  it('formats array-index paths', () => {
    const err = new ValidationError([{ code: 'custom', message: 'Invalid', path: ['items', 0, 'name'] }]);

    expect(err.message).toBe('items.0.name: Invalid [custom]');
  });

  it('includes error code in square brackets', () => {
    const err = new ValidationError([{ code: 'too_small', message: 'Too short', path: ['name'] }]);

    expect(err.message).toBe('name: Too short [too_small]');
  });

  it('surfaces code and params from schema validators', () => {
    const result = v.string().min(5).safeParse('hi');

    expect(result.success).toBe(false);

    if (!result.success) {
      const issue = result.error.issues[0];

      expect(issue.code).toBe('too_small');
      expect(issue.params).toEqual({ minimum: 5 });
    }
  });

  it('flatten() separates field errors from form-level errors', () => {
    const result = v
      .object({ email: v.string().email(), name: v.string().min(2) })
      .refine((d) => d.name !== 'admin', 'Reserved name')
      .safeParse({ email: 'bad', name: 'admin' });

    expect(result.success).toBe(false);

    if (!result.success) {
      const { fieldErrors, formErrors } = result.error.flatten();

      expect(fieldErrors.email).toEqual(['Invalid email address']);
      expect(formErrors).toEqual(['Reserved name']);
    }
  });

  it('flatten() collects multiple errors per field', () => {
    const result = v.object({ tag: v.string().min(3).max(1) }).safeParse({ tag: 'ab' });

    expect(result.success).toBe(false);

    if (!result.success) {
      const { fieldErrors } = result.error.flatten();

      expect(fieldErrors.tag?.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('flatten() uses full dotted paths for nested fields', () => {
    const result = v
      .object({ address: v.object({ zip: v.string().regex(/^\d{5}$/) }) })
      .safeParse({ address: { zip: 'bad' } });

    expect(result.success).toBe(false);

    if (!result.success) {
      const { fieldErrors } = result.error.flatten();

      expect(fieldErrors['address.zip']).toEqual(['Invalid format']);
      expect(fieldErrors.address).toBeUndefined();
    }
  });
});

describe('bail on type mismatch', () => {
  it('returns only one issue when type check fails, not constraint errors too', () => {
    const result = v.string().min(3).max(10).safeParse(42);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0].code).toBe('invalid_type');
    }
  });

  it('runs constraint validators once type is correct', () => {
    const result = v.string().min(10).safeParse('hi');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].code).toBe('too_small');
    }
  });

  it('collects all constraint issues when type is correct', () => {
    const result = v.string().min(5).max(3).safeParse('abcd');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
      expect(result.error.issues.every((i) => i.code !== 'invalid_type')).toBe(true);
    }
  });
});

describe('safeParse()', () => {
  it('returns { success: true, data } for valid input', () => {
    const result = v.string().safeParse('hello');

    expect(result.success).toBe(true);

    if (result.success) expect(result.data).toBe('hello');
  });

  it('returns { success: false, error } for invalid input without throwing', () => {
    const result = v.string().safeParse(123);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error.issues).toHaveLength(1);
    }
  });

  it('collects multiple field errors for objects', () => {
    const result = v.object({ a: v.string(), b: v.number() }).safeParse({ a: 1, b: 'x' });

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
  });
});

describe('parseAsync() / safeParseAsync()', () => {
  it('parses synchronous schemas asynchronously', async () => {
    expect(await v.string().min(2).parseAsync('hi')).toBe('hi');
  });

  it('runs async refine with refineAsync', async () => {
    const schema = v.number().refineAsync(async (n) => n > 0, 'Must be positive');

    expect(await schema.parseAsync(1)).toBe(1);
    await expect(schema.parseAsync(-1)).rejects.toThrow('Must be positive');
  });

  it('safeParseAsync returns success/error without throwing', async () => {
    const ok = await v.string().safeParseAsync('x');

    expect(ok.success).toBe(true);

    const fail = await v.string().safeParseAsync(42);

    expect(fail.success).toBe(false);
  });
});

describe('optional()', () => {
  it('allows undefined, still validates defined values', () => {
    const schema = v.string().optional();

    expect(schema.parse(undefined)).toBe(undefined);
    expect(schema.parse('hello')).toBe('hello');
    expect(() => schema.parse(123)).toThrow(ValidationError);
  });

  it('preserves subclass methods — constraints before optional still enforced', () => {
    const schema = v.string().min(3).optional();

    expect(schema.parse(undefined)).toBe(undefined);
    expect(schema.parse('hello')).toBe('hello');
    expect(() => schema.parse('hi')).toThrow();
  });

  it('optional number with constraint', () => {
    const schema = v.object({ age: v.number().min(0).optional() });

    expect(schema.parse({})).toEqual({});
    expect(schema.parse({ age: 30 })).toEqual({ age: 30 });
    expect(() => schema.parse({ age: -1 })).toThrow();
  });

  it('infers Output | undefined', () => {
    const schema = v.string().optional();

    type T = Infer<typeof schema>;

    const val: T = undefined;

    expect(schema.parse(val)).toBeUndefined();
  });
});

describe('nullable()', () => {
  it('allows null, still validates non-null values', () => {
    const schema = v.string().nullable();

    expect(schema.parse(null)).toBe(null);
    expect(schema.parse('hello')).toBe('hello');
    expect(() => schema.parse(123)).toThrow(ValidationError);
  });

  it('preserves subclass methods — constraints before nullable still enforced', () => {
    const schema = v.number().min(0).nullable();

    expect(schema.parse(null)).toBe(null);
    expect(schema.parse(5)).toBe(5);
    expect(() => schema.parse(-1)).toThrow();
  });
});

describe('nullish()', () => {
  it('allows both null and undefined', () => {
    const schema = v.string().nullish();

    expect(schema.parse(null)).toBe(null);
    expect(schema.parse(undefined)).toBe(undefined);
    expect(schema.parse('hello')).toBe('hello');
    expect(() => schema.parse(123)).toThrow(ValidationError);
  });

  it('infers Output | null | undefined', () => {
    const schema = v.number().nullish();

    type T = Infer<typeof schema>;

    const n: T = null;
    const u: T = undefined;

    expect(schema.parse(n)).toBeNull();
    expect(schema.parse(u)).toBeUndefined();
  });
});

describe('default()', () => {
  it('substitutes a default for undefined', () => {
    expect(v.string().default('x').parse(undefined)).toBe('x');
    expect(v.string().default('x').parse('y')).toBe('y');
  });

  it('works with objects', () => {
    const schema = v.object({ color: v.string() }).default({ color: 'blue' });

    expect(schema.parse(undefined)).toEqual({ color: 'blue' });
    expect(schema.parse({ color: 'red' })).toEqual({ color: 'red' });
  });
});

describe('catch()', () => {
  it('returns fallback for invalid input instead of throwing', () => {
    const schema = v.string().catch('fallback');

    expect(schema.parse('hello')).toBe('hello');
    expect(schema.parse(42 as any)).toBe('fallback');
  });

  it('works on number schema', () => {
    const schema = v.number().catch(0);

    expect(schema.parse(5)).toBe(5);
    expect(schema.parse('bad' as any)).toBe(0);
  });

  it('works on object schema', () => {
    const schema = v.object({ name: v.string() }).catch({ name: 'unknown' });

    expect(schema.parse('bad' as any)).toEqual({ name: 'unknown' });
  });

  it('retains subclass instance and methods', () => {
    const schema = v.object({ name: v.string() }).catch({ name: 'default' });

    expect(schema.shape).toBeDefined();
    expect(schema.parse({ name: 'Alice' })).toEqual({ name: 'Alice' });
    expect(schema.parse('bad' as any)).toEqual({ name: 'default' });
  });

  it('validators added after catch() are respected', () => {
    const schema = v.string().catch('fallback').min(3);

    expect(schema.parse('hello')).toBe('hello');
    expect(schema.parse(42 as any)).toBe('fallback');
    expect(schema.parse('hi')).toBe('fallback');
  });
});

describe('refine()', () => {
  it('adds sync custom validation', () => {
    const schema = v.number().refine((n) => n % 2 === 0, 'Must be even');

    expect(schema.parse(4)).toBe(4);
    expect(() => schema.parse(3)).toThrow('Must be even');
  });

  it('chains multiple refinements', () => {
    const schema = v
      .string()
      .refine((s) => s.includes('@'), 'Must contain @')
      .refine((s) => s.includes('.'), 'Must contain .');

    expect(schema.parse('a@b.c')).toBe('a@b.c');
    expect(() => schema.parse('nope')).toThrow('Must contain @');
  });

  it('works for cross-field object validation', () => {
    const schema = v
      .object({ confirm: v.string(), password: v.string() })
      .refine((d) => d.password === d.confirm, 'Passwords must match');

    expect(schema.parse({ confirm: 'abc', password: 'abc' })).toEqual({ confirm: 'abc', password: 'abc' });
    expect(() => schema.parse({ confirm: 'xyz', password: 'abc' })).toThrow('Passwords must match');
  });

  it('message function receives the failing value', () => {
    const schema = v.number().refine(
      (n) => n > 0,
      ({ value }) => `${value} is not positive`,
    );

    expect(() => schema.parse(-5)).toThrow('-5 is not positive');
  });

  it('throws at first parse when given an async function', () => {
    const asyncFn = async (_v: string): Promise<boolean> => true;
    const schema = v.string().refine(asyncFn as unknown as (v: string) => boolean);

    expect(() => schema.parse('hello')).toThrow('refine() only accepts sync functions');
  });
});

describe('refineAsync()', () => {
  it('defers to parseAsync and resolves correctly', async () => {
    const schema = v.string().refineAsync(async (s) => {
      await new Promise((r) => setTimeout(r, 1));

      return s.length >= 3;
    }, 'Too short');

    expect(await schema.parseAsync('hello')).toBe('hello');
    await expect(schema.parseAsync('hi')).rejects.toThrow('Too short');
  });

  it('throws when used with sync parse()', async () => {
    const schema = v.string().refineAsync(async () => true);

    expect(() => schema.parse('x')).toThrow('async validators');
  });

  it('cross-field async refinement on object', async () => {
    const schema = v
      .object({ confirm: v.string(), password: v.string() })
      .refineAsync(async (d) => d.password === d.confirm, 'Passwords must match');

    expect(await schema.parseAsync({ confirm: 'abc', password: 'abc' })).toEqual({
      confirm: 'abc',
      password: 'abc',
    });
    await expect(schema.parseAsync({ confirm: 'xyz', password: 'abc' })).rejects.toThrow('Passwords must match');
  });

  it('parseAsync also runs sync refine validators', async () => {
    const schema = v
      .object({ confirm: v.string(), password: v.string() })
      .refine((d) => d.password === d.confirm, 'Passwords must match');
    const ok = await schema.parseAsync({ confirm: 'abc', password: 'abc' });

    expect(ok).toEqual({ confirm: 'abc', password: 'abc' });
    await expect(schema.parseAsync({ confirm: 'xyz', password: 'abc' })).rejects.toThrow('Passwords must match');
  });

  it('message function receives the failing value', async () => {
    const schema = v.string().refineAsync(
      async (s) => s.length >= 3,
      ({ value }) => `"${value}" is too short`,
    );

    await expect(schema.parseAsync('hi')).rejects.toThrow('"hi" is too short');
  });
});

describe('is()', () => {
  it('returns true for valid values', () => {
    expect(v.string().is('hello')).toBe(true);
    expect(v.number().is(42)).toBe(true);
  });

  it('returns false for invalid values', () => {
    expect(v.string().is(123)).toBe(false);
    expect(v.number().is('text')).toBe(false);
  });

  it('narrows the type', () => {
    const val: unknown = 'hi';

    if (v.string().is(val)) {
      expect(val.toUpperCase()).toBe('HI');
    }
  });
});

describe('describe()', () => {
  it('stores a description accessible on the schema', () => {
    const schema = v.string().describe('A human readable name');

    expect(schema.description).toBe('A human readable name');
  });

  it('description does not affect parsing', () => {
    const schema = v.number().min(0).describe('A non-negative number');

    expect(schema.parse(5)).toBe(5);
    expect(() => schema.parse(-1)).toThrow();
  });

  it('transform() preserves the description', () => {
    const schema = v
      .string()
      .describe('raw input')
      .transform((s) => s.toUpperCase());

    expect((schema as any)._description).toBe('raw input');
  });

  it('description getter returns undefined when not set', () => {
    expect(v.number().description).toBeUndefined();
  });
});

describe('brand()', () => {
  it('parse returns a branded value', () => {
    const UserId = v.string().brand<'UserId'>();

    type UserId = Infer<typeof UserId>;

    const id: UserId = UserId.parse('abc');

    expect(id).toBe('abc');
  });

  it('branded schema still validates', () => {
    const schema = v.number().min(0).brand<'PositiveInt'>();

    expect(schema.parse(5)).toBe(5);
    expect(() => schema.parse(-1)).toThrow();
  });
});

describe('Infer<> / InferOutput<>', () => {
  it('infers primitives', () => {
    const s = v.string();

    type S = Infer<typeof s>;

    const val: S = 'hello';

    expect(s.parse(val)).toBe(val);
  });

  it('infers object types', () => {
    const schema = v.object({ id: v.number(), name: v.string() });

    type T = Infer<typeof schema>;

    const obj: T = { id: 1, name: 'Alice' };

    expect(schema.parse(obj)).toEqual(obj);
  });

  it('infers array types', () => {
    const schema = v.array(v.boolean());

    type T = Infer<typeof schema>;

    const arr: T = [true, false];

    expect(schema.parse(arr)).toEqual(arr);
  });

  it('infers optional as T | undefined', () => {
    const schema = v.number().optional();

    type T = Infer<typeof schema>;

    const undef: T = undefined;

    expect(schema.parse(undef)).toBeUndefined();
  });

  it('infers nullable as T | null', () => {
    const schema = v.string().nullable();

    type T = Infer<typeof schema>;

    const nul: T = null;

    expect(schema.parse(nul)).toBeNull();
  });

  it('InferOutput<T> is same as Infer<T> for plain schemas', () => {
    const schema = v.string();

    type Out = InferOutput<typeof schema>;

    const val: Out = 'hello';

    expect(schema.parse(val)).toBe('hello');
  });
});

describe('Schema.required()', () => {
  it('removes optional from any schema', () => {
    const schema = v.string().optional().required();

    expect(schema.safeParse(undefined).success).toBe(false);
    expect(schema.parse('hello')).toBe('hello');
  });

  it('ObjectSchema.required() uses base required()', () => {
    const schema = v.object({ name: v.string().optional() }).required();

    expect(schema.shape.name.safeParse(undefined).success).toBe(false);
  });
});

describe('v.optional() / v.nullable() / v.nullish() shorthands', () => {
  it('v.optional(schema) is equivalent to schema.optional()', () => {
    const a = v.optional(v.string());
    const b = v.string().optional();

    expect(a.parse(undefined)).toBeUndefined();
    expect(a.parse('hello')).toBe('hello');
    expect(b.parse(undefined)).toBeUndefined();
  });

  it('v.nullable(schema) is equivalent to schema.nullable()', () => {
    const a = v.nullable(v.string());

    expect(a.parse(null)).toBeNull();
    expect(a.parse('hello')).toBe('hello');
    expect(() => a.parse(42 as any)).toThrow();
  });

  it('v.optional works with object schemas', () => {
    const schema = v.object({
      bio: v.optional(v.string()),
      name: v.string(),
    });

    expect(schema.parse({ name: 'Alice' })).toEqual({ name: 'Alice' });
    expect(schema.parse({ bio: 'hi', name: 'Alice' })).toEqual({ bio: 'hi', name: 'Alice' });
  });

  it('v.nullish() allows undefined', () => {
    expect(v.nullish(v.string()).parse(undefined)).toBeUndefined();
  });

  it('v.nullish() allows null', () => {
    expect(v.nullish(v.string()).parse(null)).toBeNull();
  });

  it('v.nullish() still validates non-null/undefined values', () => {
    expect(v.nullish(v.string()).parse('hello')).toBe('hello');
    expect(() => v.nullish(v.string()).parse(42 as any)).toThrow();
  });
});
