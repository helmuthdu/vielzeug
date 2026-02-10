/** biome-ignore-all lint/suspicious/noExplicitAny: - */
import { createForm, ValidationError } from './formit';

describe('formit', () => {
  test('initialization with values and field configs', () => {
    const form = createForm<{ name?: string; age?: number }>({
      fields: {
        age: { initialValue: 25 }, // Used - not in initialValues
        name: { initialValue: 'Bob' }, // Ignored - initialValues takes precedence
      },
      initialValues: { name: 'Alice' },
    });

    expect(form.getValue('name')).toBe('Alice');
    expect(form.getValue('age')).toBe(25);
    expect(form.getValues()).toEqual({ age: 25, name: 'Alice' });
  });

  test('path handling - nested objects, arrays, and bracket notation', () => {
    const form = createForm<any>({});

    // Nested objects
    form.setValue('user.profile.name', 'Alice');
    expect(form.getValue('user.profile.name')).toBe('Alice');

    // Array creation with bracket notation
    form.setValue('items[0].title', 'First');
    expect(Array.isArray(form.getValue('items'))).toBe(true);
    expect(form.getValue('items[0].title')).toBe('First');

    // Array path format
    form.setValue(['tags', 1], 'tag2');
    expect(form.getValue(['tags', 1])).toBe('tag2');
  });

  test('setValues merges/replaces and reset restores values', () => {
    const form = createForm({ initialValues: { a: 1, b: 2 } });

    // Merge
    form.setValues({ b: 3, c: 4 } as any);
    expect(form.getValues()).toEqual({ a: 1, b: 3, c: 4 });

    // Replace
    form.setValues({ d: 5 } as any, { replace: true });
    expect(form.getValues()).toEqual({ d: 5 });

    // Reset to initial
    form.reset();
    expect(form.getValues()).toEqual({ a: 1, b: 2 });

    // Reset to new values
    form.reset({ x: 10 } as any);
    expect(form.getValues()).toEqual({ x: 10 });
  });

  test('dirty and touched tracking with options', async () => {
    const form = createForm({ initialValues: { a: 1, b: 2 } });

    // Auto-mark dirty and touched
    await new Promise<void>((resolve) => {
      form.subscribe((state) => {
        if (state.dirty.a && state.touched.a) resolve();
      });
      form.setValue('a', 10, { markTouched: true });
    });

    // Respect markDirty: false
    form.setValue('b', 20, { markDirty: false });
    await new Promise((r) => setTimeout(r, 10));
    expect(form.getStateSnapshot().dirty.b).toBeFalsy();

    // markAllDirty option
    form.setValues({ a: 100 }, { markAllDirty: true });
    await new Promise((r) => setTimeout(r, 10));
    expect(form.getStateSnapshot().dirty.a).toBe(true);

    // markTouched method
    form.markTouched('b');
    await new Promise((r) => setTimeout(r, 10));
    expect(form.getStateSnapshot().touched.b).toBe(true);
  });

  test('field validation with multiple validators and object returns', async () => {
    const form = createForm({
      fields: {
        email: {
          validators: (v) => ({
            format: !v.includes('@') ? 'Invalid format' : '',
            length: v.length < 3 ? 'Too short' : '',
          }),
        },
        password: {
          validators: [(v) => (!v ? 'Required' : undefined), (v) => (v && v.length < 6 ? 'Too short' : undefined)],
        },
      },
      initialValues: { email: 'x', password: 'ab' },
    });

    // Multiple validators - stops at first error
    const pwdError = await form.validateField('password');
    expect(pwdError).toBe('Too short');

    // Object return - joins messages
    const emailError = await form.validateField('email');
    expect(emailError).toContain('Invalid format');
    expect(emailError).toContain('Too short');
  });

  test('validateAll runs field and form-level validators', async () => {
    const form = createForm({
      fields: {
        password: { validators: (v) => (!v ? 'Required' : undefined) },
      },
      initialValues: { confirm: 'xyz', password: '' },
      validate: (values) => (values.password !== values.confirm ? { confirm: 'Must match' } : {}),
    });

    const errors = await form.validateAll();
    expect(errors.password).toBe('Required');
    expect(errors.confirm).toBe('Must match');
  });

  test('error management - set, get, clear, reset', () => {
    const form = createForm({});

    form.setError('email', 'Invalid');
    expect(form.getError('email')).toBe('Invalid');
    expect(form.getErrors()).toEqual({ email: 'Invalid' });

    form.setError('email', undefined);
    expect(form.getError('email')).toBeUndefined();

    form.setErrors({ age: 'Invalid', name: 'Required' });
    expect(form.getErrors()).toEqual({ age: 'Invalid', name: 'Required' });

    form.resetErrors();
    expect(form.getErrors()).toEqual({});
  });

  test('successful form submission with validation', async () => {
    const form = createForm({
      fields: {
        name: { validators: (v) => (!v ? 'Required' : undefined) },
      },
      initialValues: { name: 'Alice' },
    });

    expect(form.getStateSnapshot().submitCount).toBe(0);
    const result = await form.submit(async (values) => ({ values }));
    expect(result).toEqual({ values: { name: 'Alice' } });
    expect(form.getStateSnapshot().submitCount).toBe(1);
  });

  test('form submission throws ValidationError on validation failure', async () => {
    const form = createForm({
      fields: {
        name: { validators: (v) => (!v ? 'Required' : undefined) },
      },
    });

    try {
      await form.submit(async () => {});
      expect(false).toBe(true); // Should not reach
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).type).toBe('validation');
      expect((error as ValidationError).errors.name).toBe('Required');
    }
  });

  test('form submission skips validation when validate option is false', async () => {
    const form = createForm({
      fields: {
        name: { validators: (v) => (!v ? 'Required' : undefined) },
      },
    });

    const result = await form.submit(async (v) => v, { validate: false });
    expect(result).toEqual({});
  });

  test('prevents concurrent form submissions', async () => {
    const form = createForm({ initialValues: { name: 'Test' } });

    const p1 = form.submit(async () => {
      await new Promise((r) => setTimeout(r, 50));
      return 'first';
    });

    await expect(form.submit(async () => 'second')).rejects.toThrow('already being submitted');
    expect(await p1).toBe('first');
  });

  test('form and field subscriptions with cleanup', async () => {
    const form = createForm({ initialValues: { name: 'Alice' } });
    const formStates: any[] = [];
    const fieldUpdates: any[] = [];

    const unsubForm = form.subscribe((s) => formStates.push(s));
    const unsubField = form.subscribeField('name', (f) => fieldUpdates.push(f));

    form.setValue('name', 'Bob');
    await new Promise((r) => setTimeout(r, 10));

    expect(formStates.length).toBeGreaterThan(1);
    expect(formStates[formStates.length - 1].values.name).toBe('Bob');
    expect(fieldUpdates[fieldUpdates.length - 1].value).toBe('Bob');

    // Unsubscribe stops updates
    unsubForm();
    unsubField();
    const prevLen = formStates.length;

    form.setValue('name', 'Charlie');
    await new Promise((r) => setTimeout(r, 10));
    expect(formStates.length).toBe(prevLen);

    // Memory leak prevention - cleanup empty listener sets
    const u1 = form.subscribeField('x', () => {});
    const u2 = form.subscribeField('x', () => {});
    u1();
    u2();

    const updates: any[] = [];
    form.subscribeField('x', (f) => updates.push(f));
    expect(updates.length).toBe(1);
  });

  test('field binding with value, onChange, and set', () => {
    const form = createForm({ initialValues: { count: 0, name: 'Alice' } });

    const binding = form.bind('name');
    expect(binding.value).toBe('Alice');
    expect(binding.name).toBe('name');

    // set method
    binding.set('Bob');
    expect(form.getValue('name')).toBe('Bob');

    // onChange with event
    binding.onChange({ target: { value: 'Charlie' } });
    expect(form.getValue('name')).toBe('Charlie');

    // onChange with direct value
    binding.onChange('David');
    expect(form.getValue('name')).toBe('David');

    // value setter
    binding.value = 'Eve';
    expect(form.getValue('name')).toBe('Eve');

    // Function updater
    const countBinding = form.bind('count');
    countBinding.set((prev: number) => prev + 1);
    expect(form.getValue('count')).toBe(1);
  });

  test('getStateSnapshot returns immutable snapshots', () => {
    const form = createForm({ initialValues: { name: 'Alice' } });

    const snap1 = form.getStateSnapshot();
    expect(snap1.values.name).toBe('Alice');
    expect(snap1.submitCount).toBe(0);

    form.setValue('name', 'Bob');
    const snap2 = form.getStateSnapshot();

    expect(snap1.values.name).toBe('Alice');
    expect(snap2.values.name).toBe('Bob');
    expect(snap1).not.toBe(snap2);
  });

  test('isDirty and isTouched helper functions', () => {
    const form = createForm({ initialValues: { email: '', name: 'Alice' } });

    // Initially not dirty or touched
    expect(form.isDirty('name')).toBe(false);
    expect(form.isTouched('name')).toBe(false);

    // After setValue with markDirty
    form.setValue('name', 'Bob');
    expect(form.isDirty('name')).toBe(true);
    expect(form.isTouched('name')).toBe(false);

    // After markTouched
    form.markTouched('email');
    expect(form.isTouched('email')).toBe(true);
    expect(form.isDirty('email')).toBe(false);

    // After setValue with markTouched option
    form.setValue('email', 'test@example.com', { markTouched: true });
    expect(form.isDirty('email')).toBe(true);
    expect(form.isTouched('email')).toBe(true);
  });

  test('bind with onBlur and custom value extractor', () => {
    const form = createForm({ initialValues: { category: '', name: '' } });

    // Default binding with onBlur
    const nameBinding = form.bind('name');
    expect(nameBinding.onBlur).toBeDefined();

    nameBinding.onChange({ target: { value: 'Test' } });
    expect(form.getValue('name')).toBe('Test');

    nameBinding.onBlur();
    expect(form.isTouched('name')).toBe(true);

    // Custom value extractor
    const categoryBinding = form.bind('category', {
      valueExtractor: (e) => e.selected || e,
    });

    categoryBinding.onChange({ selected: 'books' });
    expect(form.getValue('category')).toBe('books');

    // Disable markTouchedOnBlur
    const noTouchBinding = form.bind('name', { markTouchedOnBlur: false });
    form.markTouched('name'); // Reset
    form.setValue('name', ''); // Reset value

    noTouchBinding.onBlur();
    // Should still be touched from before since we didn't reset touched state
    expect(form.isTouched('name')).toBe(true);
  });

  test('validateAll with onlyTouched option', async () => {
    const form = createForm({
      fields: {
        age: { validators: (v) => (!v ? 'Required' : undefined) },
        email: { validators: (v) => (!v ? 'Required' : undefined) },
        name: { validators: (v) => (!v ? 'Required' : undefined) },
      },
    });

    // Mark only name as touched
    form.markTouched('name');

    // Validate only touched fields
    const errors = await form.validateAll({ onlyTouched: true });

    expect(errors.name).toBe('Required');
    expect(errors.email).toBeUndefined(); // Not touched, not validated
    expect(errors.age).toBeUndefined(); // Not touched, not validated
  });

  test('validateAll with specific fields option', async () => {
    const form = createForm({
      fields: {
        age: { validators: (v) => (!v ? 'Age required' : undefined) },
        email: { validators: (v) => (!v ? 'Email required' : undefined) },
        name: { validators: (v) => (!v ? 'Name required' : undefined) },
      },
    });

    // Validate only specific fields
    const errors = await form.validateAll({ fields: ['name', 'email'] });

    expect(errors.name).toBe('Name required');
    expect(errors.email).toBe('Email required');
    expect(errors.age).toBeUndefined(); // Not in the fields list
  });
});
