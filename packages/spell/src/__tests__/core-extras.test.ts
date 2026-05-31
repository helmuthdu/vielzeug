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
