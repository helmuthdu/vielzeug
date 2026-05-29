import { createForm, schemaValidator } from '../../index';

describe('schemaValidator adapter', () => {
  test('returns field errors from a safeParse-compatible schema', async () => {
    const schema = {
      safeParse: (data: unknown) => {
        const value = data as { age: number; email: string };

        if (value.age >= 18 && value.email.includes('@')) return { success: true as const };

        return {
          error: {
            issues: [
              ...(value.email.includes('@') ? [] : [{ message: 'Invalid email', path: ['email'] }]),
              ...(value.age >= 18 ? [] : [{ message: 'Must be 18+', path: ['age'] }]),
            ],
          },
          success: false as const,
        };
      },
    };
    const form = createForm({
      defaultValues: { age: 15, email: 'invalid' },
      validator: schemaValidator(schema),
    });

    const result = await form.validateAll();

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual({ age: 'Must be 18+', email: 'Invalid email' });
  });

  test('returns valid=true when schema parsing succeeds', async () => {
    const schema = {
      safeParse: () => ({ success: true as const }),
    };
    const form = createForm({ defaultValues: { email: 'a@b.com' }, validator: schemaValidator(schema) });

    const result = await form.validateAll();

    expect(result).toEqual({ errors: {}, valid: true });
  });

  test('uses first issue when schema reports multiple issues for one path', async () => {
    const schema = {
      safeParse: () => ({
        error: {
          issues: [
            { message: 'First', path: ['email'] },
            { message: 'Second', path: ['email'] },
          ],
        },
        success: false as const,
      }),
    };
    const form = createForm({ defaultValues: { email: '' }, validator: schemaValidator(schema) });

    const result = await form.validateAll();

    expect(result.errors.email).toBe('First');
  });

  test('maps root-level schema issues to _form key', async () => {
    const schema = {
      safeParse: () => ({
        error: {
          issues: [{ message: 'Passwords do not match', path: [] }],
        },
        success: false as const,
      }),
    };
    const form = createForm({ defaultValues: { confirm: '', password: '' }, validator: schemaValidator(schema) });

    const result = await form.validateAll();

    expect(result.errors._form).toBe('Passwords do not match');
  });

  test('converts numeric path segments into dot-notation keys', async () => {
    const schema = {
      safeParse: () => ({
        error: {
          issues: [{ message: 'Street is required', path: ['addresses', 0, 'street'] }],
        },
        success: false as const,
      }),
    };
    const form = createForm({
      defaultValues: { addresses: [{ street: '' }] },
      validator: schemaValidator(schema),
    });

    const result = await form.validateAll();

    expect(result.errors['addresses.0.street']).toBe('Street is required');
  });
});
