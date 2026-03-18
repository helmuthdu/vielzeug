import { type Infer, v } from '../index';

describe('v.union()', () => {
  it('passes when first matching branch wins', () => {
    const schema = v.union(v.string(), v.number());

    expect(schema.parse('hello')).toBe('hello');
    expect(schema.parse(42)).toBe(42);
  });

  it('passes when multiple branches match (first-match, no XOR)', () => {
    const schema = v.union(v.string(), v.string().min(1));

    expect(schema.parse('hello')).toBe('hello');
  });

  it('fails when no branch matches', () => {
    const result = v.union(v.string(), v.number()).safeParse(true);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].code).toBe('invalid_union');
      expect(result.error.issues[0].message).toContain('match');

      const errors = result.error.issues[0].params?.errors as unknown[][];

      expect(Array.isArray(errors)).toBe(true);
      expect(errors.length).toBe(2);
    }
  });

  it('works with object schemas', () => {
    const schema = v.union(
      v.object({ data: v.string(), type: v.literal('ok') }),
      v.object({ message: v.string(), type: v.literal('error') }),
    );

    expect(schema.parse({ data: 'yes', type: 'ok' })).toEqual({ data: 'yes', type: 'ok' });
    expect(schema.parse({ message: 'oops', type: 'error' })).toEqual({ message: 'oops', type: 'error' });
    expect(() => schema.parse({ type: 'unknown' })).toThrow();
  });

  it('infers the union type', () => {
    const schema = v.union(v.string(), v.number());

    type T = Infer<typeof schema>;

    const a: T = 'hello';
    const b: T = 42;

    expect(schema.parse(a)).toBe('hello');
    expect(schema.parse(b)).toBe(42);
  });

  it('accepts raw literal values as shorthand for v.literal()', () => {
    const schema = v.union('a', 'b', 'c');

    expect(schema.parse('a')).toBe('a');
    expect(schema.parse('b')).toBe('b');
    expect(() => schema.parse('d')).toThrow();
  });

  it('mixes raw values and schemas', () => {
    const schema = v.union('yes', 'no', v.number());

    expect(schema.parse('yes')).toBe('yes');
    expect(schema.parse(42)).toBe(42);
    expect(() => schema.parse(true)).toThrow();
  });

  it('infers correct type for raw value shorthand', () => {
    const schema = v.union('light', 'dark');

    type T = Infer<typeof schema>;

    const t: T = 'light';

    expect(schema.parse(t)).toBe('light');
  });
});

describe('v.union() — sync returns branch output', () => {
  it('returns transformed value from matching branch', () => {
    expect(v.union(v.coerce.number(), v.string()).parse('42')).toBe(42);
  });

  it('falls through to second branch when first fails', () => {
    expect(v.union(v.number(), v.string()).parse('hello')).toBe('hello');
  });
});

describe('v.union() — async', () => {
  it('runs async refinements inside branches', async () => {
    const a = v.string().refineAsync(async (s) => s.startsWith('a'), 'Must start with a');
    const b = v.number();
    const schema = v.union(a, b);

    expect(await schema.parseAsync('abc')).toBe('abc');
    expect(await schema.parseAsync(42)).toBe(42);

    const result = await schema.safeParseAsync('xyz');

    expect(result.success).toBe(false);
  });

  it('refine() runs in parseAsync', async () => {
    const schema = v.union(v.string(), v.number()).refine((v) => v !== 0, 'Must not be zero');
    const result = await schema.safeParseAsync(0);

    expect(result.success).toBe(false);
  });

  it('catch() works in parseAsync when no branch matches', async () => {
    const schema = v.union(v.string(), v.number()).catch('fallback' as any);
    const result = await schema.parseAsync(true as any);

    expect(result).toBe('fallback');
  });
});

describe('UnionSchema.schemas introspection', () => {
  it('exposes .schemas', () => {
    const s1 = v.string();
    const s2 = v.number();
    const schema = v.union(s1, s2);

    expect(schema.schemas).toHaveLength(2);
  });
});
