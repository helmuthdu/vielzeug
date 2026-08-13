import { type AnySchema, s } from '../index';
import { fromDefinition } from '../json';

function toJson(schema: AnySchema): Record<string, unknown> {
  return fromDefinition(schema.definition());
}

describe('@vielzeug/spell/json', () => {
  it('converts primitive and literal definitions', () => {
    expect(toJson(s.string())).toEqual({ type: 'string' });
    expect(toJson(s.number())).toEqual({ type: 'number' });
    expect(toJson(s.boolean())).toEqual({ type: 'boolean' });
    expect(toJson(s.bigint())).toEqual({ type: 'integer' });
    expect(toJson(s.any())).toEqual({});
    expect(toJson(s.unknown())).toEqual({});
    expect(toJson(s.never())).toEqual({ not: {} });
    expect(toJson(s.literal('hello'))).toEqual({ const: 'hello' });
    expect(toJson(s.literal(42))).toEqual({ const: 42 });
    expect(toJson(s.literal(true))).toEqual({ const: true });
    expect(toJson(s.null())).toEqual({ type: 'null' });
    expect(toJson(s.undefined())).toEqual({});
  });

  it('converts enum definitions', () => {
    expect(toJson(s.enum(['a', 'b', 'c'] as const))).toEqual({ enum: ['a', 'b', 'c'] });
    expect(toJson(s.enum([1, 2, 'three'] as const))).toEqual({ enum: [1, 2, 'three'] });
  });

  it('converts nested object definitions and honors optional fields', () => {
    const schema = s.object({
      address: s.object({ city: s.string(), zip: s.string() }),
      bio: s.string().optional(),
      name: s.string(),
    });

    expect(toJson(schema)).toEqual({
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
        bio: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['address', 'name'],
      type: 'object',
    });
  });

  it('converts collection definitions', () => {
    expect(toJson(s.array(s.string()).min(1).max(3))).toEqual({
      items: { type: 'string' },
      maxItems: 3,
      minItems: 1,
      type: 'array',
    });
    expect(toJson(s.tuple([s.string(), s.number()]))).toEqual({
      items: false,
      prefixItems: [{ type: 'string' }, { type: 'number' }],
      type: 'array',
    });
    expect(toJson(s.tuple([s.string()]).rest(s.number()))).toEqual({
      items: { type: 'number' },
      prefixItems: [{ type: 'string' }],
      type: 'array',
    });
    expect(toJson(s.record(s.string(), s.number()))).toEqual({
      additionalProperties: { type: 'number' },
      type: 'object',
    });
    expect(toJson(s.set(s.string()))).toEqual({
      $comment: 'Set<T> — no standard JSON Schema equivalent; treated as an ordered unique-item array.',
      items: { type: 'string' },
      type: 'array',
      uniqueItems: true,
    });
    expect(toJson(s.map(s.string(), s.number()))).toEqual({
      $comment: 'Map type — represented as an object with arbitrary string keys.',
      additionalProperties: { type: 'number' },
      type: 'object',
    });
  });

  it('converts composition definitions', () => {
    expect(toJson(s.union(s.string(), s.number()))).toEqual({
      anyOf: [{ type: 'string' }, { type: 'number' }],
    });
    expect(toJson(s.intersect(s.object({ a: s.string() }), s.object({ b: s.number() })))).toEqual({
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

    const variant = toJson(
      s.discriminatedUnion('type', {
        circle: s.object({ radius: s.number() }),
        rect: s.object({ height: s.number(), width: s.number() }),
      }),
    );

    expect(variant.discriminator).toEqual({ propertyName: 'type' });
    expect(variant.oneOf).toHaveLength(2);
  });

  it('converts modifiers and annotations', () => {
    expect(toJson(s.string().nullable().label('A label'))).toEqual({
      anyOf: [{ type: 'string' }, { type: 'null' }],
      description: 'A label',
    });
    expect(toJson(s.string().min(3).max(20).email())).toEqual({
      format: 'email',
      maxLength: 20,
      minLength: 3,
      type: 'string',
    });
    expect(toJson(s.string().regex(/foo/).regex(/bar/))).toEqual({ type: 'string' });
    expect(toJson(s.number().int().min(1).positive().multipleOf(5))).toEqual({
      exclusiveMinimum: 0,
      minimum: 1,
      multipleOf: 5,
      type: 'integer',
    });
  });

  it('documents runtime-only types', () => {
    expect(toJson(s.date())).toEqual({
      $comment:
        'Date objects are not representable in JSON Schema. Validate as a string with a date format in JSON contexts.',
    });
    expect(toJson(s.instanceof(Date))).toEqual({
      $comment: 'Instances of "Date" are not representable in JSON Schema.',
    });
  });
});
