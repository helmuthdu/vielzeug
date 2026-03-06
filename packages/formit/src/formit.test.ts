// @ts-nocheck
import { createForm, ValidationError } from './formit';

describe('formit', () => {
  test('typed values are preserved — no string coercion', () => {
    const form = createForm({
      values: {
        age: 25,
        flag: true,
        score: 3.14,
        name: 'Alice',
        tags: ['js', 'ts'],
      },
    });

    expect(form.get('age')).toBe(25);
    expect(form.get('flag')).toBe(true);
    expect(form.get('score')).toBe(3.14);
    expect(form.get('name')).toBe('Alice');
    expect(form.get('tags')).toEqual(['js', 'ts']);

    expect(form.values()).toEqual({ age: 25, flag: true, score: 3.14, name: 'Alice', tags: ['js', 'ts'] });
  });

  test('flat field access with dot-notation keys', () => {
    const form = createForm({
      values: {
        'user.name': 'Alice',
        'user.email': 'alice@example.com',
        'user.profile.age': 25,
      },
    });

    expect(form.get('user.name')).toBe('Alice');
    expect(form.get('user.email')).toBe('alice@example.com');
    expect(form.get('user.profile.age')).toBe(25);

    form.set('user.name', 'Bob');
    expect(form.get('user.name')).toBe('Bob');
  });

  test('values and rules are separate concerns', () => {
    const form = createForm({
      values: {
        email: 'test@example.com',
        password: '123456',
      },
      rules: {
        email: (v) => (!String(v).includes('@') ? 'Invalid email' : undefined),
        password: (v) => (String(v).length < 8 ? 'Too short' : undefined),
      },
    });

    expect(form.get('email')).toBe('test@example.com');
    expect(form.get('password')).toBe('123456');
  });

  test('patch merges or replaces, reset restores values', () => {
    const form = createForm({
      values: { a: 1, b: 2 },
    });

    // Merge
    form.patch({ b: 3, c: 4 });
    expect(form.values()).toEqual({ a: 1, b: 3, c: 4 });

    // Replace
    form.patch({ d: 5 }, { replace: true });
    expect(form.values()).toEqual({ d: 5 });

    // Reset to initial
    form.reset();
    expect(form.values()).toEqual({ a: 1, b: 2 });

    // Reset to new values
    form.reset({ x: 10 });
    expect(form.values()).toEqual({ x: 10 });
  });

  test('dirty and touched tracking', async () => {
    const form = createForm({
      values: { a: 1, b: 2 },
    });

    await new Promise<void>((resolve) => {
      form.subscribe((state) => {
        if (state.dirty.has('a') && state.touched.has('a')) resolve();
      });
      form.set('a', 10, { setTouched: true });
    });

    form.set('b', 20, { setDirty: false });
    await new Promise((r) => setTimeout(r, 10));
    expect(form.snapshot().dirty.has('b')).toBe(false);

    form.patch({ a: 100 }, { setDirty: true });
    await new Promise((r) => setTimeout(r, 10));
    expect(form.snapshot().dirty.has('a')).toBe(true);

    form.setTouched('b');
    await new Promise((r) => setTimeout(r, 10));
    expect(form.snapshot().touched.has('b')).toBe(true);
  });

  test('FormState includes isValid, isDirty, isTouched computed flags', async () => {
    const form = createForm({ values: { name: 'Alice' } });

    const initial = form.snapshot();
    expect(initial.isValid).toBe(true);
    expect(initial.isDirty).toBe(false);
    expect(initial.isTouched).toBe(false);

    form.set('name', 'Bob');
    await new Promise((r) => setTimeout(r, 10));
    expect(form.snapshot().isDirty).toBe(true);

    form.setTouched('name');
    await new Promise((r) => setTimeout(r, 10));
    expect(form.snapshot().isTouched).toBe(true);

    form.setError('name', 'Too short');
    await new Promise((r) => setTimeout(r, 10));
    expect(form.snapshot().isValid).toBe(false);
  });

  test('field validation with multiple rules', async () => {
    const form = createForm({
      rules: {
        email: [
          (v) => (!v ? 'Required' : undefined),
          (v) => (v && !String(v).includes('@') ? 'Invalid format' : undefined),
        ],
        password: [
          (v) => (!v ? 'Required' : undefined),
          (v) => (v && String(v).length < 6 ? 'Too short' : undefined),
        ],
      },
    });

    form.set('email', 'x');
    form.set('password', 'ab');

    const emailError = await form.validate('email');
    expect(emailError).toBe('Invalid format');

    const pwdError = await form.validate('password');
    expect(pwdError).toBe('Too short');
  });

  test('validateAll runs field rules and the form-level validator', async () => {
    const form = createForm({
      values: {
        password: '',
        confirm: 'xyz',
      },
      rules: {
        password: (v) => (!v ? 'Required' : undefined),
      },
      validate: (values) => {
        const errs: Record<string, string> = {};
        if (values.password !== values.confirm) errs.confirm = 'Must match';
        return errs;
      },
    });

    const errors = await form.validateAll();
    expect(errors.password).toBe('Required');
    expect(errors.confirm).toBe('Must match');
  });

  test('errors as plain object - get, set, clear', () => {
    const form = createForm({});

    form.setError('email', 'Invalid');
    expect(form.getError('email')).toBe('Invalid');

    const all = form.getErrors();
    expect(typeof all).toBe('object');
    expect(all.email).toBe('Invalid');

    form.setError('email', '');
    expect(form.getError('email')).toBeUndefined();

    form.setErrors({ age: 'Invalid', name: 'Required' });
    const all2 = form.getErrors();
    expect(all2.age).toBe('Invalid');
    expect(all2.name).toBe('Required');

    form.setErrors({});
    expect(Object.keys(form.getErrors()).length).toBe(0);
  });

  test('successful form submission with validation', async () => {
    const form = createForm({
      values: { name: 'Alice' },
      rules: { name: (v) => (!v ? 'Required' : undefined) },
    });

    expect(form.snapshot().submitCount).toBe(0);
    const result = await form.submit(async (formData) => {
      return { values: Object.fromEntries(formData) };
    });
    expect(result).toEqual({ values: { name: 'Alice' } });
    expect(form.snapshot().submitCount).toBe(1);
  });

  test('submit marks all fields as touched on validation failure', async () => {
    const form = createForm({
      values: { name: '', email: '' },
      rules: {
        name: (v) => (!v ? 'Required' : undefined),
        email: (v) => (!v ? 'Required' : undefined),
      },
    });

    expect(form.isTouched('name')).toBe(false);

    try {
      await form.submit(async () => {});
    } catch {
      /* expected */
    }

    expect(form.isTouched('name')).toBe(true);
    expect(form.isTouched('email')).toBe(true);
  });

  test('submit throws ValidationError on validation failure', async () => {
    const form = createForm({
      rules: { name: (v) => (!v ? 'Required' : undefined) },
    });

    try {
      await form.submit(async () => {});
      expect(false).toBe(true);
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).type).toBe('validation');
      expect((error as ValidationError).errors.name).toBe('Required');
    }
  });

  test('submit skips validation when validate: false', async () => {
    const form = createForm({
      rules: { name: (v) => (!v ? 'Required' : undefined) },
    });

    const result = await form.submit(async (formData) => Object.fromEntries(formData), {
      validate: false,
    });
    expect(result).toEqual({});
  });

  test('prevents concurrent form submissions', async () => {
    const form = createForm({ values: { name: 'Test' } });

    const p1 = form.submit(async () => {
      await new Promise((r) => setTimeout(r, 50));
      return 'first';
    });

    await expect(form.submit(async () => 'second')).rejects.toThrow('already being submitted');
    expect(await p1).toBe('first');
  });

  test('form and field subscriptions with cleanup', async () => {
    const form = createForm({ values: { name: 'Alice' } });
    const formStates: any[] = [];
    const fieldUpdates: any[] = [];

    const unsubForm = form.subscribe((s) => formStates.push(s));
    const unsubField = form.subscribeField('name', (f) => fieldUpdates.push(f));

    form.set('name', 'Bob');
    await new Promise((r) => setTimeout(r, 10));

    expect(formStates.length).toBeGreaterThan(1);
    expect(fieldUpdates[fieldUpdates.length - 1].value).toBe('Bob');

    unsubForm();
    unsubField();
    const prevLen = formStates.length;

    form.set('name', 'Charlie');
    await new Promise((r) => setTimeout(r, 10));
    expect(formStates.length).toBe(prevLen);

    const u1 = form.subscribeField('x', () => {});
    const u2 = form.subscribeField('x', () => {});
    u1();
    u2();

    const updates: any[] = [];
    form.subscribeField('x', (f) => updates.push(f));
    expect(updates.length).toBe(1);
  });

  test('subscribeField only fires for the relevant field', async () => {
    const form = createForm({ values: { a: 1, b: 2 } });
    const aUpdates: any[] = [];
    const bUpdates: any[] = [];

    form.subscribeField('a', (f) => aUpdates.push(f));
    form.subscribeField('b', (f) => bUpdates.push(f));

    const aCountBefore = aUpdates.length;
    const bCountBefore = bUpdates.length;

    form.set('a', 99);
    await new Promise((r) => setTimeout(r, 10));

    // a listener fired, b listener did not
    expect(aUpdates.length).toBeGreaterThan(aCountBefore);
    expect(bUpdates.length).toBe(bCountBefore);
  });

  test('field binding with value, onChange, and set', () => {
    const form = createForm({ values: { count: 0, name: 'Alice' } });

    const binding = form.bind('name');
    expect(binding.value).toBe('Alice');
    expect(binding.name).toBe('name');

    binding.set('Bob');
    expect(form.get('name')).toBe('Bob');

    binding.onChange({ target: { value: 'Charlie' } });
    expect(form.get('name')).toBe('Charlie');

    binding.onChange('David');
    expect(form.get('name')).toBe('David');

    binding.value = 'Eve';
    expect(form.get('name')).toBe('Eve');

    const countBinding = form.bind('count');
    countBinding.set((prev: any) => Number(prev) + 1);
    expect(form.get('count')).toBe(1);
  });

  test('snapshot returns immutable snapshots', () => {
    const form = createForm({ values: { name: 'Alice' } });

    const snap1 = form.snapshot();
    expect(snap1.submitCount).toBe(0);

    form.set('name', 'Bob');
    const snap2 = form.snapshot();

    expect(form.get('name')).toBe('Bob');
    expect(snap1).not.toBe(snap2);
  });

  test('touch and dirty helper functions', () => {
    const form = createForm({ values: { email: '', name: 'Alice' } });

    expect(form.isDirty('name')).toBe(false);
    expect(form.isTouched('name')).toBe(false);

    form.set('name', 'Bob');
    expect(form.isDirty('name')).toBe(true);
    expect(form.isTouched('name')).toBe(false);

    form.setTouched('email');
    expect(form.isTouched('email')).toBe(true);
    expect(form.isDirty('email')).toBe(false);

    form.set('email', 'test@example.com', { setTouched: true });
    expect(form.isDirty('email')).toBe(true);
    expect(form.isTouched('email')).toBe(true);
  });

  test('bind with onBlur and custom value extractor', () => {
    const form = createForm({ values: { category: '', name: '' } });

    const nameBinding = form.bind('name');
    expect(nameBinding.onBlur).toBeDefined();

    nameBinding.onChange({ target: { value: 'Test' } });
    expect(form.get('name')).toBe('Test');

    nameBinding.onBlur();
    expect(form.isTouched('name')).toBe(true);

    const categoryBinding = form.bind('category', {
      valueExtractor: (e: any) => e.selected || e,
    });

    categoryBinding.onChange({ selected: 'books' });
    expect(form.get('category')).toBe('books');

    const noTouchBinding = form.bind('name', { markTouchedOnBlur: false });
    form.setTouched('name');
    form.set('name', '');

    noTouchBinding.onBlur();
    expect(form.isTouched('name')).toBe(true);
  });

  test('validateAll with onlyTouched option', async () => {
    const form = createForm({
      rules: {
        age: (v) => (!v ? 'Required' : undefined),
        email: (v) => (!v ? 'Required' : undefined),
        name: (v) => (!v ? 'Required' : undefined),
      },
    });

    form.setTouched('name');

    const errors = await form.validateAll({ onlyTouched: true });

    expect(errors.name).toBe('Required');
    expect(errors.email).toBeUndefined();
    expect(errors.age).toBeUndefined();
  });

  test('validateAll with specific fields option', async () => {
    const form = createForm({
      rules: {
        age: (v) => (!v ? 'Age required' : undefined),
        email: (v) => (!v ? 'Email required' : undefined),
        name: (v) => (!v ? 'Name required' : undefined),
      },
    });

    const errors = await form.validateAll({ fields: ['name', 'email'] });

    expect(errors.name).toBe('Name required');
    expect(errors.email).toBe('Email required');
    expect(errors.age).toBeUndefined();
  });

  test('complex values (objects, arrays) are stored as-is', () => {
    const profile = { city: 'NYC', age: 25 };
    const now = new Date();
    const form = createForm({
      values: {
        tags: ['js', 'ts'],
        profile,
        createdAt: now,
        count: 42,
        active: true,
      },
    });

    // Values are not coerced
    expect(form.get('tags')).toEqual(['js', 'ts']);
    expect(form.get('profile')).toBe(profile);
    expect(form.get('createdAt')).toBe(now);
    expect(form.get('count')).toBe(42);
    expect(form.get('active')).toBe(true);

    // null/undefined values can be set directly
    form.set('optional', null);
    expect(form.get('optional')).toBe(null);
  });

  test('array field with validator', async () => {
    const form = createForm({
      values: {
        tags: ['javascript', 'typescript', 'react'],
        preferences: ['email', 'sms', 'push'],
      },
      rules: {
        preferences: (v) =>
          Array.isArray(v) && v.length === 0 ? 'At least one preference required' : undefined,
      },
    });

    const tags = form.get('tags');
    expect(Array.isArray(tags)).toBe(true);
    expect(tags).toEqual(['javascript', 'typescript', 'react']);

    // Validator receives typed value (actual array, not a string)
    const error1 = await form.validate('preferences');
    expect(error1).toBeUndefined();

    form.set('preferences', []);
    expect(form.get('preferences')).toEqual([]);

    const error2 = await form.validate('preferences');
    expect(error2).toBe('At least one preference required');

    form.set('tags', ['vue', 'svelte']);
    expect(form.get('tags')).toEqual(['vue', 'svelte']);
  });

  test('reset restores initial values', () => {
    const form = createForm({
      values: {
        age: 25,
        email: 'alice@example.com',
        name: 'Alice',
      },
    });

    form.set('name', 'Bob');
    form.set('age', 30);
    form.set('email', 'bob@example.com');

    expect(form.get('name')).toBe('Bob');
    expect(form.get('age')).toBe(30);
    expect(form.get('email')).toBe('bob@example.com');

    form.reset();

    expect(form.get('name')).toBe('Alice');
    expect(form.get('age')).toBe(25);
    expect(form.get('email')).toBe('alice@example.com');
  });

  test('dispose cleans up all listeners', async () => {
    const form = createForm({ values: { name: 'Alice' } });
    const states: any[] = [];
    form.subscribe((s) => states.push(s));

    const prevLen = states.length;
    form.dispose();

    form.set('name', 'Bob');
    await new Promise((r) => setTimeout(r, 10));
    expect(states.length).toBe(prevLen);
  });
});
