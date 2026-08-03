import { vi } from 'vitest';

import { createForm, ForgeConfigError, ForgeDisposedError, ForgeSubmitError, ForgeValidationError } from '../../index';

describe('form', () => {
  test('owns immutable nested values and preserves unchanged branches', () => {
    const input = { account: { email: '' }, tags: ['a'] };
    const form = createForm({ initialValues: input });
    const previous = form.value;

    form.field('account').field('email').set('a@example.com');

    expect(form.value).toEqual({ account: { email: 'a@example.com' }, tags: ['a'] });
    expect(form.value.tags).toBe(previous.tags);
    expect(previous.account.email).toBe('');
    expect(Object.isFrozen(form.value.account)).toBe(true);
    expect(input.account.email).toBe('');
  });

  test('creates an absent object branch and rejects unsafe or primitive children', () => {
    const form = createForm({ initialValues: { name: '', profile: undefined as { name: string } | undefined } });

    form.field('profile').field('name').set('Ada');

    expect(form.value.profile).toEqual({ name: 'Ada' });
    expect(() => form.field('profile').field('__proto__' as never)).toThrow(ForgeConfigError);
    expect(() => (form.field('name') as never as { field(key: string): unknown }).field('x')).toThrow(ForgeConfigError);
  });

  test('restores an absent parent branch exactly when a child resets', () => {
    const form = createForm({ initialValues: { profile: undefined as { name: string } | undefined } });
    const profile = form.field('profile');
    const name = profile.field('name');

    name.set('Ada');
    name.reset();

    expect(form.value).toEqual({ profile: undefined });
    expect(profile.dirty).toBe(false);
  });

  test('uses immutable replacement functions for arrays and rejects mutable class leaves', () => {
    const form = createForm({ initialValues: { tags: ['a'] } });

    form.field('tags').set((tags) => [...tags, 'b']);

    expect(form.value.tags).toEqual(['a', 'b']);
    expect(() => createForm({ initialValues: { dueAt: new Date() } })).toThrow(ForgeConfigError);
  });

  test('resets fields and forms to their baselines', () => {
    const form = createForm({ initialValues: { profile: { name: 'Ada' } } });
    const name = form.field('profile').field('name');

    name.touch();
    name.set('Grace');
    name.reset();

    expect(name.value).toBe('Ada');
    expect(name.dirty).toBe(false);
    expect(name.touched).toBe(false);

    form.reset({ profile: { name: 'Lin' } });
    form.field('profile').field('name').set('Ada');
    form.reset();

    expect(form.value.profile.name).toBe('Lin');
  });

  test('returns explicit valid and invalid validation results', async () => {
    const form = createForm({
      initialValues: { email: '', profile: { age: 10 } },
      validate: (value) => ({
        fields: {
          email: value.email.includes('@') ? undefined : 'Invalid email',
          profile: { age: value.profile.age >= 18 ? undefined : 'Must be an adult' },
        },
      }),
    });

    await expect(form.validate()).resolves.toEqual({
      errors: { email: 'Invalid email', profile: { age: 'Must be an adult' } },
      formError: undefined,
      status: 'invalid',
    });

    form.field('email').set('a@example.com');
    expect(form.field('profile').field('age').error).toBe('Must be an adult');
    form.field('profile').field('age').set(20);

    await expect(form.validate()).resolves.toEqual({ status: 'valid' });
    expect(form.state.errors).toBeUndefined();
  });

  test('aborts superseded validation without stale writes', async () => {
    let releaseFirst!: (value: { fields: { name: string } }) => void;
    const first = new Promise<{ fields: { name: string } }>((resolve) => {
      releaseFirst = resolve;
    });
    let calls = 0;
    const form = createForm({
      initialValues: { name: '' },
      validate: async (value) => {
        calls++;

        if (calls === 1) return first;

        return value.name ? undefined : { fields: { name: 'Required' } };
      },
    });

    const pending = form.validate();

    await Promise.resolve();
    form.field('name').set('Ada');

    const latest = form.validate();

    releaseFirst({ fields: { name: 'Stale' } });

    await expect(pending).resolves.toEqual({ status: 'aborted' });
    await expect(latest).resolves.toEqual({ status: 'valid' });
    expect(form.field('name').error).toBeUndefined();
  });

  test('wraps validator exceptions with a Forge error', async () => {
    const cause = new Error('network unavailable');
    const form = createForm({ initialValues: { name: '' }, validate: () => Promise.reject(cause) });

    await expect(form.validate()).rejects.toEqual(expect.objectContaining({ cause, name: 'ForgeValidationError' }));
    await expect(form.validate()).rejects.toBeInstanceOf(ForgeValidationError);
  });

  test('submit touches all fields, serializes concurrent calls, and distinguishes aborts', async () => {
    const form = createForm({
      initialValues: { email: '' },
      validate: (value) => (value.email ? undefined : { fields: { email: 'Required' } }),
    });

    await expect(form.submit(() => undefined)).resolves.toEqual({
      errors: { email: 'Required' },
      formError: undefined,
      ok: false,
      type: 'validation',
    });
    expect(form.field('email').touched).toBe(true);

    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });

    form.field('email').set('a@example.com');

    const submission = form.submit(async () => pending);

    await expect(form.submit(() => undefined)).rejects.toBeInstanceOf(ForgeSubmitError);
    release();
    await submission;
  });

  test('isolates subscriber failures from form state transitions', async () => {
    const subscriberErrors: unknown[] = [];
    const form = createForm({
      initialValues: { name: '' },
      onSubscriberError: (error) => subscriberErrors.push(error),
    });
    const failure = new Error('subscriber failed');

    form.subscribe(() => {
      throw failure;
    });

    await expect(form.submit(() => undefined)).resolves.toEqual({ ok: true, value: undefined });
    expect(form.state.submitting).toBe(false);
    expect(subscriberErrors).toContain(failure);
  });

  test('field subscriptions ignore unrelated transitions', () => {
    const form = createForm({ initialValues: { email: '', name: '' } });
    const listener = vi.fn();
    const unsubscribe = form.field('email').subscribe(listener, { immediate: true });

    form.field('name').set('Ada');
    form.field('email').set('a@example.com');
    unsubscribe();

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ value: 'a@example.com' }));
  });

  test('disposal aborts work and rejects future mutations', () => {
    const form = createForm({ initialValues: { name: '' } });

    form.dispose();

    expect(form.disposalSignal.aborted).toBe(true);
    expect(() => form.set({ name: 'Ada' })).toThrow(ForgeDisposedError);
    expect(() => form.subscribe(() => {})).toThrow(ForgeDisposedError);
    expect(() => form.field('name').subscribe(() => {})).toThrow(ForgeDisposedError);
  });
});
