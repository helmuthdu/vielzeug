import { type StandardSchemaV1, s } from '../index';

const validate = (schema: StandardSchemaV1, value: unknown) => Promise.resolve(schema['~standard'].validate(value));

describe('Standard Schema', () => {
  it('exposes the v1 structural protocol without an adapter', async () => {
    const schema: StandardSchemaV1<unknown, { name: string }> = s.object({ name: s.string() });

    await expect(validate(schema, { name: 'Ada' })).resolves.toEqual({ value: { name: 'Ada' } });
    await expect(validate(schema, { name: 42 })).resolves.toMatchObject({
      issues: [expect.objectContaining({ message: expect.any(String), path: ['name'] })],
    });
    expect(schema['~standard']).toMatchObject({ vendor: 'vielzeug', version: 1 });
  });

  it('validates synchronously unless the schema has async checks', () => {
    expect(s.string()['~standard'].validate('x')).toEqual({ value: 'x' });
    expect(
      s
        .string()
        .checkAsync(async () => true)
        ['~standard'].validate('x'),
    ).toBeInstanceOf(Promise);
  });

  it('preserves fluent constraints, modifiers, checks, and transforms', async () => {
    await expect(validate(s.string().min(3), 'x')).resolves.toMatchObject({
      issues: [expect.objectContaining({ path: [] })],
    });
    await expect(validate(s.string().optional(), undefined)).resolves.toEqual({ value: undefined });
    await expect(validate(s.string().default('fallback'), undefined)).resolves.toEqual({ value: 'fallback' });
    await expect(validate(s.string().catch('fallback'), 42)).resolves.toEqual({ value: 'fallback' });
    await expect(
      validate(
        s.string().check(() => 'Rejected'),
        'value',
      ),
    ).resolves.toMatchObject({
      issues: [expect.objectContaining({ message: 'Rejected' })],
    });
    await expect(
      validate(
        s.string().checkAsync(async () => 'Rejected asynchronously'),
        'value',
      ),
    ).resolves.toMatchObject({
      issues: [expect.objectContaining({ message: 'Rejected asynchronously' })],
    });
    await expect(
      validate(
        s.string().transform((value) => value.length),
        'value',
      ),
    ).resolves.toEqual({ value: 5 });
  });

  it('reports stable union issues without guessing a branch', async () => {
    const schema = s.object({
      choice: s.union(
        s.union(s.object({ value: s.string() }), s.object({ enabled: s.boolean() })),
        s.object({ count: s.number() }),
      ),
    });

    await expect(validate(schema, { choice: { value: 42 } })).resolves.toEqual({
      issues: [{ message: 'Does not match any of the expected types', path: ['choice'] }],
    });
  });
});
