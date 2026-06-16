import { type Infer, s } from '../index';

describe('s.variant()', () => {
  const schema = s.variant('type', {
    error: s.object({ message: s.string() }),
    ok: s.object({ data: s.string() }),
  });

  it('routes to the correct branch by discriminator', () => {
    expect(schema.parse({ data: 'yes', type: 'ok' })).toEqual({ data: 'yes', type: 'ok' });
    expect(schema.parse({ message: 'oops', type: 'error' })).toEqual({ message: 'oops', type: 'error' });
  });

  it('fails when discriminator value not found', () => {
    const result = schema.safeParse({ type: 'unknown' });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].code).toBe('invalid_variant');
    }
  });

  it('fails when discriminator key is missing', () => {
    const result = schema.safeParse({ data: 'yes' });

    expect(result.success).toBe(false);
  });

  it('infers the union type', () => {
    type T = Infer<typeof schema>;

    const ok: T = { data: 'yes', type: 'ok' };

    expect(schema.parse(ok)).toEqual(ok);
  });

  it('throws for conflicting discriminator fields in a branch', () => {
    expect(() =>
      s.variant('type', {
        ok: s.object({ data: s.string(), type: s.string() }),
      }),
    ).toThrow(/discriminator/i);
  });

  it('throws for mismatched discriminator literals in a branch', () => {
    expect(() =>
      s.variant('type', {
        ok: s.object({ data: s.string(), type: s.literal('error') }),
      }),
    ).toThrow(/discriminator/i);
  });

  it('allows matching discriminator literals defined explicitly in a branch', () => {
    const explicit = s.variant('type', {
      ok: s.object({ data: s.string(), type: s.literal('ok') }),
    });

    expect(explicit.parse({ data: 'yes', type: 'ok' })).toEqual({ data: 'yes', type: 'ok' });
  });
});

describe('s.variant() — async', () => {
  it('optional().parseAsync(undefined) returns undefined', async () => {
    const schema = s.variant('type', { ok: s.object({ msg: s.string() }) }).optional();

    expect(await schema.parseAsync(undefined)).toBeUndefined();
  });

  it('refine() runs in parseAsync', async () => {
    const schema = s
      .variant('type', { ok: s.object({ msg: s.string() }) })
      .validate((data) => data.msg !== 'forbidden' || 'Forbidden');
    const result = await schema.safeParseAsync({ msg: 'forbidden', type: 'ok' });

    expect(result.success).toBe(false);
  });

  it('parseAsync() routes to correct branch by discriminator', async () => {
    const schema = s.variant('kind', {
      a: s.object({ value: s.number() }),
      b: s.object({ label: s.string() }),
    });

    await expect(schema.parseAsync({ kind: 'a', value: 42 })).resolves.toEqual({ kind: 'a', value: 42 });
    await expect(schema.parseAsync({ kind: 'b', label: 'hi' })).resolves.toEqual({ kind: 'b', label: 'hi' });
  });

  it('safeParseAsync() returns failure for unknown discriminator value', async () => {
    const schema = s.variant('kind', { a: s.object({ value: s.number() }) });
    const result = await schema.safeParseAsync({ kind: 'z', value: 1 });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].code).toBe('invalid_variant');
    }
  });

  it('safeParseAsync() returns failure when discriminator field missing', async () => {
    const schema = s.variant('type', { ok: s.object({ msg: s.string() }) });
    const result = await schema.safeParseAsync({ msg: 'hello' });

    expect(result.success).toBe(false);
  });
});
