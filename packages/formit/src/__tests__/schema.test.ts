import { createForm, schemaValidator } from '../index';

describe('schemaValidator', () => {
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

  test('converts a safeParse-compatible schema into a form validator', async () => {
    const form = createForm({
      defaultValues: { age: 15, email: 'notvalid' },
      validator: schemaValidator(mockSchema),
    });

    const { errors, valid } = await form.validateAll();

    expect(valid).toBe(false);
    expect(errors.email).toBe('Invalid email');
    expect(errors.age).toBe('Must be 18+');
  });

  test('returns undefined (no errors) when schema validation passes', async () => {
    const form = createForm({
      defaultValues: { age: 25, email: 'alice@example.com' },
      validator: schemaValidator(mockSchema),
    });

    const { errors, valid } = await form.validateAll();

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
    const form = createForm({ defaultValues: { email: '' }, validator: schemaValidator(multiSchema) });
    const { errors } = await form.validateAll();

    expect(errors.email).toBe('First');
  });

  test('root-level issues (path=[]) are stored under _form key', async () => {
    const crossFieldSchema = {
      safeParse: (_: unknown) => ({
        error: {
          issues: [{ message: 'Passwords do not match', path: [] }],
        },
        success: false as const,
      }),
    };
    const form = createForm({
      defaultValues: { confirm: '', password: '' },
      validator: schemaValidator(crossFieldSchema),
    });
    const { errors } = await form.validateAll();

    expect(errors._form).toBe('Passwords do not match');
  });
});
