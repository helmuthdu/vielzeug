import { s, SpellDefinitionError } from '../index';
import { fromDefinition } from '../json';

describe('declarative definitions', () => {
  it('converts frozen definitions through JSON tooling', () => {
    const definition = s.object({ age: s.number(), name: s.string() }).definition();

    expect(Object.isFrozen(definition)).toBe(true);
    expect(fromDefinition(definition)).toEqual({
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
