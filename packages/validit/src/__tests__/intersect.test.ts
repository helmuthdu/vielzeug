import { v } from '../index';

describe('v.intersect()', () => {
  it('passes when all schemas match', () => {
    const schema = v.intersect(v.string(), v.string().min(5));

    expect(schema.parse('hello')).toBe('hello');
  });

  it('collects issues from failing branches', () => {
    const schema = v.intersect(v.string().min(3), v.string().max(5));
    const result = schema.safeParse('toolongstring');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  it('fails if any branch fails', () => {
    const result = v.intersect(v.string(), v.number()).safeParse('hello');

    expect(result.success).toBe(false);
  });

  it('works for object-level combined validation', () => {
    const A = v.object({ id: v.number() });
    const B = v.object({ name: v.string() });
    const schema = v.intersect(A, B);

    expect(schema.safeParse({ id: 1, name: 'Alice' }).success).toBe(true);
    expect(schema.safeParse({ id: 1 }).success).toBe(false);
  });

  it('accepts raw literal values as shorthand for v.literal()', () => {
    const schema = v.intersect('hello', 'hello');

    expect(schema.parse('hello')).toBe('hello');
    expect(() => schema.parse('world')).toThrow();
  });
});

describe('v.intersect() — async', () => {
  it('runs async refinements on all branches', async () => {
    const a = v.string().refineAsync(async (s) => s.length >= 3, 'Too short');
    const b = v.string().refineAsync(async (s) => s.length <= 10, 'Too long');
    const schema = v.intersect(a, b);

    expect(await schema.parseAsync('hello')).toBe('hello');
    await expect(schema.parseAsync('hi')).rejects.toThrow();
  });

  it('refine() runs in parseAsync', async () => {
    const schema = v.intersect(v.string(), v.string().min(1)).refine((v) => v !== 'forbidden', 'Forbidden value');
    const result = await schema.safeParseAsync('forbidden');

    expect(result.success).toBe(false);
  });
});

describe('IntersectSchema.schemas introspection', () => {
  it('exposes .schemas', () => {
    const s1 = v.string();
    const s2 = v.string().min(3);
    const schema = v.intersect(s1, s2);

    expect(schema.schemas).toHaveLength(2);
  });
});
