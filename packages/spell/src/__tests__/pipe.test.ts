import { s } from '../index';

describe('Schema.pipe()', () => {
  it('chains two schemas — output of first is input to second', () => {
    const schema = s.string().pipe(s.coerce.number().int().min(1).max(100));

    expect(schema.parse('42')).toBe(42);
    expect(() => schema.parse('0')).toThrow();
    expect(() => schema.parse('abc')).toThrow();
  });

  it('surfaces errors from the first schema when input type is wrong', () => {
    const schema = s.string().pipe(s.string().email());
    const result = schema.safeParse(123);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].code).toBe('invalid_type');
    }
  });

  it('surfaces errors from the second schema when first passes', () => {
    const schema = s.string().pipe(s.string().email());
    const result = schema.safeParse('not-an-email');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].code).toBe('invalid_string');
    }
  });

  it('works with .trim().pipe() for pre-processing before validation', () => {
    const schema = s.string().trim().pipe(s.string().email());

    expect(schema.parse('  alice@example.com  ')).toBe('alice@example.com');
  });

  it('preserves .optional() chained after .pipe()', () => {
    const schema = s.string().pipe(s.string().min(3)).optional();

    expect(schema.parse(undefined)).toBeUndefined();
    expect(schema.parse('hello')).toBe('hello');
  });

  it('works with async parseAsync()', async () => {
    const schema = s.string().pipe(s.coerce.number());

    await expect(schema.parseAsync('3.14')).resolves.toBe(3.14);
  });

  it('chains three schemas via multiple .pipe() calls', () => {
    const schema = s.string().trim().pipe(s.string().min(1)).pipe(s.string().email());

    expect(schema.parse('  alice@example.com  ')).toBe('alice@example.com');
    expect(() => schema.parse('  ')).toThrow();
  });
});
