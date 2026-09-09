import { type StandardSchemaV1, s } from '../index';

describe('Standard Schema', () => {
  it('exposes the v1 structural protocol without an adapter', async () => {
    const schema: StandardSchemaV1<unknown, { name: string }> = s.object({ name: s.string() });

    await expect(schema['~standard'].validate({ name: 'Ada' })).resolves.toEqual({ value: { name: 'Ada' } });
    await expect(schema['~standard'].validate({ name: 42 })).resolves.toMatchObject({
      issues: [expect.objectContaining({ message: expect.any(String), path: ['name'] })],
    });
    expect(schema['~standard']).toMatchObject({ vendor: 'vielzeug', version: 1 });
  });

  it('preserves fluent constraints, modifiers, checks, and transforms', async () => {
    await expect(s.string().min(3)['~standard'].validate('x')).resolves.toMatchObject({
      issues: [expect.objectContaining({ path: [] })],
    });
    await expect(s.string().optional()['~standard'].validate(undefined)).resolves.toEqual({ value: undefined });
    await expect(s.string().default('fallback')['~standard'].validate(undefined)).resolves.toEqual({
      value: 'fallback',
    });
    await expect(s.string().catch('fallback')['~standard'].validate(42)).resolves.toEqual({ value: 'fallback' });
    await expect(
      s
        .string()
        .check(() => 'Rejected')
        ['~standard'].validate('value'),
    ).resolves.toMatchObject({ issues: [expect.objectContaining({ message: 'Rejected' })] });
    await expect(
      s
        .string()
        .checkAsync(async () => 'Rejected asynchronously')
        ['~standard'].validate('value'),
    ).resolves.toMatchObject({ issues: [expect.objectContaining({ message: 'Rejected asynchronously' })] });
    await expect(
      s
        .string()
        .transform((value) => value.length)
        ['~standard'].validate('value'),
    ).resolves.toEqual({
      value: 5,
    });
  });

  it('reports stable union issues without guessing a branch', async () => {
    const schema = s.object({
      choice: s.union(
        s.union(s.object({ value: s.string() }), s.object({ enabled: s.boolean() })),
        s.object({ count: s.number() }),
      ),
    });

    await expect(schema['~standard'].validate({ choice: { value: 42 } })).resolves.toEqual({
      issues: [{ message: 'Does not match any of the expected types', path: ['choice'] }],
    });
  });
});
