import { createForm } from '../../index';

function deferred<T>(): {
  promise: Promise<T>;
  reject: (reason?: unknown) => void;
  resolve: (value: T | PromiseLike<T>) => void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, reject, resolve };
}

describe('form validation', () => {
  test('validateField returns and stores the field error', async () => {
    const form = createForm({
      validators: { email: (v: unknown) => (!String(v).includes('@') ? 'Invalid email' : undefined) },
    });

    form.set('email', 'not-an-email');

    expect(await form.validateField('email')).toBe('Invalid email');
    expect(form.field('email').error).toBe('Invalid email');
  });

  test('validateAll combines field-level and form-level validators', async () => {
    const form = createForm({
      defaultValues: { confirm: 'xyz', password: '' },
      validator: (vals) => (vals.password !== vals.confirm ? { confirm: 'Must match' } : undefined),
      validators: { password: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    const result = await form.validateAll();

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual({ confirm: 'Must match', password: 'Required' });
  });

  test('validateTouched only validates touched fields', async () => {
    const form = createForm({
      validators: {
        email: (v: unknown) => (!v ? 'Email required' : undefined),
        name: (v: unknown) => (!v ? 'Name required' : undefined),
      },
    });

    form.touch('name');

    const result = await form.validateTouched();

    expect(result.errors).toEqual({ name: 'Name required' });
  });

  test('validateFields validates only explicitly requested fields', async () => {
    const form = createForm({
      validators: {
        age: (v: unknown) => (!v ? 'Age required' : undefined),
        email: (v: unknown) => (!v ? 'Email required' : undefined),
        name: (v: unknown) => (!v ? 'Name required' : undefined),
      },
    });

    const result = await form.validateFields(['email', 'name']);

    expect(result.errors).toEqual({ email: 'Email required', name: 'Name required' });
  });

  test('validateFields evaluates only requested field validators, not the form validator', async () => {
    const form = createForm({
      defaultValues: { age: 10, consent: false, name: '' },
      validator: (values) => (!values.consent ? { consent: 'Consent required' } : undefined),
      validators: {
        age: (value: unknown) => (Number(value) < 18 ? 'Must be 18+' : undefined),
        name: (value: unknown) => (!value ? 'Name required' : undefined),
      },
    });

    const result = await form.validateFields(['age']);

    expect(result.errors).toEqual({ age: 'Must be 18+' });
    expect(result.errors.consent).toBeUndefined();
  });

  test('validateTouched evaluates only touched field validators, not the form validator', async () => {
    const form = createForm({
      defaultValues: { confirm: 'x', password: '' },
      validator: (values) => (values.password !== values.confirm ? { confirm: 'Must match' } : undefined),
      validators: { password: (value: unknown) => (!value ? 'Required' : undefined) },
    });

    form.touch('password');

    const result = await form.validateTouched();

    expect(result.errors).toEqual({ password: 'Required' });
    expect(result.errors.confirm).toBeUndefined();
  });

  test('validateField evaluates only that field validator, not the form validator', async () => {
    let formValidatorCalls = 0;
    const form = createForm({
      defaultValues: { confirm: 'x', password: '' },
      validator: () => {
        formValidatorCalls++;

        return undefined;
      },
      validators: { password: (value: unknown) => (!value ? 'Required' : undefined) },
    });

    await form.validateField('password');

    expect(form.field('password').error).toBe('Required');
    expect(formValidatorCalls).toBe(0);
  });

  test('setValidator can dynamically add and remove field validators', async () => {
    const form = createForm({ defaultValues: { name: '' } });

    form.setValidator('name', (v: unknown) => (!v ? 'Required' : undefined));
    await form.validateField('name');
    expect(form.field('name').error).toBe('Required');

    form.setValidator('name', undefined);
    expect(form.field('name').error).toBeUndefined();

    await form.validateField('name');
    expect(form.field('name').error).toBeUndefined();
  });

  test('validateField clears stale field errors when no validator is registered', async () => {
    const form = createForm({ defaultValues: { name: '' } });

    form.setError('name', 'Stale');

    expect(await form.validateField('name')).toBeUndefined();
    expect(form.field('name').error).toBeUndefined();
  });

  test('validateAll returns valid when no validators are registered', async () => {
    const form = createForm({ defaultValues: { name: 'Alice' } });

    await expect(form.validateAll()).resolves.toEqual({ errors: {}, valid: true });
  });

  test('form-level errors from validateAll persist through subsequent validateField calls', async () => {
    const form = createForm({
      defaultValues: { confirm: 'x', password: '' },
      validator: (values) => (values.password !== values.confirm ? { _form: 'Passwords must match' } : undefined),
      validators: { password: (value: unknown) => (!value ? 'Required' : undefined) },
    });

    await form.validateAll();
    expect(form.state.errors._form).toBe('Passwords must match');

    form.set('password', 'abc');
    await form.validateField('password');

    expect(form.field('password').error).toBeUndefined();
    expect(form.state.errors._form).toBe('Passwords must match');
  });

  test('new validation run wins over an older aborted field validation', async () => {
    const firstStarted = deferred<void>();
    const releaseSecond = deferred<void>();
    let runCount = 0;
    const form = createForm({
      validators: {
        name: async (value: unknown, signal?: AbortSignal) => {
          runCount++;

          if (runCount === 1) {
            firstStarted.resolve();

            await new Promise<never>((_, reject) => {
              signal?.addEventListener(
                'abort',
                () => {
                  const abortError = new Error('Aborted');

                  abortError.name = 'AbortError';
                  reject(abortError);
                },
                { once: true },
              );
            });
          }

          await releaseSecond.promise;

          return value === 'ok' ? undefined : 'Invalid';
        },
      },
    });

    form.set('name', 'bad');

    const first = form.validateField('name');

    await firstStarted.promise;

    form.set('name', 'ok');

    const second = form.validateField('name');

    releaseSecond.resolve(undefined);

    await second;
    await first;

    expect(form.field('name').error).toBeUndefined();
  });

  test('isValidating toggles during async validation and validatingFields tracks the field name', async () => {
    const form = createForm({
      validators: {
        slow: () => new Promise<string | undefined>((resolve) => setTimeout(() => resolve(undefined), 10)),
      },
    });
    let sawValidating = false;
    let sawValidatingField = false;

    form.subscribe((state) => {
      if (state.isValidating) {
        sawValidating = true;

        if (state.validatingFields.includes('slow')) sawValidatingField = true;
      }
    });

    await form.validateField('slow');

    expect(sawValidating).toBe(true);
    expect(sawValidatingField).toBe(true);
    expect(form.state.isValidating).toBe(false);
    expect(form.state.validatingFields).toHaveLength(0);
  });

  test('reset() aborts an in-flight validateAll run and leaves the form clean', async () => {
    const started = deferred<void>();

    const form = createForm({
      defaultValues: { name: '' },
      validators: {
        name: (_value: unknown, signal: AbortSignal | undefined) =>
          new Promise<string | undefined>((_, reject) => {
            started.resolve();
            signal?.addEventListener(
              'abort',
              () => {
                const err = new Error('aborted');

                err.name = 'AbortError';
                reject(err);
              },
              { once: true },
            );
          }),
      },
    });

    const validation = form.validateAll();

    await started.promise;

    form.reset();

    await validation;

    expect(form.field('name').error).toBeUndefined();
    expect(form.state.isValidating).toBe(false);
  });
});

describe('form submit', () => {
  test('submit returns handler value when validation passes', async () => {
    const form = createForm({
      defaultValues: { age: 30, name: 'Alice' },
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    const result = await form.submit((vals) => `${vals.name}:${vals.age}`);

    expect(result).toEqual({ ok: true, value: 'Alice:30' });
  });

  test('submit returns validation result and touches fields when invalid', async () => {
    const form = createForm({
      defaultValues: { name: '' },
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    const result = await form.submit(async () => 'never');

    expect(result.ok).toBe(false);

    if (!result.ok && result.type === 'validation') {
      expect(result.errors).toEqual({ name: 'Required' });
    }

    expect(form.field('name').touched).toBe(true);
  });

  test('submit throws when called while already submitting', async () => {
    const form = createForm({ defaultValues: { x: 1 } });
    const inFlight = form.submit(() => new Promise<void>((resolve) => setTimeout(resolve, 20)));

    await expect(form.submit(async () => undefined)).rejects.toThrow(
      'submit() called while a submission is already in progress',
    );

    await inFlight;
  });

  test('submit increments submitCount for each attempt', async () => {
    const form = createForm({ defaultValues: { x: 1 } });

    await form.submit(async () => undefined);
    await form.submit(async () => undefined);

    expect(form.state.submitCount).toBe(2);
  });

  test('isSubmitting toggles while submit handler is running', async () => {
    const form = createForm({ defaultValues: { x: 1 } });
    let sawSubmitting = false;

    form.subscribe((state) => {
      if (state.isSubmitting) sawSubmitting = true;
    });

    await form.submit(() => new Promise<void>((resolve) => setTimeout(resolve, 10)));

    expect(sawSubmitting).toBe(true);
    expect(form.state.isSubmitting).toBe(false);
  });
});
