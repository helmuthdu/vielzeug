import { descriptorToJsonSchema, fromDescriptor, s } from '../index';

// ---------------------------------------------------------------------------
// descriptorToJsonSchema() as standalone function
// ---------------------------------------------------------------------------

describe('descriptorToJsonSchema() standalone', () => {
  it('accepts a descriptor directly and returns the same output as toJsonSchema()', () => {
    const schema = s.string().min(3).max(50);
    const descriptor = schema.toDescriptor();

    expect(descriptorToJsonSchema(descriptor)).toEqual(schema.toJsonSchema());
  });

  it('handles nullable wrapping', () => {
    const schema = s.number().nullable();
    const result = descriptorToJsonSchema(schema.toDescriptor());

    expect(result).toHaveProperty('anyOf');
    expect(result).toMatchObject({
      anyOf: expect.arrayContaining([{ type: 'null' }, { type: 'number' }]),
    });
  });

  it('handles description annotation', () => {
    const schema = s.boolean().label('is active');
    const result = descriptorToJsonSchema(schema.toDescriptor());

    expect(result).toMatchObject({ description: 'is active', type: 'boolean' });
  });

  it('handles object schemas with nested descriptors', () => {
    const schema = s.object({ age: s.number(), name: s.string() });
    const result = descriptorToJsonSchema(schema.toDescriptor());

    expect(result).toMatchObject({
      properties: {
        age: { type: 'number' },
        name: { type: 'string' },
      },
      type: 'object',
    });
  });
});

// ---------------------------------------------------------------------------
// fromDescriptor() error paths
// ---------------------------------------------------------------------------

describe('fromDescriptor() unsupported kinds', () => {
  it('throws for lazy descriptors', () => {
    expect(() => fromDescriptor({ kind: 'lazy' } as any)).toThrow(/lazy/i);
  });

  it('throws for pipe descriptors', () => {
    expect(() => fromDescriptor({ kind: 'pipe' } as any)).toThrow(/pipe/i);
  });

  it('throws for instanceof descriptors', () => {
    expect(() => fromDescriptor({ kind: 'instanceof' } as any)).toThrow(/instanceof/i);
  });

  it('throws for variant descriptors', () => {
    expect(() => fromDescriptor({ kind: 'variant' } as any)).toThrow(/variant/i);
  });

  it('throws for completely unknown kinds', () => {
    expect(() => fromDescriptor({ kind: 'nonexistent' } as any)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// fromDescriptor() tuple rest round-trip
// ---------------------------------------------------------------------------

describe('fromDescriptor() tuple rest round-trip', () => {
  it('preserves the rest schema through a descriptor round-trip', () => {
    const schema = s.tuple([s.string(), s.number()]).rest(s.boolean());
    const reconstructed = fromDescriptor(schema.toDescriptor());

    // Valid input with rest elements
    expect(reconstructed.parse(['hello', 42, true, false])).toEqual(['hello', 42, true, false]);
    // Invalid rest element
    expect(() => reconstructed.parse(['hello', 42, 'not-a-boolean'])).toThrow();
  });

  it('round-trips tuple without rest correctly', () => {
    const schema = s.tuple([s.string(), s.number()]);
    const reconstructed = fromDescriptor(schema.toDescriptor());

    expect(reconstructed.parse(['hello', 42])).toEqual(['hello', 42]);
  });
});

describe('fromDescriptor() reconstructible fidelity', () => {
  it('preserves base fields and relaxed object descriptors', () => {
    const schema = s.object({ email: s.string().email().optional() }).relaxed().nullable().label('User');
    const reconstructed = fromDescriptor(schema.toDescriptor());

    expect(reconstructed.toDescriptor()).toEqual(schema.toDescriptor());
    expect(reconstructed.parse(null)).toBeNull();
    expect(reconstructed.parse({ email: 'person@example.com', extra: true })).toEqual({
      email: 'person@example.com',
      extra: true,
    });
  });

  it('preserves strict object mode through a descriptor round-trip', () => {
    const schema = s.object({ id: s.number() }).label('Strict user');
    const reconstructed = fromDescriptor(schema.toDescriptor());

    expect(reconstructed.toDescriptor()).toEqual(schema.toDescriptor());
    expect(reconstructed.parse({ id: 1 })).toEqual({ id: 1 });
    expect(reconstructed.safeParse({ extra: true, id: 1 }).success).toBe(false);
  });

  it('preserves exclusiveMinimum, multipleOf, and integer type hints', () => {
    const schema = s.number().int().multipleOf(2).positive().optional().label('Count');
    const reconstructed = fromDescriptor(schema.toDescriptor());

    expect(reconstructed.toDescriptor()).toEqual(schema.toDescriptor());
    expect(reconstructed.parse(4)).toBe(4);
    expect(reconstructed.safeParse(0).success).toBe(false);
    expect(() => reconstructed.parse(3)).toThrow();
  });

  it('preserves exclusiveMaximum through a descriptor round-trip', () => {
    const schema = s.number().negative().label('Debt');
    const reconstructed = fromDescriptor(schema.toDescriptor());

    expect(reconstructed.toDescriptor()).toEqual(schema.toDescriptor());
    expect(reconstructed.parse(-1)).toBe(-1);
    expect(reconstructed.safeParse(0).success).toBe(false);
  });

  it('preserves string formats and base fields through a descriptor round-trip', () => {
    const schema = s.string().url().nullish().label('Website');
    const reconstructed = fromDescriptor(schema.toDescriptor());

    expect(reconstructed.toDescriptor()).toEqual(schema.toDescriptor());
    expect(reconstructed.parse(undefined)).toBeUndefined();
    expect(reconstructed.parse(null)).toBeNull();
    expect(reconstructed.parse('https://example.com')).toBe('https://example.com');
  });

  it('preserves reconstructible string annotations', () => {
    const schema = s
      .string()
      .regex(/^dG9rZW4=$/)
      .base64()
      .nullable()
      .label('Token');
    const reconstructed = fromDescriptor(schema.toDescriptor());

    expect(reconstructed.toDescriptor()).toEqual(schema.toDescriptor());
    expect(reconstructed.parse('dG9rZW4=')).toBe('dG9rZW4=');
    expect(() => reconstructed.parse('plain-text')).toThrow();
  });
});
