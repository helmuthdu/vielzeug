import { s } from '../index';

// ---------------------------------------------------------------------------
// description setter (fluent)
// ---------------------------------------------------------------------------

describe('describe(): description setter', () => {
  it('attaches a description to the schema', () => {
    expect(s.string().describe('A label').definition()).toMatchObject({ description: 'A label', kind: 'string' });
  });

  it('is immutable: does not mutate the original', () => {
    const base = s.string();

    base.describe('side-effect label');

    expect(base.definition().description).toBeUndefined();
  });

  it('description is preserved through chained constraint calls', () => {
    expect(s.string().describe('My string').min(3).definition()).toMatchObject({
      description: 'My string',
      kind: 'string',
    });
  });

  it('description is preserved through optional() wrapper', () => {
    expect(s.string().describe('opt field').optional().definition()).toMatchObject({
      description: 'opt field',
      isOptional: true,
    });
  });
});

// ---------------------------------------------------------------------------
// Primitive kinds
// ---------------------------------------------------------------------------

describe('definition(): primitive kinds', () => {
  it('string', () => expect(s.string().definition()).toMatchObject({ kind: 'string' }));
  it('number', () => expect(s.number().definition()).toMatchObject({ kind: 'number' }));
  it('boolean', () => expect(s.boolean().definition()).toMatchObject({ kind: 'boolean' }));
  it('bigint', () => expect(s.bigint().definition()).toMatchObject({ kind: 'bigint' }));
  it('date', () => expect(s.date().definition()).toMatchObject({ kind: 'date' }));
  it('never', () => expect(s.never().definition()).toMatchObject({ kind: 'never' }));
  it('lazy', () => expect(s.lazy(() => s.string()).definition()).toMatchObject({ kind: 'lazy' }));
  it('instanceof', () => expect(s.instanceof(Date).definition()).toMatchObject({ kind: 'instanceof' }));
  it('literal string', () => expect(s.literal('hi').definition()).toMatchObject({ kind: 'literal', value: 'hi' }));
  it('literal number', () => expect(s.literal(42).definition()).toMatchObject({ kind: 'literal', value: 42 }));
  it('literal null', () => expect(s.null().definition()).toMatchObject({ kind: 'literal', value: null }));
  it('enum', () =>
    expect(s.enum(['a', 'b'] as const).definition()).toMatchObject({ kind: 'enum', values: ['a', 'b'] }));
});

// ---------------------------------------------------------------------------
// String constraints
// ---------------------------------------------------------------------------

describe('definition(): string constraints', () => {
  it('min sets minLength', () => {
    expect(s.string().min(3).definition()).toMatchObject({ kind: 'string', minLength: 3 });
  });

  it('max sets maxLength', () => {
    expect(s.string().max(10).definition()).toMatchObject({ kind: 'string', maxLength: 10 });
  });

  it('length sets both bounds', () => {
    expect(s.string().length(8).definition()).toMatchObject({ kind: 'string', maxLength: 8, minLength: 8 });
  });

  it('formats are listed by method name', () => {
    expect(s.string().email().definition()).toMatchObject({ formats: ['email'], kind: 'string' });
    expect(s.string().uuid().definition()).toMatchObject({ formats: ['uuid'] });
    expect(s.string().isoDate().definition()).toMatchObject({ formats: ['isoDate'] });
    expect(s.string().base64().definition()).toMatchObject({ formats: ['base64'] });
    expect(s.string().ip().definition()).toMatchObject({ formats: ['ip'] });
  });

  it('url records its format and protocol pattern', () => {
    expect(s.string().url().definition()).toMatchObject({
      formats: ['url'],
      patterns: [{ flags: 'i', source: '^(?:http|https):' }],
    });
  });

  it('regex records source and flags', () => {
    expect(
      s
        .string()
        .regex(/^[a-z]+$/i)
        .definition(),
    ).toMatchObject({ kind: 'string', patterns: [{ flags: 'i', source: '^[a-z]+$' }] });
  });

  it('chained regexes accumulate every pattern', () => {
    expect(s.string().regex(/a/).regex(/b/).definition()).toMatchObject({
      patterns: [
        { flags: '', source: 'a' },
        { flags: '', source: 'b' },
      ],
    });
  });

  it('startsWith, endsWith, and includes become escaped patterns', () => {
    expect(s.string().startsWith('a.').endsWith('$').includes('+').definition()).toMatchObject({
      patterns: [
        { flags: '', source: '^a\\.' },
        { flags: '', source: '\\$$' },
        { flags: '', source: '\\+' },
      ],
    });
  });

  it('nonEmpty sets minLength', () => {
    expect(s.string().nonEmpty().definition()).toMatchObject({ minLength: 1 });
  });

  it('chained constraints accumulate', () => {
    expect(s.string().min(3).max(50).email().definition()).toMatchObject({
      formats: ['email'],
      kind: 'string',
      maxLength: 50,
      minLength: 3,
    });
  });

  it('repeated min keeps the tightest bound', () => {
    expect(s.string().min(10).min(5).definition()).toMatchObject({ kind: 'string', minLength: 10 });
  });
});

