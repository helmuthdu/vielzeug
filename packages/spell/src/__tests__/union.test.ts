import { type Infer, s } from '../index';

describe('s.union()', () => {
  it('passes when first matching branch wins', () => {
    const schema = s.union(s.string(), s.number());

    expect(schema.parse('hello')).toBe('hello');
    expect(schema.parse(42)).toBe(42);
  });

  it('passes when multiple branches match (first-match, no XOR)', () => {
    const schema = s.union(s.string(), s.string().min(1));

    expect(schema.parse('hello')).toBe('hello');
  });

  it('fails when no branch matches', () => {
    const result = s.union(s.string(), s.number()).safeParse(true);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].code).toBe('invalid_union');
      expect(result.error.issues[0].message).toContain('match');

      const errors = (result.error.issues[0] as any).params?.errors as unknown[][];

      expect(Array.isArray(errors)).toBe(true);
      expect(errors.length).toBe(2);
    }
  });

  it('works with object schemas', () => {
    const schema = s.union(
      s.object({ data: s.string(), type: s.literal('ok') }),
      s.object({ message: s.string(), type: s.literal('error') }),
    );

    expect(schema.parse({ data: 'yes', type: 'ok' })).toEqual({ data: 'yes', type: 'ok' });
    expect(schema.parse({ message: 'oops', type: 'error' })).toEqual({ message: 'oops', type: 'error' });
    expect(() => schema.parse({ type: 'unknown' })).toThrow();
  });

  it('infers the union type', () => {
    const schema = s.union(s.string(), s.number());

    type T = Infer<typeof schema>;

    const a: T = 'hello';
    const b: T = 42;

    expect(schema.parse(a)).toBe('hello');
    expect(schema.parse(b)).toBe(42);
  });

  it('accepts raw literal values as shorthand for s.literal()', () => {
    const schema = s.union('a', 'b', 'c');

    expect(schema.parse('a')).toBe('a');
    expect(schema.parse('b')).toBe('b');
    expect(() => schema.parse('d')).toThrow();
  });

  it('mixes raw values and schemas', () => {
    const schema = s.union('yes', 'no', s.number());

    expect(schema.parse('yes')).toBe('yes');
    expect(schema.parse(42)).toBe(42);
    expect(() => schema.parse(true)).toThrow();
  });

  it('infers correct type for raw value shorthand', () => {
    const schema = s.union('light', 'dark');

    type T = Infer<typeof schema>;

    const t: T = 'light';

    expect(schema.parse(t)).toBe('light');
  });
});

describe('s.union() — sync returns branch output', () => {
  it('returns transformed value from matching branch', () => {
    expect(s.union(s.coerce.number(), s.string()).parse('42')).toBe(42);
  });

  it('falls through to second branch when first fails', () => {
    expect(s.union(s.number(), s.string()).parse('hello')).toBe('hello');
  });
});

describe('s.union() — async', () => {
  it('runs async refinements inside branches', async () => {
    const a = s.string().checkAsync(async (s) => s.startsWith('a') || 'Must start with a');
    const b = s.number();
    const schema = s.union(a, b);

    expect(await schema.parseAsync('abc')).toBe('abc');
    expect(await schema.parseAsync(42)).toBe(42);

    const result = await schema.safeParseAsync('xyz');

    expect(result.success).toBe(false);
  });

  it('check() runs in parseAsync', async () => {
    const schema = s.union(s.string(), s.number()).check((v) => v !== 0 || 'Must not be zero');
    const result = await schema.safeParseAsync(0);

    expect(result.success).toBe(false);
  });

  it('catch() works in parseAsync when no branch matches', async () => {
    const schema = s.union(s.string(), s.number()).catch('fallback' as any);
    const result = await schema.parseAsync(true as any);

    expect(result).toBe('fallback');
  });

  it('runs all branches in parallel and returns the first success', async () => {
    const calls: string[] = [];
    const schema = s.union(
      s.string().checkAsync(async (value) => {
        calls.push('first');

        return value === 'ok' || 'first failed';
      }),
      s.string().checkAsync(async () => {
        calls.push('second');

        return true;
      }),
    );

    const result = await schema.parseAsync('ok');

    expect(result).toBe('ok');
    // All branches run in parallel (Promise.any semantics); both are started.
    expect(calls.sort()).toEqual(['first', 'second']);
  });
});

describe('UnionSchema.schemas introspection', () => {
  it('exposes .schemas', () => {
    const s1 = s.string();
    const s2 = s.number();
    const schema = s.union(s1, s2);

    expect(schema.schemas).toHaveLength(2);
  });
});

describe('s.or() alias', () => {
  it('is equivalent to s.union() with two schemas', () => {
    const schema = s.or(s.string(), s.number());

    expect(schema.parse('hello')).toBe('hello');
    expect(schema.parse(42)).toBe(42);
    expect(schema.safeParse(true).success).toBe(false);
  });
});

describe('s.union() — async non-ValidationError branch throw', () => {
  it('does not include non-ValidationError branch throws in branchErrors', async () => {
    const badSchema = s.string().checkAsync(async () => {
      throw new Error('unexpected internal error');
    });
    const goodSchema = s.number();
    const schema = s.union(badSchema, goodSchema);

    await expect(schema.parseAsync(42)).resolves.toBe(42);
  });
});
