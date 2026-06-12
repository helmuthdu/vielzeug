import { s } from '../index';

describe('s.intersect()', () => {
  it('passes when all schemas match', () => {
    const schema = s.intersect(s.string(), s.string().min(5));

    expect(schema.parse('hello')).toBe('hello');
  });

  it('collects issues from failing branches', () => {
    const schema = s.intersect(s.string().min(3), s.string().max(5));
    const result = schema.safeParse('toolongstring');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  it('fails if any branch fails', () => {
    const result = s.intersect(s.string(), s.number()).safeParse('hello');

    expect(result.success).toBe(false);
  });

  it('works for object-level combined validation', () => {
    const A = s.object({ id: s.number() }).relaxed();
    const B = s.object({ name: s.string() }).relaxed();
    const schema = s.intersect(A, B);

    expect(schema.safeParse({ id: 1, name: 'Alice' }).success).toBe(true);
    expect(schema.safeParse({ id: 1 }).success).toBe(false);
  });

  it('deep-merges nested object fields from all branches', () => {
    const A = s.object({ nested: s.object({ a: s.string() }).relaxed() }).relaxed();
    const B = s.object({ nested: s.object({ b: s.number() }).relaxed() }).relaxed();
    const schema = s.intersect(A, B);
    const result = schema.parse({ nested: { a: 'hello', b: 42 } });

    expect((result as any).nested.a).toBe('hello');
    expect((result as any).nested.b).toBe(42);
  });

  it('deep-merges declared constructor fields without mutating the result prototype', () => {
    const left = s.object({ constructor: s.object({ left: s.boolean() }).relaxed() }).relaxed();
    const right = s.object({ constructor: s.object({ right: s.boolean() }).relaxed() }).relaxed();
    const result = s.intersect(left, right).parse({ constructor: { left: true, right: true } }) as Record<
      string,
      unknown
    >;

    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.getOwnPropertyDescriptor(result, 'constructor')?.value).toEqual({ left: true, right: true });
  });

  it('accepts raw literal values as shorthand for s.literal()', () => {
    const schema = s.intersect('hello', 'hello');

    expect(schema.parse('hello')).toBe('hello');
    expect(() => schema.parse('world')).toThrow();
  });
});

describe('s.intersect() — async', () => {
  it('runs async refinements on all branches', async () => {
    const a = s.string().checkAsync(async (s) => s.length >= 3 || 'Too short');
    const b = s.string().checkAsync(async (s) => s.length <= 10 || 'Too long');
    const schema = s.intersect(a, b);

    expect(await schema.parseAsync('hello')).toBe('hello');
    await expect(schema.parseAsync('hi')).rejects.toThrow();
  });

  it('refine() runs in parseAsync', async () => {
    const schema = s.intersect(s.string(), s.string().min(1)).check((v) => v !== 'forbidden' || 'Forbidden value');
    const result = await schema.safeParseAsync('forbidden');

    expect(result.success).toBe(false);
  });
});

describe('s.and() alias', () => {
  it('is equivalent to s.intersect() with two schemas', () => {
    const schema = s.and(s.string(), s.string().min(3));

    expect(schema.parse('hello')).toBe('hello');
    expect(() => schema.parse('hi')).toThrow();
  });
});

describe('IntersectSchema.schemas introspection', () => {
  it('exposes .schemas', () => {
    const s1 = s.string();
    const s2 = s.string().min(3);
    const schema = s.intersect(s1, s2);

    expect(schema.schemas).toHaveLength(2);
  });
});