// ---------------------------------------------------------------------------
// Number constraints
// ---------------------------------------------------------------------------

describe('definition(): number constraints', () => {
  it('min sets minimum', () => {
    expect(s.number().min(0).definition()).toMatchObject({ kind: 'number', minimum: 0 });
  });

  it('max sets maximum', () => {
    expect(s.number().max(100).definition()).toMatchObject({ kind: 'number', maximum: 100 });
  });

  it('int sets integer', () => {
    expect(s.number().int().definition()).toMatchObject({ integer: true, kind: 'number' });
  });

  it('positive sets exclusiveMinimum: 0', () => {
    expect(s.number().positive().definition()).toMatchObject({ exclusiveMinimum: 0, kind: 'number' });
  });

  it('negative sets exclusiveMaximum: 0', () => {
    expect(s.number().negative().definition()).toMatchObject({ exclusiveMaximum: 0, kind: 'number' });
  });

  it('multipleOf sets multipleOf', () => {
    expect(s.number().multipleOf(5).definition()).toMatchObject({ kind: 'number', multipleOf: 5 });
  });

  it('int + min accumulate both annotations', () => {
    expect(s.number().int().min(1).definition()).toMatchObject({ integer: true, kind: 'number', minimum: 1 });
  });

  it('repeated max keeps the tightest bound', () => {
    expect(s.number().max(10).max(20).definition()).toMatchObject({ kind: 'number', maximum: 10 });
  });
});

// ---------------------------------------------------------------------------
// Array constraints
// ---------------------------------------------------------------------------

describe('definition(): array', () => {
  it('includes item descriptor', () => {
    expect(s.array(s.string()).definition()).toMatchObject({ items: { kind: 'string' }, kind: 'array' });
  });

  it('min sets minItems', () => {
    expect(s.array(s.string()).min(2).definition()).toMatchObject({ kind: 'array', minItems: 2 });
  });

  it('max sets maxItems', () => {
    expect(s.array(s.string()).max(5).definition()).toMatchObject({ kind: 'array', maxItems: 5 });
  });

  it('length sets both bounds', () => {
    expect(s.array(s.string()).length(3).definition()).toMatchObject({ kind: 'array', maxItems: 3, minItems: 3 });
  });

  it('nested item descriptors recurse', () => {
    expect(s.array(s.array(s.number())).definition()).toMatchObject({
      items: { items: { kind: 'number' }, kind: 'array' },
      kind: 'array',
    });
  });
});

// ---------------------------------------------------------------------------
// Object
// ---------------------------------------------------------------------------

