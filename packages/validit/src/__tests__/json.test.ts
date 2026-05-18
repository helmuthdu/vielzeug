import { toJsonSchema, v } from '../index';

describe('toJsonSchema()', () => {
  // ---------------------------------------------------------------------------
  // Primitives
  // ---------------------------------------------------------------------------

  describe('primitives', () => {
    it('string', () => {
      expect(toJsonSchema(v.string())).toEqual({ type: 'string' });
    });

    it('number', () => {
      expect(toJsonSchema(v.number())).toEqual({ type: 'number' });
    });

    it('boolean', () => {
      expect(toJsonSchema(v.boolean())).toEqual({ type: 'boolean' });
    });

    it('bigint → integer', () => {
      expect(toJsonSchema(v.bigint())).toEqual({ type: 'integer' });
    });

    it('any / unknown → {}', () => {
      expect(toJsonSchema(v.any())).toEqual({});
      expect(toJsonSchema(v.unknown())).toEqual({});
    });

    it('never → not: {}', () => {
      expect(toJsonSchema(v.never())).toEqual({ not: {} });
    });
  });

  // ---------------------------------------------------------------------------
  // Literals
  // ---------------------------------------------------------------------------

  describe('literal', () => {
    it('string literal → const', () => {
      expect(toJsonSchema(v.literal('hello'))).toEqual({ const: 'hello' });
    });

    it('number literal → const', () => {
      expect(toJsonSchema(v.literal(42))).toEqual({ const: 42 });
    });

    it('boolean literal → const', () => {
      expect(toJsonSchema(v.literal(true))).toEqual({ const: true });
    });

    it('null literal → type: null', () => {
      expect(toJsonSchema(v.null())).toEqual({ type: 'null' });
    });

    it('undefined literal → {}', () => {
      expect(toJsonSchema(v.undefined())).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // Enum
  // ---------------------------------------------------------------------------

  describe('enum', () => {
    it('converts enum values to JSON Schema enum', () => {
      expect(toJsonSchema(v.enum(['a', 'b', 'c'] as const))).toEqual({ enum: ['a', 'b', 'c'] });
    });

    it('handles mixed string/number enums', () => {
      expect(toJsonSchema(v.enum([1, 2, 'three'] as const))).toEqual({ enum: [1, 2, 'three'] });
    });
  });

  // ---------------------------------------------------------------------------
  // Object
  // ---------------------------------------------------------------------------

  describe('object', () => {
    it('required fields appear in required array', () => {
      expect(
        toJsonSchema(
          v.object({
            age: v.number(),
            name: v.string(),
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
        toJsonSchema(
          v.object({
            bio: v.string().optional(),
            name: v.string(),
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
      const schema = toJsonSchema(v.object({ x: v.number().optional() }));

      expect(schema).not.toHaveProperty('required');
    });

    it('nested objects recurse correctly', () => {
      const schema = v.object({
        address: v.object({ city: v.string(), zip: v.string() }),
      });

      expect(toJsonSchema(schema)).toEqual({
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
      expect(toJsonSchema(v.array(v.string()))).toEqual({
        items: { type: 'string' },
        type: 'array',
      });
    });

    it('handles nested object items', () => {
      expect(toJsonSchema(v.array(v.object({ id: v.number() })))).toEqual({
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
      expect(toJsonSchema(v.tuple([v.string(), v.number()]))).toEqual({
        items: false,
        prefixItems: [{ type: 'string' }, { type: 'number' }],
        type: 'array',
      });
    });

    it('includes rest schema as items', () => {
      expect(toJsonSchema(v.tuple([v.string()]).rest(v.number()))).toEqual({
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
      expect(toJsonSchema(v.record(v.string(), v.number()))).toEqual({
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
      expect(toJsonSchema(v.union(v.string(), v.number()))).toEqual({
        anyOf: [{ type: 'string' }, { type: 'number' }],
      });
    });
  });

  describe('intersect', () => {
    it('converts to allOf', () => {
      expect(toJsonSchema(v.intersect(v.object({ a: v.string() }), v.object({ b: v.number() })))).toEqual({
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
      const schema = v.variant('type', {
        circle: v.object({ radius: v.number() }),
        rect: v.object({ height: v.number(), width: v.number() }),
      });

      const result = toJsonSchema(schema);

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
      expect(toJsonSchema(v.string().nullable())).toEqual({
        anyOf: [{ type: 'string' }, { type: 'null' }],
      });
    });

    it('works on complex schemas', () => {
      expect(toJsonSchema(v.array(v.number()).nullable())).toEqual({
        anyOf: [{ items: { type: 'number' }, type: 'array' }, { type: 'null' }],
      });
    });

    it('keeps constraints on the non-null branch', () => {
      expect(toJsonSchema(v.string().min(3).nullable())).toEqual({
        anyOf: [{ minLength: 3, type: 'string' }, { type: 'null' }],
      });
    });
  });

  describe('describe', () => {
    it('attaches description to the schema', () => {
      expect(toJsonSchema(v.string().describe('A label'))).toEqual({
        description: 'A label',
        type: 'string',
      });
    });

    it('description is preserved through nullable wrapping', () => {
      const result = toJsonSchema(v.string().nullable().describe('optional name'));

      expect(result['description']).toBe('optional name');
    });

    it('field descriptions propagate into object properties', () => {
      const schema = v.object({
        name: v.string().describe('The user name'),
      });

      const result = toJsonSchema(schema) as any;

      expect(result.properties.name.description).toBe('The user name');
    });
  });

  describe('optional in object context', () => {
    it('optional field is excluded from required but still in properties', () => {
      const schema = v.object({
        active: v.boolean().optional(),
        id: v.number(),
      });

      const result = toJsonSchema(schema) as any;

      expect(result.required).toEqual(['id']);
      expect(result.properties.active).toEqual({ type: 'boolean' });
    });
  });

  // ---------------------------------------------------------------------------
  // Constraint metadata (v2)
  // ---------------------------------------------------------------------------

  describe('string constraints', () => {
    it('min → minLength', () => {
      expect(toJsonSchema(v.string().min(3))).toMatchObject({ minLength: 3, type: 'string' });
    });

    it('max → maxLength', () => {
      expect(toJsonSchema(v.string().max(20))).toMatchObject({ maxLength: 20, type: 'string' });
    });

    it('length → minLength + maxLength', () => {
      expect(toJsonSchema(v.string().length(8))).toMatchObject({ maxLength: 8, minLength: 8, type: 'string' });
    });

    it('nonEmpty → minLength: 1', () => {
      expect(toJsonSchema(v.string().nonEmpty())).toMatchObject({ minLength: 1, type: 'string' });
    });

    it('regex → pattern', () => {
      expect(toJsonSchema(v.string().regex(/^[a-z]+$/))).toMatchObject({ pattern: '^[a-z]+$', type: 'string' });
    });

    it('email → format: email', () => {
      expect(toJsonSchema(v.string().email())).toMatchObject({ format: 'email', type: 'string' });
    });

    it('url → format: uri', () => {
      expect(toJsonSchema(v.string().url())).toMatchObject({ format: 'uri', type: 'string' });
    });

    it('uuid → format: uuid', () => {
      expect(toJsonSchema(v.string().uuid())).toMatchObject({ format: 'uuid', type: 'string' });
    });

    it('isoDate → format: date', () => {
      expect(toJsonSchema(v.string().isoDate())).toMatchObject({ format: 'date', type: 'string' });
    });

    it('isoDateTime → format: date-time', () => {
      expect(toJsonSchema(v.string().isoDateTime())).toMatchObject({ format: 'date-time', type: 'string' });
    });

    it('duration → format: duration', () => {
      expect(toJsonSchema(v.string().duration())).toMatchObject({ format: 'duration', type: 'string' });
    });

    it('base64 → contentEncoding: base64', () => {
      expect(toJsonSchema(v.string().base64())).toMatchObject({ contentEncoding: 'base64', type: 'string' });
    });

    it('chained constraints merge correctly', () => {
      expect(toJsonSchema(v.string().min(5).max(50).email())).toMatchObject({
        format: 'email',
        maxLength: 50,
        minLength: 5,
        type: 'string',
      });
    });

    it('repeated min keeps the most restrictive bound', () => {
      expect(toJsonSchema(v.string().min(10).min(5))).toMatchObject({ minLength: 10, type: 'string' });
    });

    it('length followed by min keeps exact length bound', () => {
      expect(toJsonSchema(v.string().length(5).min(3))).toMatchObject({ maxLength: 5, minLength: 5, type: 'string' });
    });

    it('methods without JSON Schema metadata do not create meta state', () => {
      expect(v.string().cuid().meta).toBeUndefined();
    });

    it('conflicting chained regex constraints do not emit a misleading single pattern', () => {
      const jsonSchema = toJsonSchema(v.string().regex(/foo/).regex(/bar/));

      expect(jsonSchema).toMatchObject({ type: 'string' });
      expect(jsonSchema).not.toHaveProperty('pattern');
    });
  });

  describe('number constraints', () => {
    it('min → minimum', () => {
      expect(toJsonSchema(v.number().min(0))).toMatchObject({ minimum: 0, type: 'number' });
    });

    it('max → maximum', () => {
      expect(toJsonSchema(v.number().max(100))).toMatchObject({ maximum: 100, type: 'number' });
    });

    it('positive → exclusiveMinimum: 0', () => {
      expect(toJsonSchema(v.number().positive())).toMatchObject({ exclusiveMinimum: 0, type: 'number' });
    });

    it('negative → exclusiveMaximum: 0', () => {
      expect(toJsonSchema(v.number().negative())).toMatchObject({ exclusiveMaximum: 0, type: 'number' });
    });

    it('nonNegative → minimum: 0', () => {
      expect(toJsonSchema(v.number().nonNegative())).toMatchObject({ minimum: 0, type: 'number' });
    });

    it('nonPositive → maximum: 0', () => {
      expect(toJsonSchema(v.number().nonPositive())).toMatchObject({ maximum: 0, type: 'number' });
    });

    it('multipleOf → multipleOf', () => {
      expect(toJsonSchema(v.number().multipleOf(5))).toMatchObject({ multipleOf: 5, type: 'number' });
    });

    it('int → type: integer', () => {
      expect(toJsonSchema(v.number().int())).toEqual({ type: 'integer' });
    });

    it('int stores type hint instead of constraint key', () => {
      expect(v.number().int().meta).toMatchObject({ typeHint: 'integer' });
    });

    it('int does not leak integer into constraints', () => {
      expect(v.number().int().meta?.constraints).toBeUndefined();
    });

    it('int + min → type: integer with minimum', () => {
      expect(toJsonSchema(v.number().int().min(1))).toMatchObject({ minimum: 1, type: 'integer' });
    });

    it('int + min keeps both hint and constraints in metadata', () => {
      expect(v.number().int().min(1).meta).toMatchObject({ constraints: { minimum: 1 }, typeHint: 'integer' });
    });

    it('repeated max keeps the most restrictive bound', () => {
      expect(toJsonSchema(v.number().max(10).max(20))).toMatchObject({ maximum: 10, type: 'number' });
    });
  });

  describe('array constraints', () => {
    it('min → minItems', () => {
      expect(toJsonSchema(v.array(v.string()).min(1))).toMatchObject({ minItems: 1, type: 'array' });
    });

    it('max → maxItems', () => {
      expect(toJsonSchema(v.array(v.string()).max(10))).toMatchObject({ maxItems: 10, type: 'array' });
    });

    it('length → minItems + maxItems', () => {
      expect(toJsonSchema(v.array(v.string()).length(3))).toMatchObject({ maxItems: 3, minItems: 3, type: 'array' });
    });

    it('nonEmpty → minItems: 1', () => {
      expect(toJsonSchema(v.array(v.string()).nonEmpty())).toMatchObject({ minItems: 1, type: 'array' });
    });

    it('repeated min keeps the most restrictive bound', () => {
      expect(toJsonSchema(v.array(v.string()).min(4).min(2))).toMatchObject({ minItems: 4, type: 'array' });
    });
  });

  describe('non-representable schemas', () => {
    it('adds an explanatory $comment instead of silently returning {}', () => {
      const dateSchema = toJsonSchema(v.date()) as Record<string, unknown>;

      expect(typeof dateSchema['$comment']).toBe('string');
      expect((dateSchema['$comment'] as string).length).toBeGreaterThan(0);
    });
  });
});
