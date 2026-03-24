import { type Infer, v } from '../index';

describe('v.variant()', () => {
  const schema = v.variant('type', {
    error: v.object({ message: v.string() }),
    ok: v.object({ data: v.string() }),
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
});

describe('v.variant() — async', () => {
  it('optional().parseAsync(undefined) returns undefined', async () => {
    const schema = v.variant('type', { ok: v.object({ msg: v.string() }) }).optional();

    expect(await schema.parseAsync(undefined)).toBeUndefined();
  });

  it('refine() runs in parseAsync', async () => {
    const schema = v
      .variant('type', { ok: v.object({ msg: v.string() }) })
      .refine((v) => v.msg !== 'forbidden', 'Forbidden');
    const result = await schema.safeParseAsync({ msg: 'forbidden', type: 'ok' });

    expect(result.success).toBe(false);
  });
});
