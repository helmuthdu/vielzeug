import { s } from '../index';

describe('toJsonSchema()', () => {
  // ---------------------------------------------------------------------------
  // Primitives
  // ---------------------------------------------------------------------------

  describe('primitives', () => {
    it('string', () => {
      expect(s.string().toJsonSchema()).toEqual({ type: 'string' });
    });

    it('number', () => {
      expect(s.number().toJsonSchema()).toEqual({ type: 'number' });
    });

    it('boolean', () => {
      expect(s.boolean().toJsonSchema()).toEqual({ type: 'boolean' });
    });

    it('bigint → integer', () => {
      expect(s.bigint().toJsonSchema()).toEqual({ type: 'integer' });
    });

    it('any / unknown → {}', () => {
      expect(s.any().toJsonSchema()).toEqual({});
      expect(s.unknown().toJsonSchema()).toEqual({});
    });

    it('never → not: {}', () => {
      expect(s.never().toJsonSchema()).toEqual({ not: {} });
    });
  });

  // ---------------------------------------------------------------------------
  // Literals
  // ---------------------------------------------------------------------------

  describe('literal', () => {
    it('string literal → const', () => {
      expect(s.literal('hello').toJsonSchema()).toEqual({ const: 'hello' });
    });

    it('number literal → const', () => {
      expect(s.literal(42).toJsonSchema()).toEqual({ const: 42 });
    });

    it('boolean literal → const', () => {
      expect(s.literal(true).toJsonSchema()).toEqual({ const: true });
    });

    it('null literal → type: null', () => {
      expect(s.null().toJsonSchema()).toEqual({ type: 'null' });
    });

    it('undefined literal → {}', () => {
      expect(s.undefined().toJsonSchema()).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // Enum
  // ---------------------------------------------------------------------------

  describe('enum', () => {
    it('converts enum values to JSON Schema enum', () => {
      expect(s.enum(['a', 'b', 'c'] as const).toJsonSchema()).toEqual({ enum: ['a', 'b', 'c'] });
    });

    it('handles mixed string/number enums', () => {
      expect(s.enum([1, 2, 'three'] as const).toJsonSchema()).toEqual({ enum: [1, 2, 'three'] });
    });
  });

  // ---------------------------------------------------------------------------
  // Object
  // ---------------------------------------------------------------------------

  describe('object', () => {
    it('required fields appear in required array', () => {
      expect(
        s
          .object({
            age: s.number(),
            name: s.string(),
          })
          .toJsonSchema(),
      ).toEqual({
        additionalProperties: false,
        properties: {
          age: { type: 'number' },
          name: { type: 'string' },
        },
        required: ['age', 'name'],
        type: 'object',
      });
    });

    it('optional fields are omitted from required array', () => {
      expect(
        s
          .object({
            bio: s.string().optional(),
            name: s.string(),
          })
          .toJsonSchema(),
      ).toEqual({
        additionalProperties: false,
        properties: {
          bio: { type: 'string' },
          name: { type: 'string' },
        },
        required: ['name'],
        type: 'object',
      });
    });

    it('all-optional object has no required array', () => {
      const result = s.object({ x: s.number().optional() }).toJsonSchema();

      expect(result).not.toHaveProperty('required');
    });

    it('nested objects recurse correctly', () => {
      const objSchema = s.object({
        address: s.object({ city: s.string(), zip: s.string() }),
      });

      expect(objSchema.toJsonSchema()).toEqual({
        additionalProperties: false,
        properties: {
          address: {
            additionalProperties: false,
            properties: {
              city: { type: 'string' },
              zip: { type: 'string' },
            },
            required: ['city', 'zip'],
            type: 'object',
          },
        },
        required: ['address'],
        type: 'object',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Array
  // ---------------------------------------------------------------------------

  describe('array', () => {
    it('wraps item schema', () => {
      expect(s.array(s.string()).toJsonSchema()).toEqual({
        items: { type: 'string' },
        type: 'array',
      });
    });

    it('handles nested object items', () => {
      expect(s.array(s.object({ id: s.number() })).toJsonSchema()).toEqual({
        items: {
          additionalProperties: false,
          properties: { id: { type: 'number' } },
          required: ['id'],
          type: 'object',
        },
        type: 'array',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Tuple
  // ---------------------------------------------------------------------------

  describe('tuple', () => {
    it('converts items to prefixItems with no-additional-items', () => {
      expect(s.tuple([s.string(), s.number()]).toJsonSchema()).toEqual({
        items: false,
        prefixItems: [{ type: 'string' }, { type: 'number' }],
        type: 'array',
      });
    });

    it('includes rest schema as items', () => {
      expect(s.tuple([s.string()]).rest(s.number()).toJsonSchema()).toEqual({
        items: { type: 'number' },
        prefixItems: [{ type: 'string' }],
        type: 'array',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Record
  // ---------------------------------------------------------------------------

  describe('record', () => {
    it('uses additionalProperties for value schema', () => {
      expect(s.record(s.string(), s.number()).toJsonSchema()).toEqual({
        additionalProperties: { type: 'number' },
        type: 'object',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Union / Intersect
  // ---------------------------------------------------------------------------

  describe('union', () => {
    it('converts to anyOf', () => {
      expect(s.union(s.string(), s.number()).toJsonSchema()).toEqual({
        anyOf: [{ type: 'string' }, { type: 'number' }],
      });
    });
  });

  describe('intersect', () => {
    it('converts to allOf', () => {
      expect(s.intersect(s.object({ a: s.string() }), s.object({ b: s.number() })).toJsonSchema()).toEqual({
        allOf: [
          {
            additionalProperties: false,
            properties: { a: { type: 'string' } },
            required: ['a'],
            type: 'object',
          },
          {
            additionalProperties: false,
            properties: { b: { type: 'number' } },
            required: ['b'],
            type: 'object',
          },
        ],
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Variant
  // ---------------------------------------------------------------------------

  describe('variant', () => {
    it('converts to oneOf with discriminator annotation', () => {
      const variantSchema = s.variant('type', {
        circle: s.object({ radius: s.number() }),
        rect: s.object({ height: s.number(), width: s.number() }),
      });

      const result = variantSchema.toJsonSchema();

      expect(result['discriminator']).toEqual({ propertyName: 'type' });
      expect(Array.isArray(result['oneOf'])).toBe(true);
      expect((result['oneOf'] as unknown[]).length).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Modifiers
  // ---------------------------------------------------------------------------

  describe('nullable', () => {
    it('wraps in anyOf with null', () => {
      expect(s.string().nullable().toJsonSchema()).toEqual({
        anyOf: [{ type: 'string' }, { type: 'null' }],
      });
    });

    it('works on complex schemas', () => {
      expect(s.array(s.number()).nullable().toJsonSchema()).toEqual({
        anyOf: [{ items: { type: 'number' }, type: 'array' }, { type: 'null' }],
      });
    });

    it('keeps constraints on the non-null branch', () => {
      expect(s.string().min(3).nullable().toJsonSchema()).toEqual({
        anyOf: [{ minLength: 3, type: 'string' }, { type: 'null' }],
      });
    });
  });

  describe('describe', () => {
    it('attaches description to the schema', () => {
      expect(s.string().label('A label').toJsonSchema()).toEqual({
        description: 'A label',
        type: 'string',
      });
    });

    it('description is preserved through nullable wrapping', () => {
      const result = s.string().nullable().label('optional name').toJsonSchema();

      expect(result['description']).toBe('optional name');
    });

    it('field descriptions propagate into object properties', () => {
      const objSchema = s.object({
        name: s.string().label('The user name'),
      });

      const result = objSchema.toJsonSchema() as any;

      expect(result.properties.name.description).toBe('The user name');
    });
  });

  describe('optional in object context', () => {
    it('optional field is excluded from required but still in properties', () => {
      const objSchema = s.object({
        active: s.boolean().optional(),
        id: s.number(),
      });

      const result = objSchema.toJsonSchema() as any;

      expect(result.required).toEqual(['id']);
      expect(result.properties.active).toEqual({ type: 'boolean' });
    });
  });

  // ---------------------------------------------------------------------------
  // Constraint metadata (v2)
  // ---------------------------------------------------------------------------

  describe('string constraints', () => {
    it('min → minLength', () => {
      expect(s.string().min(3).toJsonSchema()).toMatchObject({ minLength: 3, type: 'string' });
    });

    it('max → maxLength', () => {
      expect(s.string().max(20).toJsonSchema()).toMatchObject({ maxLength: 20, type: 'string' });
    });

    it('length → minLength + maxLength', () => {
      expect(s.string().length(8).toJsonSchema()).toMatchObject({ maxLength: 8, minLength: 8, type: 'string' });
    });

    it('nonEmpty → minLength: 1', () => {
      expect(s.string().nonEmpty().toJsonSchema()).toMatchObject({ minLength: 1, type: 'string' });
    });

    it('regex → pattern', () => {
      expect(
        s
          .string()
          .regex(/^[a-z]+$/)
          .toJsonSchema(),
      ).toMatchObject({ pattern: '^[a-z]+$', type: 'string' });
    });

    it('email → format: email', () => {
      expect(s.string().email().toJsonSchema()).toMatchObject({ format: 'email', type: 'string' });
    });

    it('url → format: uri', () => {
      expect(s.string().url().toJsonSchema()).toMatchObject({ format: 'uri', type: 'string' });
    });

    it('uuid → format: uuid', () => {
      expect(s.string().uuid().toJsonSchema()).toMatchObject({ format: 'uuid', type: 'string' });
    });

    it('isoDate → format: date', () => {
      expect(s.string().isoDate().toJsonSchema()).toMatchObject({ format: 'date', type: 'string' });
    });

    it('isoDateTime → format: date-time', () => {
      expect(s.string().isoDateTime().toJsonSchema()).toMatchObject({ format: 'date-time', type: 'string' });
    });

    it('duration → format: duration', () => {
      expect(s.string().duration().toJsonSchema()).toMatchObject({ format: 'duration', type: 'string' });
    });

    it('base64 → contentEncoding: base64', () => {
      expect(s.string().base64().toJsonSchema()).toMatchObject({ contentEncoding: 'base64', type: 'string' });
    });

    it('chained constraints merge correctly', () => {
      expect(s.string().min(5).max(50).email().toJsonSchema()).toMatchObject({
        format: 'email',
        maxLength: 50,
        minLength: 5,
        type: 'string',
      });
    });

    it('repeated min keeps the most restrictive bound', () => {
      expect(s.string().min(10).min(5).toJsonSchema()).toMatchObject({ minLength: 10, type: 'string' });
    });

    it('length followed by min keeps exact length bound', () => {
      expect(s.string().length(5).min(3).toJsonSchema()).toMatchObject({ maxLength: 5, minLength: 5, type: 'string' });
    });

    it('methods without JSON Schema metadata do not create meta state', () => {
      expect(s.string().cuid().meta).toBeUndefined();
    });

    it('conflicting chained regex constraints do not emit a misleading single pattern', () => {
      const jsonSchema = s.string().regex(/foo/).regex(/bar/).toJsonSchema();

      expect(jsonSchema).toMatchObject({ type: 'string' });
      expect(jsonSchema).not.toHaveProperty('pattern');
    });
  });

  describe('number constraints', () => {
    it('min → minimum', () => {
      expect(s.number().min(0).toJsonSchema()).toMatchObject({ minimum: 0, type: 'number' });
    });

    it('max → maximum', () => {
      expect(s.number().max(100).toJsonSchema()).toMatchObject({ maximum: 100, type: 'number' });
    });

    it('positive → exclusiveMinimum: 0', () => {
      expect(s.number().positive().toJsonSchema()).toMatchObject({ exclusiveMinimum: 0, type: 'number' });
    });

    it('negative → exclusiveMaximum: 0', () => {
      expect(s.number().negative().toJsonSchema()).toMatchObject({ exclusiveMaximum: 0, type: 'number' });
    });

    it('nonNegative → minimum: 0', () => {
      expect(s.number().nonNegative().toJsonSchema()).toMatchObject({ minimum: 0, type: 'number' });
    });

    it('nonPositive → maximum: 0', () => {
      expect(s.number().nonPositive().toJsonSchema()).toMatchObject({ maximum: 0, type: 'number' });
    });

    it('multipleOf → multipleOf', () => {
      expect(s.number().multipleOf(5).toJsonSchema()).toMatchObject({ multipleOf: 5, type: 'number' });
    });

    it('int → type: integer', () => {
      expect(s.number().int().toJsonSchema()).toEqual({ type: 'integer' });
    });

    it('int stores type hint instead of constraint key', () => {
      expect(s.number().int().toDescriptor()).toMatchObject({ typeHint: 'integer' });
    });

    it('int does not leak integer into constraints', () => {
      expect(s.number().int().meta?.constraints).toBeUndefined();
    });

    it('int + min → type: integer with minimum', () => {
      expect(s.number().int().min(1).toJsonSchema()).toMatchObject({ minimum: 1, type: 'integer' });
    });

    it('int + min keeps both hint and constraints in metadata', () => {
      expect(s.number().int().min(1).toDescriptor()).toMatchObject({ minimum: 1, typeHint: 'integer' });
    });

    it('repeated max keeps the most restrictive bound', () => {
      expect(s.number().max(10).max(20).toJsonSchema()).toMatchObject({ maximum: 10, type: 'number' });
    });
  });

  describe('array constraints', () => {
    it('min → minItems', () => {
      expect(s.array(s.string()).min(1).toJsonSchema()).toMatchObject({ minItems: 1, type: 'array' });
    });

    it('max → maxItems', () => {
      expect(s.array(s.string()).max(10).toJsonSchema()).toMatchObject({ maxItems: 10, type: 'array' });
    });

    it('length → minItems + maxItems', () => {
      expect(s.array(s.string()).length(3).toJsonSchema()).toMatchObject({ maxItems: 3, minItems: 3, type: 'array' });
    });

    it('nonEmpty → minItems: 1', () => {
      expect(s.array(s.string()).nonEmpty().toJsonSchema()).toMatchObject({ minItems: 1, type: 'array' });
    });

    it('repeated min keeps the most restrictive bound', () => {
      expect(s.array(s.string()).min(4).min(2).toJsonSchema()).toMatchObject({ minItems: 4, type: 'array' });
    });
  });

  describe('non-representable schemas', () => {
    it('date adds an explanatory $comment', () => {
      const dateSchema = s.date().toJsonSchema() as Record<string, unknown>;

      expect(typeof dateSchema['$comment']).toBe('string');
      expect((dateSchema['$comment'] as string).length).toBeGreaterThan(0);
    });

    it('set adds an explanatory $comment', () => {
      const schema = s.set(s.string()).toJsonSchema() as Record<string, unknown>;

      expect(typeof schema['$comment']).toBe('string');
      expect((schema['$comment'] as string).length).toBeGreaterThan(0);
    });

    it('map adds an explanatory $comment', () => {
      const schema = s.map(s.string(), s.number()).toJsonSchema() as Record<string, unknown>;

      expect(typeof schema['$comment']).toBe('string');
      expect((schema['$comment'] as string).length).toBeGreaterThan(0);
    });
  });
});
