import { type Infer, v } from '../index';

describe('v.enum()', () => {
  const Status = v.enum(['active', 'inactive', 'pending'] as const);

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
    const schema = v.enum(['low', 'medium', 'high'] as const);

    expect(schema.parse('low')).toBe('low');
    expect(() => schema.parse('extreme')).toThrow();
  });
});

describe('v.nativeEnum()', () => {
  const Direction = { Down: 'DOWN', Up: 'UP' } as const;
  const schema = v.nativeEnum(Direction);

  it('accepts values in the enum', () => {
    expect(schema.parse('UP')).toBe('UP');
    expect(schema.parse('DOWN')).toBe('DOWN');
  });

  it('rejects values not in the enum', () => {
    const result = schema.safeParse('LEFT');

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0].code).toBe('invalid_enum');
  });

  it('infers the value union type', () => {
    type T = Infer<typeof schema>;

    const val: T = 'UP';

    expect(schema.parse(val)).toBe('UP');
  });

  it('exposes the original enum object as .enum', () => {
    expect(schema.enum).toBe(Direction);
  });

  it('works with numeric enums (reverse-mapping keys are excluded)', () => {
    const Prio = { High: 2, Low: 0, Medium: 1 } as const;
    const s = v.nativeEnum(Prio);

    expect(s.parse(1)).toBe(1);
    expect(() => s.parse(3)).toThrow();
  });
});
