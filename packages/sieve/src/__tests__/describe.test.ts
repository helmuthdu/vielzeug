import { s } from '../index';

// ---------------------------------------------------------------------------
// description setter (fluent)
// ---------------------------------------------------------------------------

describe('describe(string) — setter', () => {
  it('attaches a description to the schema', () => {
    expect(s.string().describe('A label').describe()).toMatchObject({ description: 'A label', kind: 'string' });
  });

  it('is immutable — does not mutate the original', () => {
    const base = s.string();

    base.describe('side-effect label');

    expect(base.describe().description).toBeUndefined();
  });

  it('description is preserved through chained constraint calls', () => {
    expect(s.string().describe('My string').min(3).describe()).toMatchObject({
      description: 'My string',
      kind: 'string',
    });
  });

  it('description is preserved through optional() wrapper', () => {
    expect(s.string().describe('opt field').optional().describe()).toMatchObject({
      description: 'opt field',
      isOptional: true,
    });
  });
});

// ---------------------------------------------------------------------------
// Primitive kinds
// ---------------------------------------------------------------------------

describe('describe() — primitive kinds', () => {
  it('string', () => expect(s.string().describe()).toMatchObject({ kind: 'string' }));
  it('number', () => expect(s.number().describe()).toMatchObject({ kind: 'number' }));
  it('boolean', () => expect(s.boolean().describe()).toMatchObject({ kind: 'boolean' }));
  it('bigint', () => expect(s.bigint().describe()).toMatchObject({ kind: 'bigint' }));
  it('date', () => expect(s.date().describe()).toMatchObject({ kind: 'date' }));
  it('never', () => expect(s.never().describe()).toMatchObject({ kind: 'never' }));
  it('any', () => expect(s.any().describe()).toMatchObject({ kind: 'any' }));
  it('lazy', () => expect(s.lazy(() => s.string()).describe()).toMatchObject({ kind: 'lazy' }));
  it('instanceof', () => expect(s.instanceof(Date).describe()).toMatchObject({ kind: 'instanceof' }));
  it('literal string', () => expect(s.literal('hi').describe()).toMatchObject({ kind: 'literal', value: 'hi' }));
  it('literal number', () => expect(s.literal(42).describe()).toMatchObject({ kind: 'literal', value: 42 }));
  it('literal null', () => expect(s.null().describe()).toMatchObject({ kind: 'literal', value: null }));
  it('enum', () => expect(s.enum(['a', 'b'] as const).describe()).toMatchObject({ kind: 'enum', values: ['a', 'b'] }));
});

// ---------------------------------------------------------------------------
// String constraints
// ---------------------------------------------------------------------------

describe('describe() — string constraints', () => {
  it('min sets minLength', () => {
    expect(s.string().min(3).describe()).toMatchObject({ kind: 'string', minLength: 3 });
  });

  it('max sets maxLength', () => {
    expect(s.string().max(10).describe()).toMatchObject({ kind: 'string', maxLength: 10 });
  });

  it('length sets both bounds', () => {
    expect(s.string().length(8).describe()).toMatchObject({ kind: 'string', maxLength: 8, minLength: 8 });
  });

  it('email sets format', () => {
    expect(s.string().email().describe()).toMatchObject({ format: 'email', kind: 'string' });
  });

  it('uuid sets format', () => {
    expect(s.string().uuid().describe()).toMatchObject({ format: 'uuid', kind: 'string' });
  });

  it('isoDate sets format: date', () => {
    expect(s.string().isoDate().describe()).toMatchObject({ format: 'date', kind: 'string' });
  });

  it('url sets format: uri', () => {
    expect(s.string().url().describe()).toMatchObject({ format: 'uri', kind: 'string' });
  });

  it('regex sets pattern', () => {
    expect(
      s
        .string()
        .regex(/^[a-z]+$/)
        .describe(),
    ).toMatchObject({ kind: 'string', pattern: '^[a-z]+$' });
  });

  it('conflicting regex chains set pattern to null (ambiguous)', () => {
    expect(s.string().regex(/a/).regex(/b/).describe()).toMatchObject({ kind: 'string', pattern: null });
  });

  it('base64 sets contentEncoding', () => {
    expect(s.string().base64().describe()).toMatchObject({ contentEncoding: 'base64', kind: 'string' });
  });

  it('chained constraints accumulate', () => {
    expect(s.string().min(3).max(50).email().describe()).toMatchObject({
      format: 'email',
      kind: 'string',
      maxLength: 50,
      minLength: 3,
    });
  });

  it('repeated min keeps the tightest bound', () => {
    expect(s.string().min(10).min(5).describe()).toMatchObject({ kind: 'string', minLength: 10 });
  });
});

