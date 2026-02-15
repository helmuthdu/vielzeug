// @ts-nocheck
/** biome-ignore-all lint/suspicious/noExplicitAny: - */
import { createForm, ValidationError } from './formit';

describe('formit', () => {
  test('initialization with nested objects in fields', () => {
    const form = createForm({
      fields: {
        settings: {
          notifications: true,
          theme: 'dark',
        },
        user: {
          email: 'alice@example.com',
          name: 'Alice',
          profile: {
            age: 25,
            city: 'NYC',
          },
        },
      },
    });

    // Access flattened nested values
    expect(form.get('user.name')).toBe('Alice');
    expect(form.get('user.email')).toBe('alice@example.com');
    expect(form.get('user.profile.age')).toBe('25');
    expect(form.get('user.profile.city')).toBe('NYC');
    expect(form.get('settings.notifications')).toBe('true');
    expect(form.get('settings.theme')).toBe('dark');

    // All values are flattened
    const values = form.values();
    expect(values['user.name']).toBe('Alice');
    expect(values['user.profile.age']).toBe('25');
  });

  test('initialization with plain values', () => {
    const form = createForm({
      fields: {
        age: 25,
        name: 'Alice',
      },
    });

    expect(form.get('name')).toBe('Alice');
    expect(form.get('age')).toBe('25');
    expect(form.values()).toEqual({ age: '25', name: 'Alice' });
  });

  test('combining plain values with validators using FieldConfig', () => {
    const form = createForm({
      fields: {
        email: {
          validators: (v) => (!String(v).includes('@') ? 'Invalid email' : undefined),
          value: 'test@example.com',
        },
        password: {
          validators: (v) => (String(v).length < 8 ? 'Too short' : undefined),
          value: '123456',
        },
      },
    });

    expect(form.get('email')).toBe('test@example.com');
    expect(form.get('password')).toBe('123456');
  });

  test('flat field names with dot notation', () => {
    const form = createForm({});

    form.set('user.name', 'Alice');
    expect(form.get('user.name')).toBe('Alice');

    form.set('user.email', 'alice@example.com');
    expect(form.get('user.email')).toBe('alice@example.com');

    form.set('tags', ['js', 'ts', 'react']);
    const tags = form.get('tags');
    expect(Array.isArray(tags)).toBe(true);
    expect(tags).toEqual(['js', 'ts', 'react']);
  });

  test('set merges/replaces and reset restores values', () => {
    const form = createForm({
      fields: {
        a: 1,
        b: 2,
      },
    });

    // Merge
    form.set({ b: 3, c: 4 });
    expect(form.values()).toEqual({ a: '1', b: '3', c: '4' });

    // Replace
    form.set({ d: 5 }, { replace: true });
    expect(form.values()).toEqual({ d: '5' });

    // Reset to initial
    form.reset();
    expect(form.values()).toEqual({ a: '1', b: '2' });

    // Reset to new values
    form.reset({ x: 10 });
    expect(form.values()).toEqual({ x: '10' });
  });

  test('dirty and touched tracking with options', async () => {
    const form = createForm({
      fields: {
        a: 1,
        b: 2,
      },
    });

    await new Promise<void>((resolve) => {
      form.subscribe((state) => {
        if (state.dirty.has('a') && state.touched.has('a')) resolve();
      });
      form.set('a', 10, { markTouched: true });
    });

    form.set('b', 20, { markDirty: false });
    await new Promise((r) => setTimeout(r, 10));
    expect(form.snapshot().dirty.has('b')).toBe(false);

    form.set({ a: 100 }, { markDirty: true });
    await new Promise((r) => setTimeout(r, 10));
    expect(form.snapshot().dirty.has('a')).toBe(true);

    form.touch('b', true);
    await new Promise((r) => setTimeout(r, 10));
    expect(form.snapshot().touched.has('b')).toBe(true);
  });

  test('field validation with multiple validators', async () => {
    const form = createForm({
      fields: {
        email: {
          validators: [
            (v) => (!v ? 'Required' : undefined),
            (v) => (v && !String(v).includes('@') ? 'Invalid format' : undefined),
          ],
        },
        password: {
          validators: [
            (v) => (!v ? 'Required' : undefined),
            (v) => (v && String(v).length < 6 ? 'Too short' : undefined),
          ],
        },
      },
    });

    form.set('email', 'x');
    form.set('password', 'ab');

    const emailError = await form.validate('email');
    expect(emailError).toBe('Invalid format');

    const pwdError = await form.validate('password');
    expect(pwdError).toBe('Too short');
  });

  test('validate runs field and form-level validators', async () => {
    const form = createForm({
      fields: {
        confirm: 'xyz',
        password: {
          validators: (v) => (!v ? 'Required' : undefined),
          value: '',
        },
      },
      validate: (formData) => {
        const password = formData.get('password');
        const confirm = formData.get('confirm');
        const errors = new Map<string, string>();

        if (password !== confirm) {
          errors.set('confirm', 'Must match');
        }

        return errors;
      },
    });

    const errors = await form.validate();
    expect(errors instanceof Map).toBe(true);
    expect((errors as Map<string, string>).get('password')).toBe('Required');
    expect((errors as Map<string, string>).get('confirm')).toBe('Must match');
  });

  test('error management - get, set, clear', () => {
    const form = createForm({});

    form.error('email', 'Invalid');
    expect(form.error('email')).toBe('Invalid');

    const allErrors = form.error();
    expect(allErrors instanceof Map).toBe(true);
    expect((allErrors as Map<string, string>).get('email')).toBe('Invalid');

    form.error('email', '');
    expect(form.error('email')).toBeUndefined();

    form.errors({ age: 'Invalid', name: 'Required' });
    const errors2 = form.error();
    expect((errors2 as Map<string, string>).get('age')).toBe('Invalid');
    expect((errors2 as Map<string, string>).get('name')).toBe('Required');

    form.errors(new Map());
    expect((form.error() as Map<string, string>).size).toBe(0);
  });

  test('successful form submission with validation', async () => {
    const form = createForm({
      fields: {
        name: {
          validators: (v) => (!v ? 'Required' : undefined),
          value: 'Alice',
        },
      },
    });

    expect(form.snapshot().submitCount).toBe(0);
    const result = await form.submit(async (formData) => {
      return { values: Object.fromEntries(formData) };
    });
    expect(result).toEqual({ values: { name: 'Alice' } });
    expect(form.snapshot().submitCount).toBe(1);
  });

  test('form submission throws ValidationError on validation failure', async () => {
    const form = createForm({
      fields: {
        name: { validators: (v) => (!v ? 'Required' : undefined) },
      },
    });

    try {
      await form.submit(async () => {});
      expect(false).toBe(true);
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).type).toBe('validation');
      expect((error as ValidationError).errors.get('name')).toBe('Required');
    }
  });

  test('form submission skips validation when validate option is false', async () => {
    const form = createForm({
      fields: {
        name: { validators: (v) => (!v ? 'Required' : undefined) },
      },
    });

    const result = await form.submit(async (formData) => Object.fromEntries(formData), { validate: false });
    expect(result).toEqual({});
  });

  test('prevents concurrent form submissions', async () => {
    const form = createForm({ fields: { name: 'Test' } });

    const p1 = form.submit(async () => {
      await new Promise((r) => setTimeout(r, 50));
      return 'first';
    });

    await expect(form.submit(async () => 'second')).rejects.toThrow('already being submitted');
    expect(await p1).toBe('first');
  });

  test('form and field subscriptions with cleanup', async () => {
    const form = createForm({ fields: { name: 'Alice' } });
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

  test('field binding with value, onChange, and set', () => {
    const form = createForm({ fields: { count: 0, name: 'Alice' } });

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
    expect(form.get('count')).toBe('1');
  });

  test('snapshot returns immutable snapshots', () => {
    const form = createForm({ fields: { name: 'Alice' } });

    const snap1 = form.snapshot();
    expect(snap1.submitCount).toBe(0);

    form.set('name', 'Bob');
    const snap2 = form.snapshot();

    expect(form.get('name')).toBe('Bob');
    expect(snap1).not.toBe(snap2);
  });

  test('touch and dirty helper functions', () => {
    const form = createForm({ fields: { email: '', name: 'Alice' } });

    expect(form.dirty('name')).toBe(false);
    expect(form.touch('name')).toBe(false);

    form.set('name', 'Bob');
    expect(form.dirty('name')).toBe(true);
    expect(form.touch('name')).toBe(false);

    form.touch('email', true);
    expect(form.touch('email')).toBe(true);
    expect(form.dirty('email')).toBe(false);

    form.set('email', 'test@example.com', { markTouched: true });
    expect(form.dirty('email')).toBe(true);
    expect(form.touch('email')).toBe(true);
  });

  test('bind with onBlur and custom value extractor', () => {
    const form = createForm({ fields: { category: '', name: '' } });

    const nameBinding = form.bind('name');
    expect(nameBinding.onBlur).toBeDefined();

    nameBinding.onChange({ target: { value: 'Test' } });
    expect(form.get('name')).toBe('Test');

    nameBinding.onBlur();
    expect(form.touch('name')).toBe(true);

    const categoryBinding = form.bind('category', {
      valueExtractor: (e) => e.selected || e,
    });

    categoryBinding.onChange({ selected: 'books' });
    expect(form.get('category')).toBe('books');

    const noTouchBinding = form.bind('name', { markTouchedOnBlur: false });
    form.touch('name', true);
    form.set('name', '');

    noTouchBinding.onBlur();
    expect(form.touch('name')).toBe(true);
  });

  test('validate with onlyTouched option', async () => {
    const form = createForm({
      fields: {
        age: { validators: (v) => (!v ? 'Required' : undefined) },
        email: { validators: (v) => (!v ? 'Required' : undefined) },
        name: { validators: (v) => (!v ? 'Required' : undefined) },
      },
    });

    form.touch('name', true);

    const errors = await form.validate({ onlyTouched: true });

    expect((errors as Map<string, string>).get('name')).toBe('Required');
    expect((errors as Map<string, string>).get('email')).toBeUndefined();
    expect((errors as Map<string, string>).get('age')).toBeUndefined();
  });

  test('validate with specific fields option', async () => {
    const form = createForm({
      fields: {
        age: { validators: (v) => (!v ? 'Age required' : undefined) },
        email: { validators: (v) => (!v ? 'Email required' : undefined) },
        name: { validators: (v) => (!v ? 'Name required' : undefined) },
      },
    });

    const errors = await form.validate({ fields: ['name', 'email'] });

    expect((errors as Map<string, string>).get('name')).toBe('Name required');
    expect((errors as Map<string, string>).get('email')).toBe('Email required');
    expect((errors as Map<string, string>).get('age')).toBeUndefined();
  });

  test('edge cases - arrays, dates, null values', () => {
    const now = new Date();
    const form = createForm({
      fields: {
        primitives: {
          count: 42,
          isActive: true,
          score: 3.14,
        },
        user: {
          metadata: {
            createdAt: now,
            lastLogin: null,
            settings: undefined,
          },
          name: 'Alice',
          tags: ['js', 'ts'],
        },
      },
    });

    // Arrays should be preserved
    const tags = form.get('user.tags');
    expect(Array.isArray(tags)).toBe(true);
    expect(tags).toEqual(['js', 'ts']);

    // Dates should be converted to strings
    expect(form.get('user.metadata.createdAt')).toBe(String(now));

    // Null/undefined are filtered out (not stored in FormData)
    expect(form.get('user.metadata.lastLogin')).toBeUndefined();
    expect(form.get('user.metadata.settings')).toBeUndefined();

    // Primitives should work
    expect(form.get('primitives.isActive')).toBe('true');
    expect(form.get('primitives.count')).toBe('42');
    expect(form.get('primitives.score')).toBe('3.14');
  });

  test('mixing plain values with FieldConfig validators', () => {
    const form = createForm({
      fields: {
        email: {
          validators: (v) => (!String(v).includes('@') ? 'Invalid' : undefined),
          value: 'override@example.com',
        },
        name: 'Plain Name', // Plain value
      },
    });

    // FieldConfig value is used
    expect(form.get('email')).toBe('override@example.com');
    // Plain value is used
    expect(form.get('name')).toBe('Plain Name');
  });

  test('reset restores initial values from fields', () => {
    const form = createForm({
      fields: {
        age: 25,
        email: 'alice@example.com', // Plain value, no need for {value: ...}
        name: 'Alice',
      },
    });

    // Modify values
    form.set('name', 'Bob');
    form.set('age', 30);
    form.set('email', 'bob@example.com');

    expect(form.get('name')).toBe('Bob');
    expect(form.get('age')).toBe('30');
    expect(form.get('email')).toBe('bob@example.com');

    // Reset should restore all
    form.reset();

    expect(form.get('name')).toBe('Alice');
    expect(form.get('age')).toBe('25');
    expect(form.get('email')).toBe('alice@example.com');
  });

  test('deeply nested values - 3+ levels', () => {
    const form = createForm({
      fields: {
        company: {
          department: {
            team: {
              lead: {
                email: 'alice@company.com',
                name: 'Alice',
              },
              members: ['Bob', 'Charlie'],
            },
          },
        },
      },
    });

    expect(form.get('company.department.team.lead.name')).toBe('Alice');
    expect(form.get('company.department.team.lead.email')).toBe('alice@company.com');

    const members = form.get('company.department.team.members');
    expect(Array.isArray(members)).toBe(true);
    expect(members).toEqual(['Bob', 'Charlie']);
  });

  test('nested object in FieldConfig.value with validators', async () => {
    const form = createForm({
      fields: {
        user: {
          validators: (v) => {
            return !v.name || !v.email ? 'Name and email are required' : undefined;
          },
          value: {
            email: 'alice@example.com',
            name: 'Alice',
          },
        },
      },
    });

    expect(form.get('user.name')).toBe('Alice');
    expect(form.get('user.email')).toBe('alice@example.com');

    form.set('user.name', '');
    const error = await form.validate('user');
    expect(error).toBe('Name and email are required');
  });

  test('array as field value', async () => {
    const form = createForm({
      fields: {
        preferences: {
          validators: (v) => {
            // Validator receives the array
            return Array.isArray(v) && v.length === 0 ? 'At least one preference required' : undefined;
          },
          value: ['email', 'sms', 'push'],
        },
        tags: ['javascript', 'typescript', 'react'],
      },
    });

    // Test plain array field
    const tags = form.get('tags');
    expect(Array.isArray(tags)).toBe(true);
    expect(tags).toEqual(['javascript', 'typescript', 'react']);

    // Test FieldConfig with array value
    const prefs = form.get('preferences');
    expect(Array.isArray(prefs)).toBe(true);
    expect(prefs).toEqual(['email', 'sms', 'push']);

    // Test validation with non-empty array (should pass)
    const error1 = await form.validate('preferences');
    expect(error1).toBeUndefined();

    // Test validation with empty array (should fail)
    form.set('preferences', []);
    expect(form.get('preferences')).toEqual([]); // Empty array, not undefined

    const error2 = await form.validate('preferences');
    expect(error2).toBe('At least one preference required');

    // Arrays are mutable - can modify
    form.set('tags', ['vue', 'svelte']);
    const newTags = form.get('tags');
    expect(newTags).toEqual(['vue', 'svelte']);
  });
});
