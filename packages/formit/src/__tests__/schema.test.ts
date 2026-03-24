import { createForm, fromSchema } from '../index';

describe('fromSchema', () => {
  const mockSchema = {
    safeParse: (data: unknown) => {
      const v = data as { age: number; email: string };
      const issues: { message: string; path: string[] }[] = [];

      if (!String(v.email ?? '').includes('@')) issues.push({ message: 'Invalid email', path: ['email'] });

      if ((v.age ?? 0) < 18) issues.push({ message: 'Must be 18+', path: ['age'] });

      if (issues.length) return { error: { issues }, success: false as const };

      return { success: true as const };
    },
  };

  test('converts a safeParse-compatible schema into a validator option', async () => {
    const form = createForm({
      defaultValues: { age: 15, email: 'notvalid' },
      ...fromSchema(mockSchema),
    });

    const { errors, valid } = await form.validate();

    expect(valid).toBe(false);
    expect(errors.email).toBe('Invalid email');
    expect(errors.age).toBe('Must be 18+');
  });

  test('returns undefined (no errors) when schema validation passes', async () => {
    const form = createForm({
      defaultValues: { age: 25, email: 'alice@example.com' },
      ...fromSchema(mockSchema),
    });

    const { errors, valid } = await form.validate();

    expect(valid).toBe(true);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  test('first issue per path wins when schema reports multiple issues', async () => {
    const multiSchema = {
      safeParse: (_: unknown) => ({
        error: {
          issues: [
            { message: 'First', path: ['email'] },
            { message: 'Second', path: ['email'] },
          ],
        },
        success: false as const,
      }),
    };
    const form = createForm({ defaultValues: { email: '' }, ...fromSchema(multiSchema) });
    const { errors } = await form.validate();

    expect(errors.email).toBe('First');
  });
});
