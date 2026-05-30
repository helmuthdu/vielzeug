import { s } from '../index';

describe('complex schemas', () => {
  it('validates a user registration form', () => {
    const schema = s
      .object({
        age: s.number().int().min(13),
        confirmPassword: s.string(),
        email: s.string().email(),
        password: s
          .string()
          .min(8)
          .check((s) => /[A-Z]/.test(s) || 'Must contain uppercase')
          .check((s) => /[0-9]/.test(s) || 'Must contain number'),
        terms: s.boolean().check((b) => b === true || 'Must accept terms'),
        username: s
          .string()
          .min(3)
          .max(20)
          .regex(/^[a-zA-Z0-9_]+$/),
      })
      .check((d) => d.password === d.confirmPassword || 'Passwords must match');

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
    const schema = s.array(s.object({ id: s.number(), name: s.string() }));
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
    const schema = s.object({
      email: s.string().email(),
      id: s.number().int().positive(),
      profile: s.object({
        address: s.object({ city: s.string(), zip: s.string().regex(/^\d{5}$/) }).optional(),
        firstName: s.string(),
      }),
      roles: s.array(s.union(s.literal('admin'), s.literal('user'), s.literal('guest'))).min(1),
      settings: s.object({
        theme: s.union(s.literal('light'), s.literal('dark')).default('light' as 'light' | 'dark'),
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
    const schema = s.string().catch('fallback');

    expect(await schema.parseAsync('hello')).toBe('hello');
    expect(await schema.parseAsync(42 as any)).toBe('fallback');
  });

  it('async object schema catch() returns fallback', async () => {
    const schema = s.object({ name: s.string() }).catch({ name: 'unknown' });

    expect(await schema.parseAsync('bad' as any)).toEqual({ name: 'unknown' });
  });
});
