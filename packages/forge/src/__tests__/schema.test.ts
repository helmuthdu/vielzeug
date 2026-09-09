import { s } from '@vielzeug/spell';

import { createForm } from '../index';
import { schemaValidator } from '../schema';

describe('schemaValidator', () => {
  it('adapts Standard Schema issues to flat Forge issues', async () => {
    const form = createForm({
      initialValues: { email: '' },
      validate: schemaValidator<{ email: string }>({
        '~standard': {
          validate: (value) => {
            const email = (value as { email?: unknown }).email;
            return typeof email === 'string' && email.includes('@')
              ? { value: { email } }
              : { issues: [{ message: 'Invalid email', path: ['email'] }] };
          },
        },
      }),
    });

    await expect(form.validate()).resolves.toEqual({
      issues: [{ message: 'Invalid email', path: ['email'] }],
      status: 'invalid',
    });
  });

  it('settles when asynchronous Standard Schema validation is cancelled', async () => {
    const controller = new AbortController();
    const form = createForm({
      initialValues: { email: '' },
      validate: schemaValidator<{ email: string }>({
        '~standard': { validate: () => new Promise(() => undefined) },
      }),
    });
    const pending = form.validate(controller.signal);

    controller.abort();

    await expect(pending).resolves.toEqual({ status: 'aborted' });
  });

  it('keeps unsupported Standard Schema paths at form level', async () => {
    const validate = schemaValidator<Record<string, unknown>>({
      '~standard': {
        validate: () => ({ issues: [{ message: 'Unsupported path', path: ['items', { key: Symbol('entry') }] }] }),
      },
    });

    await expect(validate({}, new AbortController().signal)).resolves.toEqual([
      { message: 'Unsupported path', path: [] },
    ]);
  });

  it('integrates with Spell through Standard Schema', async () => {
    const form = createForm({
      initialValues: { email: '' },
      validate: schemaValidator(s.object({ email: s.string().email() })),
    });

    await expect(form.validate()).resolves.toMatchObject({
      issues: [{ path: ['email'] }],
      status: 'invalid',
    });
  });
});
