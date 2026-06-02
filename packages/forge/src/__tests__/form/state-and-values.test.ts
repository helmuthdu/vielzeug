import { createForm } from '../../index';

describe('form state and values', () => {
  test('stores primitive values without coercion', () => {
    const form = createForm({ defaultValues: { age: 25, flag: true, name: 'Alice' } });

    expect(form.get('age')).toBe(25);
    expect(form.get('flag')).toBe(true);
    expect(form.get('name')).toBe('Alice');
  });

  test('flattens nested object defaults into dot-notation field keys', () => {
    const form = createForm({ defaultValues: { user: { name: 'Alice', profile: { city: 'NYC' } } } });

    expect(form.get('user')).toBeUndefined();
    expect(form.get('user.name')).toBe('Alice');
    expect(form.get('user.profile.city')).toBe('NYC');
  });

  test('values() returns nested object shape', () => {
    const form = createForm({ defaultValues: { user: { name: 'Alice' } } });

    form.set('user.name', 'Bob');

    expect(form.values()).toEqual({ user: { name: 'Bob' } });
  });

  test('set with touched:true marks the field touched', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    form.set('x', 2, { touched: true });

    expect(form.field('x').touched).toBe(true);
  });

  test('dirty tracking clears when a field is set back to baseline', () => {
    const form = createForm({ defaultValues: { name: 'Alice' } });

    form.set('name', 'Bob');
    expect(form.field('name').dirty).toBe(true);

    form.set('name', 'Alice');
    expect(form.field('name').dirty).toBe(false);
  });

  test('Date dirty tracking uses reference equality', () => {
    const initial = new Date('2024-01-01T00:00:00.000Z');
    const form = createForm({ defaultValues: { dueAt: initial } });

    // Same reference — not dirty
    form.set('dueAt', initial);
    expect(form.field('dueAt').dirty).toBe(false);

    // Different reference (even same timestamp) — dirty
    form.set('dueAt', new Date('2024-01-01T00:00:00.000Z'));
    expect(form.field('dueAt').dirty).toBe(true);
  });

  test('reset restores baseline values and clears meta state', () => {
    const form = createForm({ defaultValues: { age: 25, name: 'Alice' } });

    form.set('name', 'Bob');
    form.touch('name');
    form.setError('name', 'Too short');
    form.reset();

    expect(form.values()).toEqual({ age: 25, name: 'Alice' });
    expect(form.field('name')).toEqual({ dirty: false, error: undefined, touched: false, value: 'Alice' });
  });

  test('replace updates current values and baseline for future reset', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    form.replace({ x: 99 });
    form.set('x', 100);
    form.reset();

    expect(form.values()).toEqual({ x: 99 });
  });

  test('reset aborts in-flight validation and prevents stale errors', async () => {
    let startedResolve!: () => void;
    const started = new Promise<void>((resolve) => {
      startedResolve = resolve;
    });

    const form = createForm({
      defaultValues: { name: 'ok' },
      validators: {
        name: async (_value: unknown, signal?: AbortSignal) => {
          startedResolve();

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

          return 'Invalid';
        },
      },
    });

    form.set('name', 'bad');

    const pendingValidation = form.validateField('name');

    await started;

    form.reset();
    await pendingValidation;

    expect(form.field('name')).toEqual({ dirty: false, error: undefined, touched: false, value: 'ok' });
  });

  test('replace aborts in-flight validation and prevents stale errors', async () => {
    let startedResolve!: () => void;
    const started = new Promise<void>((resolve) => {
      startedResolve = resolve;
    });

    const form = createForm({
      defaultValues: { name: 'ok' },
      validators: {
        name: async (_value: unknown, signal?: AbortSignal) => {
          startedResolve();

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

          return 'Invalid';
        },
      },
    });

    form.set('name', 'bad');

    const pendingValidation = form.validateField('name');

    await started;

    form.replace({ name: 'replaced' });
    await pendingValidation;

    expect(form.field('name')).toEqual({ dirty: false, error: undefined, touched: false, value: 'replaced' });
  });

  test('resetField only affects the targeted field', () => {
    const form = createForm({ defaultValues: { age: 25, name: 'Alice' } });

    form.set('age', 30);
    form.set('name', 'Bob');
    form.touch('name');
    form.setError('name', 'Too long');
    form.resetField('name');

    expect(form.field('name')).toEqual({ dirty: false, error: undefined, touched: false, value: 'Alice' });
    expect(form.get('age')).toBe(30);
  });

  test('resetField aborts in-flight validation and prevents stale errors', async () => {
    let startedResolve!: () => void;
    const started = new Promise<void>((resolve) => {
      startedResolve = resolve;
    });

    const form = createForm({
      defaultValues: { name: 'ok' },
      validators: {
        name: async (_value: unknown, signal?: AbortSignal) => {
          startedResolve();

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

          return 'Invalid';
        },
      },
    });

    form.set('name', 'bad');

    const pendingValidation = form.validateField('name');

    await started;

    form.resetField('name');
    await pendingValidation;

    expect(form.field('name')).toEqual({ dirty: false, error: undefined, touched: false, value: 'ok' });
  });

  test('removeField removes value, baseline, and validator state', async () => {
    let validatorCalls = 0;
    const form = createForm({
      defaultValues: { email: '', name: '' },
      validators: {
        name: (value: unknown) => {
          validatorCalls++;

          return value ? undefined : 'Required';
        },
      },
    });

    form.touch('name');
    form.setError('name', 'Required');

    form.removeField('name');
    form.reset();

    await expect(form.validate()).resolves.toEqual({ errors: {}, valid: true });

    expect(form.get('name')).toBeUndefined();
    expect(form.get('email')).toBe('');
    expect(form.field('name')).toEqual({ dirty: false, error: undefined, touched: false, value: undefined });
    expect(validatorCalls).toBe(0);
  });

  test('error map can be replaced and omits undefined entries', () => {
    const form = createForm<Record<string, unknown>>({});

    form.resetErrors({ a: 'Err A', b: undefined as unknown as string, c: 'Err C' });

    expect(form.state.errors).toEqual({ a: 'Err A', c: 'Err C' });
  });

  test('clearError removes only the targeted field error', () => {
    const form = createForm<Record<string, unknown>>({});

    form.setError('a', 'Err A');
    form.setError('b', 'Err B');
    form.clearError('a');

    expect(form.state.errors).toEqual({ b: 'Err B' });
  });

  test('state and field snapshots are frozen and stable between mutations', () => {
    const form = createForm({ defaultValues: { name: 'Alice' } });
    const firstState = form.state;
    const firstField = form.field('name');

    expect(Object.isFrozen(firstState)).toBe(true);
    expect(Object.isFrozen(firstState.errors)).toBe(true);
    expect(Object.isFrozen(firstField)).toBe(true);
    expect(form.state).toBe(firstState);
    expect(form.field('name')).toBe(firstField);

    form.set('name', 'Bob');

    expect(form.state).not.toBe(firstState);
    expect(form.field('name')).not.toBe(firstField);
  });
});

