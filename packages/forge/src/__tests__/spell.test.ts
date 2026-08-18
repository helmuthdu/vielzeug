import { s } from '@vielzeug/spell';

import { createForm } from '../index';
import { customValidator } from '../spell';

describe('Spell adapter', () => {
  test('maps nested and form errors without transforming form values', async () => {
    const schema = s
      .object({ profile: s.object({ email: s.string().email() }) })
      .check((_value, context) => context.addIssue({ code: 'custom', message: 'Unavailable', path: [] }));
    const form = createForm({
      initialValues: { profile: { email: 'invalid' } },
      validate: customValidator(schema),
    });

    await expect(form.validate()).resolves.toEqual({
      errors: { profile: { email: 'Invalid email address' } },
      formError: 'Unavailable',
      status: 'invalid',
    });
    expect(form.field('profile').field('email').error).toBe('Invalid email address');
    expect(form.value.profile.email).toBe('invalid');
  });

  test('maps item failures to per-item array fields', async () => {
    const schema = s.object({ items: s.array(s.object({ email: s.string().email() })) });
    const form = createForm({
      initialValues: { items: [{ email: 'invalid' }] },
      validate: customValidator(schema),
    });

    await expect(form.validate()).resolves.toEqual({
      errors: { items: [{ email: 'Invalid email address' }] },
      formError: undefined,
      status: 'invalid',
    });
    expect(form.field('items').field(0).field('email').error).toBe('Invalid email address');
    expect(form.field('items').field(0).error).toBeUndefined();
    expect(form.field('items').error).toBeUndefined();
  });

  test('keeps the first duplicate message and ignores unsafe paths', async () => {
    const schema = s.object({
      email: s.string().check((_value, context) => {
        context.addIssue({ code: 'custom', message: 'First', path: [] });
        context.addIssue({ code: 'custom', message: 'Second', path: [] });
      }),
      unsafe: s.string().check((_value, context) => {
        context.addIssue({ code: 'custom', message: 'Ignored', path: ['__proto__'] });
      }),
    });
    const form = createForm({
      initialValues: { email: '', unsafe: '' },
      validate: customValidator(schema),
    });

    await form.validate();

    expect(form.field('email').error).toBe('First');

    const errors = form.state.errors;

    expect(typeof errors === 'object' && errors !== null ? Object.hasOwn(errors, '__proto__') : false).toBe(false);
  });

  test('returns aborted before a slow Spell parser resolves', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const schema = s.object({ email: s.string().checkAsync(async () => pending) });
    const form = createForm({ initialValues: { email: '' }, validate: customValidator(schema) });
    const controller = new AbortController();
    const validation = form.validate(controller.signal);

    controller.abort();

    await expect(validation).resolves.toEqual({ status: 'aborted' });
    release();
  });

  test('preserves ordinary issues while expanding a union best match', async () => {
    const schema = s.object({
      email: s.string().email(),
      value: s.union(s.object({ email: s.string().email() }), s.object({ id: s.number() })),
    });
    const form = createForm({
      initialValues: { email: 'invalid', value: { email: 'invalid' } },
      validate: customValidator(schema),
    });

    await expect(form.validate()).resolves.toEqual({
      errors: { email: 'Invalid email address', value: { email: 'Invalid email address' } },
      formError: undefined,
      status: 'invalid',
    });
  });

  test('expands every failing union independently', async () => {
    const option = s.union(s.object({ email: s.string().email() }), s.object({ id: s.number() }));
    const schema = s.object({ billing: option, shipping: option });
    const form = createForm({
      initialValues: { billing: { email: 'invalid' }, shipping: { email: 'invalid' } },
      validate: customValidator(schema),
    });

    await form.validate();

    expect(form.field('billing').field('email').error).toBe('Invalid email address');
    expect(form.field('shipping').field('email').error).toBe('Invalid email address');
  });

  test('maps array-item union errors to per-item fields', async () => {
    const option = s.union(s.object({ email: s.string().email() }), s.object({ id: s.number() }));
    const schema = s.object({ items: s.array(option) });
    const form = createForm({
      initialValues: { items: [{ email: 'invalid' }] },
      validate: customValidator(schema),
    });

    await form.validate();

    expect(form.field('items').field(0).field('email').error).toBe('Invalid email address');
    expect(form.field('items').error).toBeUndefined();
  });

  test('handles late parser rejection after abort', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const schema = s.object({
      email: s.string().checkAsync(async () => {
        await pending;
        throw new Error('late failure');
      }),
    });
    const form = createForm({ initialValues: { email: '' }, validate: customValidator(schema) });
    const controller = new AbortController();
    const validation = form.validate(controller.signal);

    controller.abort();

    await expect(validation).resolves.toEqual({ status: 'aborted' });
    release();
    await Promise.resolve();
    expect(form.state.validity).toBe('unknown');
  });
});
