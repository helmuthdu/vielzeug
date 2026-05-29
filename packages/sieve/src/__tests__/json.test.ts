import { schema, s } from '../index';

describe('schema()', () => {
  // ---------------------------------------------------------------------------
  // Primitives
  // ---------------------------------------------------------------------------

  describe('primitives', () => {
    it('string', () => {
      expect(schema(s.string())).toEqual({ type: 'string' });
    });

    it('number', () => {
      expect(schema(s.number())).toEqual({ type: 'number' });
    });

    it('boolean', () => {
      expect(schema(s.boolean())).toEqual({ type: 'boolean' });
    });

    it('bigint → integer', () => {
      expect(schema(s.bigint())).toEqual({ type: 'integer' });
    });

    it('any / unknown → {}', () => {
      expect(schema(s.any())).toEqual({});
      expect(schema(s.unknown())).toEqual({});
    });

    it('never → not: {}', () => {
      expect(schema(s.never())).toEqual({ not: {} });
    });
  });

  // ---------------------------------------------------------------------------
  // Literals
  // ---------------------------------------------------------------------------

  describe('literal', () => {
    it('string literal → const', () => {
      expect(schema(s.literal('hello'))).toEqual({ const: 'hello' });
    });

    it('number literal → const', () => {
      expect(schema(s.literal(42))).toEqual({ const: 42 });
    });

    it('boolean literal → const', () => {
      expect(schema(s.literal(true))).toEqual({ const: true });
    });

    it('null literal → type: null', () => {
      expect(schema(s.null())).toEqual({ type: 'null' });
    });

    it('undefined literal → {}', () => {
      expect(schema(s.undefined())).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // Enum
  // ---------------------------------------------------------------------------

  describe('enum', () => {
    it('converts enum values to JSON Schema enum', () => {
      expect(schema(s.enum(['a', 'b', 'c'] as const))).toEqual({ enum: ['a', 'b', 'c'] });
    });

    it('handles mixed string/number enums', () => {
      expect(schema(s.enum([1, 2, 'three'] as const))).toEqual({ enum: [1, 2, 'three'] });
    });
  });

  // ---------------------------------------------------------------------------
  // Object
  // ---------------------------------------------------------------------------

  describe('object', () => {
    it('required fields appear in required array', () => {
      expect(
        schema(
          s.object({
            age: s.number(),
            name: s.string(),
          }),
        ),
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
        schema(
          s.object({
            bio: s.string().optional(),
            name: s.string(),
          }),
        ),
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
      const result = schema(s.object({ x: s.number().optional() }));

      expect(result).not.toHaveProperty('required');
    });

    it('nested objects recurse correctly', () => {
      const objSchema = s.object({
        address: s.object({ city: s.string(), zip: s.string() }),
      });

      expect(schema(objSchema)).toEqual({
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
      expect(schema(s.array(s.string()))).toEqual({
        items: { type: 'string' },
        type: 'array',
      });
    });

    it('handles nested object items', () => {
      expect(schema(s.array(s.object({ id: s.number() })))).toEqual({
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
      expect(schema(s.tuple([s.string(), s.number()]))).toEqual({
        items: false,
        prefixItems: [{ type: 'string' }, { type: 'number' }],
        type: 'array',
      });
    });

    it('includes rest schema as items', () => {
      expect(schema(s.tuple([s.string()]).rest(s.number()))).toEqual({
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
      expect(schema(s.record(s.string(), s.number()))).toEqual({
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
      expect(schema(s.union(s.string(), s.number()))).toEqual({
        anyOf: [{ type: 'string' }, { type: 'number' }],
      });
    });
  });

  describe('intersect', () => {
    it('converts to allOf', () => {
      expect(schema(s.intersect(s.object({ a: s.string() }), s.object({ b: s.number() })))).toEqual({
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

      const result = schema(variantSchema);

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
      expect(schema(s.string().nullable())).toEqual({
        anyOf: [{ type: 'string' }, { type: 'null' }],
      });
    });

    it('works on complex schemas', () => {
      expect(schema(s.array(s.number()).nullable())).toEqual({
        anyOf: [{ items: { type: 'number' }, type: 'array' }, { type: 'null' }],
      });
    });

    it('keeps constraints on the non-null branch', () => {
      expect(schema(s.string().min(3).nullable())).toEqual({
        anyOf: [{ minLength: 3, type: 'string' }, { type: 'null' }],
      });
    });
  });

  describe('describe', () => {
    it('attaches description to the schema', () => {
      expect(schema(s.string().describe('A label'))).toEqual({
        description: 'A label',
        type: 'string',
      });
    });

    it('description is preserved through nullable wrapping', () => {
      const result = schema(s.string().nullable().describe('optional name'));

      expect(result['description']).toBe('optional name');
    });

    it('field descriptions propagate into object properties', () => {
      const objSchema = s.object({
        name: s.string().describe('The user name'),
      });

      const result = schema(objSchema) as any;

      expect(result.properties.name.description).toBe('The user name');
    });
  });

  describe('optional in object context', () => {
    it('optional field is excluded from required but still in properties', () => {
      const objSchema = s.object({
        active: s.boolean().optional(),
        id: s.number(),
      });

      const result = schema(objSchema) as any;

      expect(result.required).toEqual(['id']);
      expect(result.properties.active).toEqual({ type: 'boolean' });
    });
  });

  // ---------------------------------------------------------------------------
  // Constraint metadata (v2)
  // ---------------------------------------------------------------------------

  describe('string constraints', () => {
    it('min → minLength', () => {
      expect(schema(s.string().min(3))).toMatchObject({ minLength: 3, type: 'string' });
    });

    it('max → maxLength', () => {
      expect(schema(s.string().max(20))).toMatchObject({ maxLength: 20, type: 'string' });
    });

    it('length → minLength + maxLength', () => {
      expect(schema(s.string().length(8))).toMatchObject({ maxLength: 8, minLength: 8, type: 'string' });
    });

    it('nonEmpty → minLength: 1', () => {
      expect(schema(s.string().nonEmpty())).toMatchObject({ minLength: 1, type: 'string' });
    });

    it('regex → pattern', () => {
      expect(schema(s.string().regex(/^[a-z]+$/))).toMatchObject({ pattern: '^[a-z]+$', type: 'string' });
    });

    it('email → format: email', () => {
      expect(schema(s.string().email())).toMatchObject({ format: 'email', type: 'string' });
    });

    it('url → format: uri', () => {
      expect(schema(s.string().url())).toMatchObject({ format: 'uri', type: 'string' });
    });

    it('uuid → format: uuid', () => {
      expect(schema(s.string().uuid())).toMatchObject({ format: 'uuid', type: 'string' });
    });

    it('isoDate → format: date', () => {
      expect(schema(s.string().isoDate())).toMatchObject({ format: 'date', type: 'string' });
    });

    it('isoDateTime → format: date-time', () => {
      expect(schema(s.string().isoDateTime())).toMatchObject({ format: 'date-time', type: 'string' });
    });

    it('duration → format: duration', () => {
      expect(schema(s.string().duration())).toMatchObject({ format: 'duration', type: 'string' });
    });

    it('base64 → contentEncoding: base64', () => {
      expect(schema(s.string().base64())).toMatchObject({ contentEncoding: 'base64', type: 'string' });
    });

    it('chained constraints merge correctly', () => {
      expect(schema(s.string().min(5).max(50).email())).toMatchObject({
        format: 'email',
        maxLength: 50,
        minLength: 5,
        type: 'string',
      });
    });

    it('repeated min keeps the most restrictive bound', () => {
      expect(schema(s.string().min(10).min(5))).toMatchObject({ minLength: 10, type: 'string' });
    });

    it('length followed by min keeps exact length bound', () => {
      expect(schema(s.string().length(5).min(3))).toMatchObject({ maxLength: 5, minLength: 5, type: 'string' });
    });

    it('methods without JSON Schema metadata do not create meta state', () => {
      expect(s.string().cuid().meta).toBeUndefined();
    });

    it('conflicting chained regex constraints do not emit a misleading single pattern', () => {
      const jsonSchema = schema(s.string().regex(/foo/).regex(/bar/));

      expect(jsonSchema).toMatchObject({ type: 'string' });
      expect(jsonSchema).not.toHaveProperty('pattern');
    });
  });

  describe('number constraints', () => {
    it('min → minimum', () => {
      expect(schema(s.number().min(0))).toMatchObject({ minimum: 0, type: 'number' });
    });

    it('max → maximum', () => {
      expect(schema(s.number().max(100))).toMatchObject({ maximum: 100, type: 'number' });
    });

    it('positive → exclusiveMinimum: 0', () => {
      expect(schema(s.number().positive())).toMatchObject({ exclusiveMinimum: 0, type: 'number' });
    });

    it('negative → exclusiveMaximum: 0', () => {
      expect(schema(s.number().negative())).toMatchObject({ exclusiveMaximum: 0, type: 'number' });
    });

    it('nonNegative → minimum: 0', () => {
      expect(schema(s.number().nonNegative())).toMatchObject({ minimum: 0, type: 'number' });
    });

    it('nonPositive → maximum: 0', () => {
      expect(schema(s.number().nonPositive())).toMatchObject({ maximum: 0, type: 'number' });
    });

    it('multipleOf → multipleOf', () => {
      expect(schema(s.number().multipleOf(5))).toMatchObject({ multipleOf: 5, type: 'number' });
    });

    it('int → type: integer', () => {
      expect(schema(s.number().int())).toEqual({ type: 'integer' });
    });

    it('int stores type hint instead of constraint key', () => {
      expect(s.number().int()._typeHint).toBe('integer');
    });

    it('int does not leak integer into constraints', () => {
      expect(s.number().int().meta?.constraints).toBeUndefined();
    });

    it('int + min → type: integer with minimum', () => {
      expect(schema(s.number().int().min(1))).toMatchObject({ minimum: 1, type: 'integer' });
    });

    it('int + min keeps both hint and constraints in metadata', () => {
      const schema = s.number().int().min(1);

      expect(schema._typeHint).toBe('integer');
      expect(schema._minimum).toBe(1);
    });

    it('repeated max keeps the most restrictive bound', () => {
      expect(schema(s.number().max(10).max(20))).toMatchObject({ maximum: 10, type: 'number' });
    });
  });

  describe('array constraints', () => {
    it('min → minItems', () => {
      expect(schema(s.array(s.string()).min(1))).toMatchObject({ minItems: 1, type: 'array' });
    });

    it('max → maxItems', () => {
      expect(schema(s.array(s.string()).max(10))).toMatchObject({ maxItems: 10, type: 'array' });
    });

    it('length → minItems + maxItems', () => {
      expect(schema(s.array(s.string()).length(3))).toMatchObject({ maxItems: 3, minItems: 3, type: 'array' });
    });

    it('nonEmpty → minItems: 1', () => {
      expect(schema(s.array(s.string()).nonEmpty())).toMatchObject({ minItems: 1, type: 'array' });
    });

    it('repeated min keeps the most restrictive bound', () => {
      expect(schema(s.array(s.string()).min(4).min(2))).toMatchObject({ minItems: 4, type: 'array' });
    });
  });

  describe('non-representable schemas', () => {
    it('adds an explanatory $comment instead of silently returning {}', () => {
      const dateSchema = schema(s.date()) as Record<string, unknown>;

      expect(typeof dateSchema['$comment']).toBe('string');
      expect((dateSchema['$comment'] as string).length).toBeGreaterThan(0);
    });
  });
});