describe('definition(): object', () => {
  it('returns field descriptors with strict: true by default', () => {
    expect(s.object({ name: s.string() }).definition()).toMatchObject({
      fields: { name: { kind: 'string' } },
      kind: 'object',
      strict: true,
    });
  });

  it('relaxed() sets strict: false', () => {
    expect(s.object({ x: s.number() }).relaxed().definition()).toMatchObject({ kind: 'object', strict: false });
  });

  it('strict() on a relaxed schema returns strict: true', () => {
    expect(s.object({ x: s.number() }).relaxed().strict().definition()).toMatchObject({
      kind: 'object',
      strict: true,
    });
  });

  it('nested objects recurse into fields', () => {
    const d = s.object({ address: s.object({ city: s.string() }) }).definition();

    expect(d).toMatchObject({
      fields: { address: { fields: { city: { kind: 'string' } }, kind: 'object' } },
      kind: 'object',
    });
  });

  it('optional fields reflect isOptional in their descriptor', () => {
    const d = s.object({ name: s.string().optional() }).definition() as any;

    expect(d.fields.name.isOptional).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tuple
// ---------------------------------------------------------------------------

describe('definition(): tuple', () => {
  it('returns item descriptors and rest: null when no rest', () => {
    expect(s.tuple([s.string(), s.number()]).definition()).toMatchObject({
      items: [{ kind: 'string' }, { kind: 'number' }],
      kind: 'tuple',
      rest: null,
    });
  });

  it('includes rest descriptor when set', () => {
    expect(s.tuple([s.string()]).rest(s.number()).definition()).toMatchObject({
      kind: 'tuple',
      rest: { kind: 'number' },
    });
  });
});

// ---------------------------------------------------------------------------
// Union / Intersect
// ---------------------------------------------------------------------------

describe('definition(): union', () => {
  it('returns branches', () => {
    expect(s.union(s.string(), s.number()).definition()).toMatchObject({
      branches: [{ kind: 'string' }, { kind: 'number' }],
      kind: 'union',
    });
  });

  it('literal branches are described individually', () => {
    expect(s.union(s.literal('a'), s.literal('b')).definition()).toMatchObject({
      branches: [
        { kind: 'literal', value: 'a' },
        { kind: 'literal', value: 'b' },
      ],
      kind: 'union',
    });
  });
});

describe('definition(): intersect', () => {
  it('returns branches', () => {
    expect(s.intersect(s.object({ a: s.string() }), s.object({ b: s.number() })).definition()).toMatchObject({
      branches: [{ kind: 'object' }, { kind: 'object' }],
      kind: 'intersect',
    });
  });
});

// ---------------------------------------------------------------------------
// Variant
// ---------------------------------------------------------------------------

describe('definition(): discriminatedUnion', () => {
  it('returns discriminator and branch descriptors keyed by value', () => {
    const schema = s.discriminatedUnion('type', {
      a: s.object({ type: s.literal('a'), x: s.string() }),
      b: s.object({ type: s.literal('b'), y: s.number() }),
    });

    const d = schema.definition() as any;

    expect(d).toMatchObject({ discriminator: 'type', kind: 'discriminatedUnion' });
    expect(d.branches.a).toMatchObject({ kind: 'object' });
    expect(d.branches.b).toMatchObject({ kind: 'object' });
  });
});

// ---------------------------------------------------------------------------
// Record / Set / Map
// ---------------------------------------------------------------------------

describe('definition(): record', () => {
  it('returns key and value descriptors', () => {
    expect(s.record(s.string(), s.number()).definition()).toMatchObject({
      key: { kind: 'string' },
      kind: 'record',
      value: { kind: 'number' },
    });
  });
});

describe('definition(): set', () => {
  it('returns item descriptor', () => {
    expect(s.set(s.string()).definition()).toMatchObject({ items: { kind: 'string' }, kind: 'set' });
  });
});

describe('definition(): map', () => {
  it('returns key and value descriptors', () => {
    expect(s.map(s.string(), s.number()).definition()).toMatchObject({
      key: { kind: 'string' },
      kind: 'map',
      value: { kind: 'number' },
    });
  });
});

// ---------------------------------------------------------------------------
// Pipe
// ---------------------------------------------------------------------------

describe('definition(): pipe', () => {
  it('returns from and to descriptors', () => {
    const schema = s.string().pipe(s.string().min(1));

    expect(schema.definition()).toMatchObject({ from: { kind: 'string' }, kind: 'pipe', to: { kind: 'string' } });
  });
});

// ---------------------------------------------------------------------------
// Wrapper schemas (optional / nullable / nullish)
// ---------------------------------------------------------------------------

describe('definition(): wrapper schemas', () => {
  it('optional() sets isOptional, preserves inner kind', () => {
    const d = s.string().optional().definition();

    expect(d).toMatchObject({ isOptional: true, kind: 'string' });
    expect((d as any).isNullable).toBeUndefined();
  });

  it('nullable() sets isNullable, preserves inner kind', () => {
    const d = s.string().nullable().definition();

    expect(d).toMatchObject({ isNullable: true, kind: 'string' });
    expect((d as any).isOptional).toBeUndefined();
  });

  it('nullish() sets both isOptional and isNullable', () => {
    expect(s.string().nullish().definition()).toMatchObject({ isNullable: true, isOptional: true, kind: 'string' });
  });

  it('optional().nullable() collapses to nullish descriptor', () => {
    expect(s.string().optional().nullable().definition()).toMatchObject({
      isNullable: true,
      isOptional: true,
      kind: 'string',
    });
  });

  it('inner constraints are preserved through a wrapper', () => {
    expect(s.string().min(3).optional().definition()).toMatchObject({
      isOptional: true,
      kind: 'string',
      minLength: 3,
    });
  });

  it('description set on the wrapper propagates to the descriptor', () => {
    expect(s.string().optional().describe('opt field').definition()).toMatchObject({
      description: 'opt field',
      isOptional: true,
    });
  });

  it('number constraints are preserved through nullable', () => {
    expect(s.number().int().min(0).nullable().definition()).toMatchObject({
      integer: true,
      isNullable: true,
      kind: 'number',
      minimum: 0,
    });
  });
});