describe('form patch', () => {
  test('patch updates specified fields and marks them clean without affecting others', () => {
    const form = createForm({ defaultValues: { city: 'Portland', name: 'Alice' } });

    form.set('name', 'Bob');

    expect(form.field('name').dirty).toBe(true);

    form.patch({ name: 'Charlie' });

    expect(form.get('name')).toBe('Charlie');
    expect(form.field('name').dirty).toBe(false);
    expect(form.get('city')).toBe('Portland');
    expect(form.field('city').dirty).toBe(false);
  });

  test('patched fields have an updated baseline so reset restores the new value', () => {
    const form = createForm({ defaultValues: { name: 'Alice' } });

    form.patch({ name: 'Server' });
    form.set('name', 'Changed');
    form.reset();

    expect(form.get('name')).toBe('Server');
  });

  test('patch with nested values updates dot-path fields without touching siblings', () => {
    const form = createForm({ defaultValues: { user: { age: 30, name: 'Alice' } } });

    form.patch({ user: { name: 'Bob' } });

    expect(form.get('user.name')).toBe('Bob');
    expect(form.get('user.age')).toBe(30);
    expect(form.field('user.name').dirty).toBe(false);
    expect(form.field('user.age').dirty).toBe(false);
  });

  test('isLoading is true while async defaultValues resolves, false after', async () => {
    let resolve!: (v: { name: string }) => void;
    const factory = () =>
      new Promise<{ name: string }>((res) => {
        resolve = res;
      });

    const form = createForm({ defaultValues: factory });

    expect(form.isLoading).toBe(true);
    expect(form.state.isLoading).toBe(true);

    resolve({ name: 'Alice' });
    await Promise.resolve(); // flush microtask

    // isLoading must be false and the values must be populated
    await new Promise<void>((res) =>
      form.subscribe(
        (s) => {
          if (!s.isLoading) res();
        },
        { sync: true },
      ),
    );

    expect(form.isLoading).toBe(false);
    expect(form.state.isLoading).toBe(false);
    expect(form.get('name')).toBe('Alice');
  });
});

describe('registerField (F1)', () => {
  test('declares a field with a default value when not already present', () => {
    const form = createForm<{ email?: string; name: string }>({ defaultValues: { name: 'Alice' } });

    form.registerField('email', { defaultValue: 'test@example.com' });

    expect(form.get('email')).toBe('test@example.com');
    expect(form.field('email').dirty).toBe(false);
  });

  test('does not overwrite an existing value when called on an already-present field', () => {
    const form = createForm({ defaultValues: { name: 'Alice' } });

    form.registerField('name', { defaultValue: 'Ignored' });

    expect(form.get('name')).toBe('Alice');
  });

  test('registered field is clean (part of baseline)', () => {
    const form = createForm<{ age?: number; name: string }>({ defaultValues: { name: 'Alice' } });

    form.registerField('age', { defaultValue: 30 });

    expect(form.field('age').dirty).toBe(false);

    form.set('age', 31);

    expect(form.field('age').dirty).toBe(true);

    form.reset();

    expect(form.get('age')).toBe(30);
    expect(form.field('age').dirty).toBe(false);
  });

  test('registered per-field validator runs on validateField', async () => {
    const form = createForm<{ email?: string; name: string }>({ defaultValues: { name: 'Alice' } });

    form.registerField('email', {
      defaultValue: '',
      validator: (value: unknown) => (!value ? 'Required' : undefined),
    });

    const result = await form.validateField('email');

    expect(result).toBe('Required');
    expect(form.field('email').error).toBe('Required');
  });

  test('unsubscribe returned by registerField removes the field', async () => {
    const form = createForm<{ name: string; tag?: string }>({ defaultValues: { name: 'Alice' } });

    const unregister = form.registerField('tag', { defaultValue: 'initial' });

    expect(form.get('tag')).toBe('initial');

    unregister();

    expect(form.get('tag')).toBeUndefined();
  });
});
