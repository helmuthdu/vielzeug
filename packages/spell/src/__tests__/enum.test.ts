import { type Infer, s } from '../index';

describe('s.enum()', () => {
  const Status = s.enum(['active', 'inactive', 'pending'] as const);

  it('accepts values in the enum', () => {
    expect(Status.parse('active')).toBe('active');
    expect(Status.parse('inactive')).toBe('inactive');
  });

  it('rejects values not in the enum', () => {
    const result = Status.safeParse('deleted');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].code).toBe('invalid_enum');
    }
  });

  it('infers the union literal type', () => {
    type T = Infer<typeof Status>;

    const val: T = 'active';

    expect(Status.parse(val)).toBe('active');
  });

  it('works with different string values', () => {
    const schema = s.enum(['low', 'medium', 'high'] as const);

    expect(schema.parse('low')).toBe('low');
    expect(() => schema.parse('extreme')).toThrow();
  });

  it('exposes .values on the schema', () => {
    expect(Status.values).toEqual(['active', 'inactive', 'pending']);
  });

  it('accepts number values', () => {
    const schema = s.enum([1, 2, 3] as const);

    expect(schema.parse(1)).toBe(1);
    expect(() => schema.parse(4)).toThrow();
  });
});
