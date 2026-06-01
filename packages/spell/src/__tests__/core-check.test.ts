import { ErrorCode, ValidationError, s } from '../index';

describe('check() sync', () => {
  it('accepts boolean/string style checks', () => {
    const schema = s.number().check((n) => n % 2 === 0 || 'Must be even');

    expect(schema.parse(4)).toBe(4);
    expect(() => schema.parse(3)).toThrow('Must be even');
  });

  it('uses default message when check returns false', () => {
    const schema = s.number().check((n) => n > 0 || false);

    expect(() => schema.parse(-1)).toThrow('Invalid value');
  });

  it('supports explicit issues through ctx.addIssue()', () => {
    const schema = s.string().check((value, ctx) => {
      if (value.length < 3) {
        ctx.addIssue({ code: ErrorCode.custom, message: 'Too short', path: [] });
      }
    });

    expect(() => schema.parse('hi')).toThrow('Too short');
  });

  it('supports ctx.addIssue() with custom path', () => {
    const schema = s.object({ a: s.string(), b: s.string() }).check(({ a, b }, ctx) => {
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
        .check((_, ctx) => ctx.addIssue({ code: ErrorCode.custom, message: 'Bad nested field', path: ['email'] })),
    });

    const result = schema.safeParse({ user: { email: 'ok@example.com' } });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['user', 'email']);
    }
  });

  it('runs object-level checks even when a field is invalid using partial parsed data', () => {
    const schema = s
      .object({ age: s.number(), name: s.string() })
      .check((data) => ('name' in data ? true : 'Name is required for cross-field checks'));

    const result = schema.safeParse({ age: 42, name: 123 as any });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'Name is required for cross-field checks')).toBe(
        true,
      );
    }
  });

  it('can chain multiple checks', () => {
    const schema = s
      .string()
      .check((s) => s.includes('@') || 'Must contain @')
      .check((s) => s.includes('.') || 'Must contain .');

    expect(schema.parse('a@b.c')).toBe('a@b.c');

    const result = schema.safeParse('nope');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toHaveLength(2);
      expect(result.error.issues.map((issue) => issue.message)).toEqual(['Must contain @', 'Must contain .']);
    }
  });
});

describe('checkAsync()', () => {
  it('runs async checks in parseAsync()', async () => {
    const schema = s.string().checkAsync(async (s) => s.length >= 3 || 'Too short');

    await expect(schema.parseAsync('hello')).resolves.toBe('hello');
    await expect(schema.parseAsync('hi')).rejects.toThrow('Too short');
  });

  it('rejects sync parse() when check() callback returns a Promise', () => {
    const schema = s.string().check(async () => true);

    expect(() => schema.parse('x')).toThrow(
      'check() callback returned a Promise. Use checkAsync() for async validation.',
    );
  });

  it('throws ValidationError (not raw Error) when check() returns a Promise', () => {
    const schema = s.string().check(async () => true);

    let caught: unknown;

    try {
      schema.parse('x');
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(ValidationError);
  });

  it('checkAsync() works with parseAsync()', async () => {
    const schema = s.object({ confirm: s.string(), password: s.string() }).check((d) => {
      return d.password === d.confirm || 'Passwords must match';
    });

    await expect(schema.parseAsync({ confirm: 'abc', password: 'abc' })).resolves.toEqual({
      confirm: 'abc',
      password: 'abc',
    });
    await expect(schema.parseAsync({ confirm: 'xyz', password: 'abc' })).rejects.toThrow('Passwords must match');
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