// ---------------------------------------------------------------------------
// Number constraints
// ---------------------------------------------------------------------------

describe('describe() — number constraints', () => {
  it('min sets minimum', () => {
    expect(s.number().min(0).describe()).toMatchObject({ kind: 'number', minimum: 0 });
  });

  it('max sets maximum', () => {
    expect(s.number().max(100).describe()).toMatchObject({ kind: 'number', maximum: 100 });
  });

  it('int sets typeHint: integer', () => {
    expect(s.number().int().describe()).toMatchObject({ kind: 'number', typeHint: 'integer' });
  });

  it('positive sets exclusiveMinimum: 0', () => {
    expect(s.number().positive().describe()).toMatchObject({ exclusiveMinimum: 0, kind: 'number' });
  });

  it('negative sets exclusiveMaximum: 0', () => {
    expect(s.number().negative().describe()).toMatchObject({ exclusiveMaximum: 0, kind: 'number' });
  });

  it('multipleOf sets multipleOf', () => {
    expect(s.number().multipleOf(5).describe()).toMatchObject({ kind: 'number', multipleOf: 5 });
  });

  it('int + min accumulate both annotations', () => {
    expect(s.number().int().min(1).describe()).toMatchObject({ kind: 'number', minimum: 1, typeHint: 'integer' });
  });

  it('repeated max keeps the tightest bound', () => {
    expect(s.number().max(10).max(20).describe()).toMatchObject({ kind: 'number', maximum: 10 });
  });
});

// ---------------------------------------------------------------------------
// Array constraints
// ---------------------------------------------------------------------------

describe('describe() — array', () => {
  it('includes item descriptor', () => {
    expect(s.array(s.string()).describe()).toMatchObject({ items: { kind: 'string' }, kind: 'array' });
  });

  it('min sets minItems', () => {
    expect(s.array(s.string()).min(2).describe()).toMatchObject({ kind: 'array', minItems: 2 });
  });

  it('max sets maxItems', () => {
    expect(s.array(s.string()).max(5).describe()).toMatchObject({ kind: 'array', maxItems: 5 });
  });

  it('length sets both bounds', () => {
    expect(s.array(s.string()).length(3).describe()).toMatchObject({ kind: 'array', maxItems: 3, minItems: 3 });
  });

  it('nested item descriptors recurse', () => {
    expect(s.array(s.array(s.number())).describe()).toMatchObject({
      items: { items: { kind: 'number' }, kind: 'array' },
      kind: 'array',
    });
  });
});

// ---------------------------------------------------------------------------
// Object
// ---------------------------------------------------------------------------

