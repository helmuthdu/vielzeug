import { ErrorCode, s } from '../index';

describe('validate() sync', () => {
  it('accepts boolean/string shorthand (condition || message)', () => {
    const schema = s.number().validate((n) => n % 2 === 0 || 'Must be even');

    expect(schema.parse(4)).toBe(4);
    expect(() => schema.parse(3)).toThrow('Must be even');
  });

  it('accepts boolean true as pass', () => {
    const schema = s.number().validate((n) => n > 0);

    expect(schema.parse(5)).toBe(5);
    expect(schema.safeParse(-1).success).toBe(false);
  });

  it('returns no error when validate returns null or void', () => {
    const schema = s.number().validate((n) => (n > 0 ? null : 'Must be positive'));

    expect(schema.parse(1)).toBe(1);
    expect(() => schema.parse(-1)).toThrow('Must be positive');
  });

  it('supports explicit issues through ctx.addIssue()', () => {
    const schema = s.string().validate((value, ctx) => {
      if (value.length < 3) {
        ctx.addIssue({ code: ErrorCode.custom, message: 'Too short', path: [] });
      }
    });

    expect(() => schema.parse('hi')).toThrow('Too short');
  });

  it('supports ctx.addIssue() with custom path', () => {
    const schema = s.object({ a: s.string(), b: s.string() }).validate(({ a, b }, ctx) => {
      if (a === b) {
        ctx.addIssue({ code: ErrorCode.custom, message: 'Values must differ', path: ['a'] });
      }
    });

    const result = schema.safeParse({ a: 'x', b: 'x' });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['a']);
    }
  });

  it('treats ctx.addIssue({ path }) as relative to current schema path', () => {
    const schema = s.object({
      user: s
        .object({ email: s.string() })
        .validate((_, ctx) => ctx.addIssue({ code: ErrorCode.custom, message: 'Bad nested field', path: ['email'] })),
    });

    const result = schema.safeParse({ user: { email: 'ok@example.com' } });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['user', 'email']);
    }
  });

  it('runs object-level validate() even when a field is invalid using partial parsed data', () => {
    const schema = s
      .object({ age: s.number(), name: s.string() })
      .validate((data) => ('name' in data ? true : 'Name is required for cross-field checks'));

    const result = schema.safeParse({ age: 42, name: 123 as any });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'Name is required for cross-field checks')).toBe(
        true,
      );
    }
  });

  it('can chain multiple validate() calls', () => {
    const schema = s
      .string()
      .validate((s) => s.includes('@') || 'Must contain @')
      .validate((s) => s.includes('.') || 'Must contain .');

    expect(schema.parse('a@b.c')).toBe('a@b.c');

    const result = schema.safeParse('nope');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toHaveLength(2);
      expect(result.error.issues.map((issue) => issue.message)).toEqual(['Must contain @', 'Must contain .']);
    }
  });
});

describe('validate() async', () => {
  it('runs async validation in parseAsync()', async () => {
    const schema = s.string().validate(async (s) => s.length >= 3 || 'Too short');

    await expect(schema.parseAsync('hello')).resolves.toBe('hello');
    await expect(schema.parseAsync('hi')).rejects.toThrow('Too short');
  });

  it('async validate() is ignored in sync parse() (Promise returned is not awaited)', async () => {
    const schema = s.string().validate(async () => 'Always fails');

    expect(schema.parse('x')).toBe('x');
  });

  it('validate() works with parseAsync() for object cross-field checks', async () => {
    const schema = s.object({ confirm: s.string(), password: s.string() }).validate((d) => {
      return d.password === d.confirm || 'Passwords must match';
    });

    await expect(schema.parseAsync({ confirm: 'abc', password: 'abc' })).resolves.toEqual({
      confirm: 'abc',
      password: 'abc',
    });
    await expect(schema.parseAsync({ confirm: 'xyz', password: 'abc' })).rejects.toThrow('Passwords must match');
  });

  it('async validate() errors are caught in parseAsync()', async () => {
    const schema = s.string().validate(async (v) => (v.startsWith('x') ? null : 'Must start with x'));

    await expect(schema.parseAsync('xyz')).resolves.toBe('xyz');
    await expect(schema.parseAsync('abc')).rejects.toThrow('Must start with x');
  });
});

describe('refine() alias', () => {
  it('behaves identically to check(predicate, message)', () => {
    const schema = s.number().refine(
      (n) => n > 0,
      () => 'Must be positive',
    );

    expect(schema.parse(1)).toBe(1);
    expect(() => schema.parse(-1)).toThrow('Must be positive');
  });

  it('works without a message (uses default custom message)', () => {
    const schema = s.string().refine((v) => v.length > 2);

    expect(schema.parse('abc')).toBe('abc');
    expect(() => schema.parse('ab')).toThrow();
  });

  it('can chain multiple refine() calls', () => {
    const schema = s
      .string()
      .refine(
        (v) => v.includes('@'),
        () => 'Must contain @',
      )
      .refine(
        (v) => v.includes('.'),
        () => 'Must contain .',
      );

    expect(schema.parse('a@b.c')).toBe('a@b.c');

    const result = schema.safeParse('nope');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toHaveLength(2);
    }
  });

  it('is chainable on any schema type', () => {
    const schema = s.object({ n: s.number() }).refine(
      (v) => v.n > 0,
      () => 'n must be positive',
    );

    expect(() => schema.parse({ n: -1 })).toThrow('n must be positive');
  });
});

describe('validation execution guardrails', () => {
  it('bails after invalid_type before running constraint checks', () => {
    const result = s.string().min(3).max(10).safeParse(42);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0].code).toBe('invalid_type');
    }
  });

  it('runs constraint validators when type is valid', () => {
    const result = s.string().min(10).safeParse('hi');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].code).toBe('too_small');
    }
  });
});
