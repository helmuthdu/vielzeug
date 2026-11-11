import { createParseContext, SpellDefinitionError, s } from '../index';
import { toJsonSchema } from '../json';

describe('execution and definition boundaries', () => {
  it('runs asynchronous pipe checks only through parseAsync()', async () => {
    const schema = s.string().pipe(s.string().checkAsync(async (value) => value === 'ok' || 'Rejected'));

    const parseSync = schema.parse as unknown as (value: unknown) => unknown;

    expect(() => parseSync.call(schema, 'ok')).toThrow('async checks');
    await expect(schema.parseAsync('ok')).resolves.toBe('ok');
    await expect(schema.parseAsync('no')).rejects.toThrow('Rejected');
  });

  it('freezes object and union composition inputs', () => {
    const shape = { email: s.string().email() };
    const object = s.object(shape);
    const branches = [s.string(), s.number()] as const;
    const union = s.union(...branches);

    shape.email = s.string();

    expect(object.safeParse({ email: 'invalid' }).success).toBe(false);
    expect(Object.isFrozen(object.shape)).toBe(true);
    expect(Object.isFrozen(union.schemas)).toBe(true);
  });

  it('exports only declarative definitions', () => {
    const schema = s.object({ email: s.string().email() });
    const definition = schema.definition();

    expect(Object.isFrozen(definition)).toBe(true);
    expect(toJsonSchema(definition)).toMatchObject({ type: 'object' });
    expect('equals' in schema).toBe(false);
    expect('toDescriptor' in schema).toBe(false);
    expect('toJsonSchema' in schema).toBe(false);
    expect(() => schema.check(() => true).definition()).toThrow(SpellDefinitionError);
  });
});

describe('declarative definitions', () => {
  it('converts frozen definitions through JSON tooling', () => {
    const definition = s.object({ age: s.number(), name: s.string() }).definition();

    expect(Object.isFrozen(definition)).toBe(true);
    expect(toJsonSchema(definition)).toEqual({
      additionalProperties: false,
      properties: { age: { type: 'number' }, name: { type: 'string' } },
      required: ['age', 'name'],
      type: 'object',
    });
  });

  it('rejects runtime behavior that cannot cross a process boundary', () => {
    expect(() => s.string().trim().definition()).toThrow(SpellDefinitionError);
    expect(() =>
      s
        .string()
        .check(() => true)
        .definition(),
    ).toThrow(SpellDefinitionError);
    expect(() => s.string().default('value').definition()).toThrow(SpellDefinitionError);
  });
});

describe('UnionSchema async failure boundaries', () => {
  it('re-throws unexpected errors from asynchronous branches', async () => {
    const boom = new TypeError('unexpected internal error');
    const schema = s.union(
      s.number(),
      s.string().checkAsync(async () => {
        throw boom;
      }),
    );

    await expect(schema.safeParseAsync('hello')).rejects.toThrow('unexpected internal error');
  });

  it('collects validation failures normally', async () => {
    const result = await s.union(s.number(), s.string()).safeParseAsync(true);

    expect(result).toMatchObject({ success: false });

    if (!result.success) expect(result.error.issues[0]?.code).toBe('invalid_union');
  });
});

describe('ordered steps', () => {
  it('checks after transform() see the transformed value', () => {
    const schema = s
      .string()
      .transform((value) => value.length)
      .check((length) => length > 2 || 'Too short');

    expect(schema.parse('abc')).toBe(3);
    expect(() => schema.parse('ab')).toThrow('Too short');
  });

  it('trim() runs in chain order', () => {
    expect(s.string().trim().min(1).safeParse('  ').success).toBe(false);
    expect(s.string().min(1).trim().parse('  ')).toBe('');
  });

  it('skips transforms once an earlier step reported an issue', () => {
    const transform = vi.fn((value: string) => value.toUpperCase());
    const result = s.string().min(3).transform(transform).safeParse('ab');

    expect(result.success).toBe(false);
    expect(transform).not.toHaveBeenCalled();
  });

  it('preprocess() runs before the type check', () => {
    expect(
      s
        .number()
        .preprocess((value) => Number(value))
        .parse('4'),
    ).toBe(4);
  });

  it('default() returns a fresh copy of object defaults', () => {
    const schema = s.object({ tags: s.array(s.string()) }).default({ tags: [] });
    const first = schema.parse(undefined);

    first.tags.push('mutated');

    expect(schema.parse(undefined)).toEqual({ tags: [] });
  });
});

describe('definition coverage', () => {
  it('includes date bounds as ISO strings', () => {
    const min = new Date('2024-01-01T00:00:00.000Z');
    const max = new Date('2024-12-31T00:00:00.000Z');

    expect(s.date().min(min).max(max).definition()).toEqual({
      kind: 'date',
      maximum: max.toISOString(),
      minimum: min.toISOString(),
    });
  });

  it('includes string prefixes, non-empty bounds, and ip formats', () => {
    expect(s.string().nonEmpty().startsWith('id_').ip().definition()).toEqual({
      formats: ['ip'],
      kind: 'string',
      minLength: 1,
      patterns: [{ flags: '', source: '^id_' }],
    });
  });
});

describe('development warnings', () => {
  it('prefixes unsafe message override warnings once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    createParseContext(JSON.parse('{"__proto__": {"polluted": true}}'));

    expect(warn).toHaveBeenCalledWith(
      '[@vielzeug/spell] Ignoring unsafe message override key "__proto__" to prevent prototype mutation.',
    );
    warn.mockRestore();
  });
});