describe('describe() — object', () => {
  it('returns field descriptors with strict: true by default', () => {
    expect(s.object({ name: s.string() }).describe()).toMatchObject({
      fields: { name: { kind: 'string' } },
      kind: 'object',
      strict: true,
    });
  });

  it('relaxed() sets strict: false', () => {
    expect(s.object({ x: s.number() }).relaxed().describe()).toMatchObject({ kind: 'object', strict: false });
  });

  it('strict() on a relaxed schema returns strict: true', () => {
    expect(s.object({ x: s.number() }).relaxed().strict().describe()).toMatchObject({ kind: 'object', strict: true });
  });

  it('nested objects recurse into fields', () => {
    const d = s.object({ address: s.object({ city: s.string() }) }).describe();

    expect(d).toMatchObject({
      fields: { address: { fields: { city: { kind: 'string' } }, kind: 'object' } },
      kind: 'object',
    });
  });

  it('optional fields reflect isOptional in their descriptor', () => {
    const d = s.object({ name: s.string().optional() }).describe() as any;

    expect(d.fields.name.isOptional).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tuple
// ---------------------------------------------------------------------------

describe('describe() — tuple', () => {
  it('returns item descriptors and rest: null when no rest', () => {
    expect(s.tuple([s.string(), s.number()]).describe()).toMatchObject({
      items: [{ kind: 'string' }, { kind: 'number' }],
      kind: 'tuple',
      rest: null,
    });
  });

  it('includes rest descriptor when set', () => {
    expect(s.tuple([s.string()]).rest(s.number()).describe()).toMatchObject({
      kind: 'tuple',
      rest: { kind: 'number' },
    });
  });
});

// ---------------------------------------------------------------------------
// Union / Intersect
// ---------------------------------------------------------------------------

describe('describe() — union', () => {
  it('returns branches', () => {
    expect(s.union(s.string(), s.number()).describe()).toMatchObject({
      branches: [{ kind: 'string' }, { kind: 'number' }],
      kind: 'union',
    });
  });

  it('raw literal shorthand branches are normalized', () => {
    const d = s.union('a', 'b').describe() as any;

    expect(d.kind).toBe('union');
    expect(d.branches).toHaveLength(2);
  });
});

describe('describe() — intersect', () => {
  it('returns branches', () => {
    expect(s.intersect(s.object({ a: s.string() }), s.object({ b: s.number() })).describe()).toMatchObject({
      branches: [{ kind: 'object' }, { kind: 'object' }],
      kind: 'intersect',
    });
  });
});

// ---------------------------------------------------------------------------
// Variant
// ---------------------------------------------------------------------------

describe('describe() — variant', () => {
  it('returns discriminator and branch descriptors keyed by value', () => {
    const schema = s.variant('type', {
      a: s.object({ type: s.literal('a'), x: s.string() }),
      b: s.object({ type: s.literal('b'), y: s.number() }),
    });

    const d = schema.describe() as any;

    expect(d).toMatchObject({ discriminator: 'type', kind: 'variant' });
    expect(d.branches.a).toMatchObject({ kind: 'object' });
    expect(d.branches.b).toMatchObject({ kind: 'object' });
  });
});

// ---------------------------------------------------------------------------
// Record / Set / Map
// ---------------------------------------------------------------------------

describe('describe() — record', () => {
  it('returns key and value descriptors', () => {
    expect(s.record(s.string(), s.number()).describe()).toMatchObject({
      key: { kind: 'string' },
      kind: 'record',
      value: { kind: 'number' },
    });
  });
});

describe('describe() — set', () => {
  it('returns item descriptor', () => {
    expect(s.set(s.string()).describe()).toMatchObject({ item: { kind: 'string' }, kind: 'set' });
  });
});

describe('describe() — map', () => {
  it('returns key and value descriptors', () => {
    expect(s.map(s.string(), s.number()).describe()).toMatchObject({
      key: { kind: 'string' },
      kind: 'map',
      value: { kind: 'number' },
    });
  });
});

// ---------------------------------------------------------------------------
// Pipe
// ---------------------------------------------------------------------------

describe('describe() — pipe', () => {
  it('returns from and to descriptors', () => {
    const schema = s.string().pipe(s.string().min(1));

    expect(schema.describe()).toMatchObject({ from: { kind: 'string' }, kind: 'pipe', to: { kind: 'string' } });
  });
});

// ---------------------------------------------------------------------------
// Wrapper schemas (optional / nullable / nullish)
// ---------------------------------------------------------------------------

describe('describe() — wrapper schemas', () => {
  it('optional() sets isOptional, preserves inner kind', () => {
    const d = s.string().optional().describe();

    expect(d).toMatchObject({ isOptional: true, kind: 'string' });
    expect((d as any).isNullable).toBeUndefined();
  });

  it('nullable() sets isNullable, preserves inner kind', () => {
    const d = s.string().nullable().describe();

    expect(d).toMatchObject({ isNullable: true, kind: 'string' });
    expect((d as any).isOptional).toBeUndefined();
  });

  it('nullish() sets both isOptional and isNullable', () => {
    expect(s.string().nullish().describe()).toMatchObject({ isNullable: true, isOptional: true, kind: 'string' });
  });

  it('optional().nullable() collapses to nullish descriptor', () => {
    expect(s.string().optional().nullable().describe()).toMatchObject({
      isNullable: true,
      isOptional: true,
      kind: 'string',
    });
  });

  it('inner constraints are preserved through a wrapper', () => {
    expect(s.string().min(3).optional().describe()).toMatchObject({
      isOptional: true,
      kind: 'string',
      minLength: 3,
    });
  });

  it('description set on the wrapper propagates to the descriptor', () => {
    expect(s.string().optional().describe('opt field').describe()).toMatchObject({
      description: 'opt field',
      isOptional: true,
    });
  });

  it('number constraints are preserved through nullable', () => {
    expect(s.number().int().min(0).nullable().describe()).toMatchObject({
      isNullable: true,
      kind: 'number',
      minimum: 0,
      typeHint: 'integer',
    });
  });
});
