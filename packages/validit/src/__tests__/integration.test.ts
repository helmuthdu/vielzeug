import { v } from '../index';

describe('complex schemas', () => {
  it('validates a user registration form', () => {
    const schema = v
      .object({
        age: v.number().int().min(13),
        confirmPassword: v.string(),
        email: v.string().email(),
        password: v
          .string()
          .min(8)
          .refine((s) => /[A-Z]/.test(s), 'Must contain uppercase')
          .refine((s) => /[0-9]/.test(s), 'Must contain number'),
        terms: v.boolean().refine((b) => b === true, 'Must accept terms'),
        username: v
          .string()
          .min(3)
          .max(20)
          .regex(/^[a-zA-Z0-9_]+$/),
      })
      .refine((d) => d.password === d.confirmPassword, 'Passwords must match');

    const valid = {
      age: 25,
      confirmPassword: 'SecurePass1',
      email: 'alice@example.com',
      password: 'SecurePass1',
      terms: true,
      username: 'alice_99',
    };

    expect(schema.parse(valid)).toEqual(valid);
    expect(() => schema.parse({ ...valid, confirmPassword: 'Different1' })).toThrow('Passwords must match');
  });

  it('validates an array of objects with deep paths', () => {
    const schema = v.array(v.object({ id: v.number(), name: v.string() }));
    const result = schema.safeParse([
      { id: 1, name: 'A' },
      { id: 'bad', name: 'B' },
    ]);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].path).toEqual([1, 'id']);
    }
  });

  it('validates a complex nested structure', () => {
    const schema = v.object({
      email: v.string().email(),
      id: v.number().int().positive(),
      profile: v.object({
        address: v.object({ city: v.string(), zip: v.string().regex(/^\d{5}$/) }).optional(),
        firstName: v.string(),
      }),
      roles: v.array(v.union(v.literal('admin'), v.literal('user'), v.literal('guest'))).min(1),
      settings: v.object({
        theme: v.union(v.literal('light'), v.literal('dark')).default('light' as 'light' | 'dark'),
      }),
    });

    const data = {
      email: 'alice@example.com',
      id: 1,
      profile: { address: { city: 'NY', zip: '10001' }, firstName: 'Alice' },
      roles: ['admin'],
      settings: { theme: 'dark' as const },
    };

    expect(schema.parse(data)).toEqual(data);
  });
});

describe('parseAsync() with catch()', () => {
  it('returns fallback for invalid input in async path', async () => {
    const schema = v.string().catch('fallback');

    expect(await schema.parseAsync('hello')).toBe('hello');
    expect(await schema.parseAsync(42 as any)).toBe('fallback');
  });

  it('async object schema catch() returns fallback', async () => {
    const schema = v.object({ name: v.string() }).catch({ name: 'unknown' });

    expect(await schema.parseAsync('bad' as any)).toEqual({ name: 'unknown' });
  });
});
