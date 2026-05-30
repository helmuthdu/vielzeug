import { type Infer, s } from '../index';

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
