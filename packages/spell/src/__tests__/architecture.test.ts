import { s, SpellDefinitionError } from '../index';
import { fromDefinition } from '../json';

describe('Spell 2 execution and definition boundaries', () => {
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
    expect(fromDefinition(definition)).toMatchObject({ type: 'object' });
    expect('equals' in schema).toBe(false);
    expect('toDescriptor' in schema).toBe(false);
    expect('toJsonSchema' in schema).toBe(false);
    expect(() => schema.check(() => true).definition()).toThrow(SpellDefinitionError);
  });
});
