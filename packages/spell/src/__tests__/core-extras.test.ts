import { descriptorToJsonSchema, s, setLogger } from '../index';

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
// toDescriptor() preprocessor warning
// ---------------------------------------------------------------------------

describe('toDescriptor() preprocessor warning', () => {
  it('emits a warning when the schema has preprocessors', () => {
    const warnings: string[] = [];

    setLogger((msg) => warnings.push(msg));

    s.string().trim().toDescriptor();

    setLogger(null);

    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toMatch(/preprocessor/i);
  });

  it('does not warn for schemas without preprocessors', () => {
    const warnings: string[] = [];

    setLogger((msg) => warnings.push(msg));

    s.string().min(3).toDescriptor();

    setLogger(null);

    expect(warnings.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// UnionSchema async — non-ValidationError re-throw
// ---------------------------------------------------------------------------

describe('UnionSchema async non-ValidationError re-throw', () => {
  it('re-throws unexpected non-ValidationError errors from async branches', async () => {
    const boom = new TypeError('unexpected internal error');
    const badSchema = s.string().validate(async () => {
      throw boom;
    });
    const schema = s.union(s.number(), badSchema);

    await expect(schema.safeParseAsync('hello')).rejects.toThrow('unexpected internal error');
  });

  it('collects ValidationError branch failures normally', async () => {
    const schema = s.union(s.number(), s.string());
    const result = await schema.safeParseAsync(true);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].code).toBe('invalid_union');
    }
  });
});
