import { createForm, toFormData, ValidationError } from './formit';

// ---------------------------------------------------------------------------
// Values — storage, typing, and shape
// ---------------------------------------------------------------------------

describe('values', () => {
  test('primitive types are preserved without string coercion', () => {
    const form = createForm({
      values: { age: 25, flag: true, score: 3.14, name: 'Alice' },
    });

    expect(form.get<number>('age')).toBe(25);
    expect(form.get<boolean>('flag')).toBe(true);
    expect(form.get<number>('score')).toBe(3.14);
    expect(form.get<string>('name')).toBe('Alice');
  });

  test('plain objects are flattened; arrays are stored by reference', () => {
    const tags = ['js', 'ts'];
    const form = createForm({ values: { profile: { city: 'NYC' }, tags } });

    // plain objects are flattened — the parent key is not stored
    expect(form.get('profile')).toBeUndefined();
    expect(form.get('profile.city')).toBe('NYC');
    // arrays are leaf values — stored by reference
    expect(form.get('tags')).toBe(tags);
  });

  test('null and undefined can be stored directly', () => {
    const form = createForm<Record<string, unknown>>({ values: { x: null } });
    expect(form.get('x')).toBeNull();

    form.set('x', undefined);
    expect(form.get('x')).toBeUndefined();
  });

  test('nested plain objects are auto-flattened to dot-notation keys', () => {
    const form = createForm({
      values: {
        user: { name: 'Alice', address: { city: 'NYC' } },
      },
    });

    expect(form.get('user.name')).toBe('Alice');
    expect(form.get('user.address.city')).toBe('NYC');
  });

  test('values() unflattens back to the original nested shape', () => {
    const form = createForm({
      values: { user: { name: 'Alice' }, score: 10 },
    });

    expect(form.values()).toEqual({ user: { name: 'Alice' }, score: 10 });
  });

  test('arrays and File instances inside values are not recursively flattened', () => {
    const file = new File(['content'], 'upload.txt');
    const form = createForm({ values: { tags: ['a', 'b'], attachment: file } });

    expect(form.get('tags')).toEqual(['a', 'b']);
    expect(form.get('attachment')).toBe(file);
  });

  test('flat dot-notation keys are accepted directly and round-trip correctly', () => {
    const form = createForm({ values: { 'user.name': 'Alice', 'user.age': 30 } });

    expect(form.get('user.name')).toBe('Alice');
    form.set('user.name', 'Bob');
    expect(form.get('user.name')).toBe('Bob');
    expect(form.values()).toEqual({ user: { name: 'Bob', age: 30 } });
  });
});

// ---------------------------------------------------------------------------
// set / update / patch
// ---------------------------------------------------------------------------

describe('set / update / patch', () => {
  test('set stores a value and schedules a notification', async () => {
    const form = createForm({ values: { count: 0 } });
    const snapshots: number[] = [];

    form.subscribe((s) => snapshots.push(s.dirty.size));
    form.set('count', 42);
    await new Promise((r) => setTimeout(r, 10));

    expect(form.get('count')).toBe(42);
    expect(snapshots.at(-1)).toBe(1);
  });

  test('set with setDirty:false does not mark the field dirty', () => {
    const form = createForm({ values: { x: 1 } });
    form.set('x', 99, { setDirty: false });
    expect(form.isDirty('x')).toBe(false);
  });

  test('set with setTouched:true marks the field touched', () => {
    const form = createForm({ values: { x: 1 } });
    form.set('x', 2, { setTouched: true });
    expect(form.isTouched('x')).toBe(true);
  });

  test('setting a field back to its initial value clears dirty', () => {
    const form = createForm({ values: { name: 'Alice' } });
    form.set('name', 'Bob');
    expect(form.isDirty('name')).toBe(true);
    form.set('name', 'Alice');
    expect(form.isDirty('name')).toBe(false);
  });

  test('update applies an updater function to the current stored value', () => {
    const form = createForm({ values: { count: 5 } });
    form.update('count', (n) => (n as number) * 2);
    expect(form.get('count')).toBe(10);
  });

  test('patch deep-merges nested objects and flattens them', () => {
    const form = createForm({ values: { a: 1, b: 2, c: 0 } });
    form.patch({ b: 99 });
    expect(form.values()).toEqual({ a: 1, b: 99, c: 0 });
  });

  test('patch with replace:true discards all previous values', () => {
    const form = createForm({ values: { a: 1, b: 2 } });
    form.patch({ c: 3 }, { replace: true });
    expect(form.values()).toEqual({ c: 3 });
    expect(form.get('a')).toBeUndefined();
  });

  test('patch with setDirty:false leaves dirty state unchanged', () => {
    const form = createForm({ values: { x: 0 } });
    form.patch({ x: 1 }, { setDirty: false });
    expect(form.isDirty('x')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe('reset', () => {
  test('reset with no args restores the original initial values', () => {
    const form = createForm({ values: { name: 'Alice', age: 25 } });
    form.set('name', 'Bob');
    form.set('age', 30);
    form.reset();
    expect(form.values()).toEqual({ name: 'Alice', age: 25 });
  });

  test('reset(newValues) replaces both the store and the baseline', () => {
    const form = createForm({ values: { x: 1 } });
    form.reset({ x: 99 });
    expect(form.values()).toEqual({ x: 99 });
    // after reset the new value is the baseline — changing it marks dirty
    form.set('x', 100);
    expect(form.isDirty('x')).toBe(true);
    // but resetting back to 99 should clear dirty
    form.set('x', 99);
    expect(form.isDirty('x')).toBe(false);
  });

  test('reset clears dirty, touched, and error state', () => {
    const form = createForm({ values: { name: '' } });
    form.set('name', 'Bob');
    form.setTouched('name');
    form.setError('name', 'Required');
    form.reset();
    expect(form.isDirty('name')).toBe(false);
    expect(form.isTouched('name')).toBe(false);
    expect(form.getError('name')).toBeUndefined();
  });

  test('reset accepts nested objects and flattens them', () => {
    const form = createForm({ values: { user: { name: 'Alice' } } });
    form.reset({ user: { name: 'Bob' } });
    expect(form.get('user.name')).toBe('Bob');
  });
});

// ---------------------------------------------------------------------------
// dirty & touched
// ---------------------------------------------------------------------------

describe('dirty & touched', () => {
  test('isDirty / isTouched are false on a fresh form', () => {
    const form = createForm({ values: { x: 1 } });
    expect(form.isDirty('x')).toBe(false);
    expect(form.isTouched('x')).toBe(false);
  });

  test('setTouched marks a field as touched without affecting dirty', () => {
    const form = createForm({ values: { x: 1 } });
    form.setTouched('x');
    expect(form.isTouched('x')).toBe(true);
    expect(form.isDirty('x')).toBe(false);
  });

  test('snapshot isDirty / isTouched flags reflect aggregate state', async () => {
    const form = createForm({ values: { a: 1, b: 2 } });
    expect(form.getState().isDirty).toBe(false);

    form.set('a', 99);
    await new Promise((r) => setTimeout(r, 10));
    expect(form.getState().isDirty).toBe(true);

    form.setTouched('b');
    await new Promise((r) => setTimeout(r, 10));
    expect(form.getState().isTouched).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// errors
// ---------------------------------------------------------------------------

describe('errors', () => {
  test('setError / getError store and retrieve a field error', () => {
    const form = createForm({});
    form.setError('email', 'Invalid');
    expect(form.getError('email')).toBe('Invalid');
  });

  test('empty string is a valid error value', () => {
    const form = createForm({});
    form.setError('field', '');
    expect(form.getError('field')).toBe('');
  });

  test('setError with undefined removes the error', () => {
    const form = createForm({});
    form.setError('email', 'Bad');
    form.setError('email', undefined);
    expect(form.getError('email')).toBeUndefined();
  });

  test('getErrors returns a shallow copy of all errors', () => {
    const form = createForm({});
    form.setError('a', 'Err A');
    form.setError('b', 'Err B');
    const copy = form.getErrors();
    expect(copy).toEqual({ a: 'Err A', b: 'Err B' });
    // mutating the copy does not affect the form
    copy.a = 'changed';
    expect(form.getError('a')).toBe('Err A');
  });

  test('setErrors replaces the entire error map', () => {
    const form = createForm({});
    form.setError('old', 'Old error');
    form.setErrors({ email: 'Invalid', name: 'Required' });
    expect(form.getError('old')).toBeUndefined();
    expect(form.getErrors()).toEqual({ email: 'Invalid', name: 'Required' });
  });

  test('setErrors with empty object clears all errors', () => {
    const form = createForm({});
    form.setError('x', 'Oops');
    form.setErrors({});
    expect(Object.keys(form.getErrors())).toHaveLength(0);
  });

  test('isValid reflects whether the error map is empty', async () => {
    const form = createForm({ values: { name: 'Alice' } });
    expect(form.getState().isValid).toBe(true);

    form.setError('name', 'Too short');
    await new Promise((r) => setTimeout(r, 10));
    expect(form.getState().isValid).toBe(false);

    form.setErrors({});
    await new Promise((r) => setTimeout(r, 10));
    expect(form.getState().isValid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validation
// ---------------------------------------------------------------------------

describe('validation', () => {
  test('validate() runs per-field rules and returns the error message', async () => {
    const form = createForm({
      rules: { email: (v) => (!String(v).includes('@') ? 'Invalid format' : undefined) },
    });
    form.set('email', 'notanemail');
    expect(await form.validate('email')).toBe('Invalid format');
  });

  test('validate() returns undefined when the field is valid', async () => {
    const form = createForm({
      rules: { email: (v) => (!String(v).includes('@') ? 'Invalid' : undefined) },
    });
    form.set('email', 'a@b.com');
    expect(await form.validate('email')).toBeUndefined();
  });

  test('rules are run in order; first failing rule wins', async () => {
    const form = createForm({
      rules: {
        pw: [(v) => (!v ? 'Required' : undefined), (v) => (String(v).length < 8 ? 'Too short' : undefined)],
      },
    });

    form.set('pw', '');
    expect(await form.validate('pw')).toBe('Required');

    form.set('pw', 'abc');
    expect(await form.validate('pw')).toBe('Too short');
  });

  test('validateAll runs every field rule and the form-level validator', async () => {
    const form = createForm({
      values: { password: '', confirm: 'xyz' },
      rules: { password: (v) => (!v ? 'Required' : undefined) },
      validate: (vals) => (vals.password !== vals.confirm ? { confirm: 'Must match' } : undefined),
    });

    const errors = await form.validateAll();
    expect(errors.password).toBe('Required');
    expect(errors.confirm).toBe('Must match');
  });

  test('validateAll with onlyTouched skips untouched fields', async () => {
    const form = createForm({
      rules: {
        name: (v) => (!v ? 'Required' : undefined),
        email: (v) => (!v ? 'Required' : undefined),
      },
    });
    form.setTouched('name');

    const errors = await form.validateAll({ onlyTouched: true });
    expect(errors.name).toBe('Required');
    expect(errors.email).toBeUndefined();
  });

  test('validateAll with fields option validates only those fields', async () => {
    const form = createForm({
      rules: {
        name: (v) => (!v ? 'Name required' : undefined),
        email: (v) => (!v ? 'Email required' : undefined),
        age: (v) => (!v ? 'Age required' : undefined),
      },
    });

    const errors = await form.validateAll({ fields: ['name', 'email'] });
    expect(errors.name).toBe('Name required');
    expect(errors.email).toBe('Email required');
    expect(errors.age).toBeUndefined();
  });

  test('validate() stores the result in the error map', async () => {
    const form = createForm({
      rules: { x: (v) => (v !== 1 ? 'Must be 1' : undefined) },
    });
    form.set('x', 2);
    await form.validate('x');
    expect(form.getError('x')).toBe('Must be 1');

    form.set('x', 1);
    await form.validate('x');
    expect(form.getError('x')).toBeUndefined();
  });

  test('validateAll sets isValidating during async validation', async () => {
    let seenTrue = false;
    const form = createForm({
      rules: {
        slow: () => new Promise<string | undefined>((r) => setTimeout(() => r(undefined), 20)),
      },
    });
    form.subscribe((s) => {
      if (s.isValidating) seenTrue = true;
    });
    await form.validateAll();
    expect(seenTrue).toBe(true);
    expect(form.getState().isValidating).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// submit
// ---------------------------------------------------------------------------

describe('submit', () => {
  test('calls onSubmit with the typed values when valid', async () => {
    const form = createForm({
      values: { name: 'Alice', age: 30 },
      rules: { name: (v) => (!v ? 'Required' : undefined) },
    });

    const received: unknown[] = [];
    await form.submit(async (vals) => {
      received.push(vals);
    });
    expect(received[0]).toEqual({ name: 'Alice', age: 30 });
  });

  test('increments submitCount on each submission attempt', async () => {
    const form = createForm({ values: { x: 1 } });
    await form.submit(async () => {});
    await form.submit(async () => {});
    expect(form.getState().submitCount).toBe(2);
  });

  test('throws ValidationError and marks all fields touched on validation failure', async () => {
    const form = createForm({
      values: { name: '' },
      rules: { name: (v) => (!v ? 'Required' : undefined) },
    });

    await expect(form.submit(async () => {})).rejects.toBeInstanceOf(ValidationError);
    expect(form.isTouched('name')).toBe(true);
  });

  test('ValidationError carries the field-level error map', async () => {
    const form = createForm({
      rules: { email: (v) => (!v ? 'Required' : undefined) },
    });

    try {
      await form.submit(async () => {});
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).type).toBe('validation');
      expect((err as ValidationError).errors.email).toBe('Required');
    }
  });

  test('validate:false skips validation and calls onSubmit regardless of errors', async () => {
    const form = createForm({
      rules: { name: (v) => (!v ? 'Required' : undefined) },
    });
    let called = false;
    await form.submit(
      async () => {
        called = true;
      },
      { validate: false },
    );
    expect(called).toBe(true);
  });

  test('rejects a second concurrent submission', async () => {
    const form = createForm({ values: { x: 1 } });
    const p1 = form.submit(() => new Promise((r) => setTimeout(r, 50)));
    await expect(form.submit(async () => {})).rejects.toThrow('already being submitted');
    await p1;
  });

  test('isSubmitting is true during and false after submission', async () => {
    const form = createForm({ values: { x: 1 } });
    const states: boolean[] = [];
    form.subscribe((s) => states.push(s.isSubmitting));

    await form.submit(async () => {});
    expect(states).toContain(true);
    expect(form.getState().isSubmitting).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// subscribe / subscribeField
// ---------------------------------------------------------------------------

describe('subscribe / subscribeField', () => {
  test('subscribe fires immediately with the current state', () => {
    const form = createForm({ values: { x: 1 } });
    let called = 0;
    form.subscribe(() => {
      called++;
    });
    expect(called).toBe(1);
  });

  test('subscribe fires again after any state change', async () => {
    const form = createForm({ values: { x: 1 } });
    const counts: number[] = [];
    form.subscribe((s) => counts.push(s.dirty.size));
    form.set('x', 2);
    await new Promise((r) => setTimeout(r, 10));
    expect(counts.length).toBeGreaterThan(1);
  });

  test('unsubscribing stops future notifications', async () => {
    const form = createForm({ values: { x: 1 } });
    let count = 0;
    const unsub = form.subscribe(() => count++);
    const initial = count;
    unsub();
    form.set('x', 2);
    await new Promise((r) => setTimeout(r, 10));
    expect(count).toBe(initial);
  });

  test('subscribeField fires immediately with the current field payload', () => {
    const form = createForm({ values: { name: 'Alice' } });
    let payload: unknown;
    form.subscribeField('name', (p) => {
      payload = p;
    });
    expect((payload as { value: unknown }).value).toBe('Alice');
  });

  test('subscribeField only fires when the subscribed field changes', async () => {
    const form = createForm({ values: { a: 1, b: 2 } });
    let bCount = 0;
    form.subscribeField('b', () => {
      bCount++;
    });
    const initial = bCount;
    form.set('a', 99);
    await new Promise((r) => setTimeout(r, 10));
    expect(bCount).toBe(initial);
  });

  test('subscribeField payload reflects current error and touched state', async () => {
    const form = createForm({ values: { email: '' } });
    const payloads: { error?: string; touched: boolean }[] = [];
    form.subscribeField('email', (p) => payloads.push({ error: p.error, touched: p.touched }));

    form.setError('email', 'Invalid');
    form.setTouched('email');
    await new Promise((r) => setTimeout(r, 10));

    const last = payloads.at(-1)!;
    expect(last.error).toBe('Invalid');
    expect(last.touched).toBe(true);
  });

  test('unsubscribeField stops future notifications and cleans up the bucket', () => {
    const form = createForm({ values: { x: 1 } });
    const unsub = form.subscribeField('x', () => {});
    unsub();
    // no error expected — internal bucket should be removed
  });

  test('multiple independent subscribeField listeners on one field all fire', async () => {
    const form = createForm({ values: { x: 0 } });
    let a = 0;
    let b = 0;
    form.subscribeField('x', () => {
      a++;
    });
    form.subscribeField('x', () => {
      b++;
    });
    const aInit = a;
    const bInit = b;
    form.set('x', 1);
    await new Promise((r) => setTimeout(r, 10));
    expect(a).toBeGreaterThan(aInit);
    expect(b).toBeGreaterThan(bInit);
  });
});

// ---------------------------------------------------------------------------
// bind
// ---------------------------------------------------------------------------

describe('bind', () => {
  test('value getter returns the current stored value', () => {
    const form = createForm({ values: { name: 'Alice' } });
    expect(form.bind('name').value).toBe('Alice');
  });

  test('onChange with an event object extracts event.target.value', () => {
    const form = createForm({ values: { name: '' } });
    form.bind('name').onChange({ target: { value: 'Bob' } });
    expect(form.get('name')).toBe('Bob');
  });

  test('onChange with a raw value stores it directly', () => {
    const form = createForm({ values: { name: '' } });
    form.bind('name').onChange('Charlie');
    expect(form.get('name')).toBe('Charlie');
  });

  test('set on the binding stores the value', () => {
    const form = createForm({ values: { count: 0 } });
    form.bind('count').set(5);
    expect(form.get('count')).toBe(5);
  });

  test('set with an updater function applies it to the current value', () => {
    const form = createForm({ values: { count: 3 } });
    form.bind('count').set((v: unknown) => (v as number) + 1);
    expect(form.get('count')).toBe(4);
  });

  test('value setter calls the same setter as set', () => {
    const form = createForm({ values: { name: '' } });
    form.bind('name').value = 'Eve';
    expect(form.get('name')).toBe('Eve');
  });

  test('onBlur marks the field as touched by default', () => {
    const form = createForm({ values: { name: '' } });
    form.bind('name').onBlur();
    expect(form.isTouched('name')).toBe(true);
  });

  test('touchOnBlur:false prevents onBlur from marking touched', () => {
    const form = createForm({ values: { name: '' } });
    form.bind('name', { touchOnBlur: false }).onBlur();
    expect(form.isTouched('name')).toBe(false);
  });

  test('custom valueExtractor is used instead of event.target.value', () => {
    const form = createForm({ values: { category: '' } });
    form.bind('category', { valueExtractor: (e: unknown) => (e as { id: string }).id }).onChange({ id: 'books' });
    expect(form.get('category')).toBe('books');
  });
});

// ---------------------------------------------------------------------------
// toFormData
// ---------------------------------------------------------------------------

describe('toFormData', () => {
  test('converts flat values to FormData entries', () => {
    const fd = toFormData({ name: 'Alice', age: 25 });
    expect(fd.get('name')).toBe('Alice');
    expect(fd.get('age')).toBe('25');
  });

  test('nested objects are flattened to dot-notation keys', () => {
    const fd = toFormData({ user: { name: 'Bob', age: 30 } });
    expect(fd.get('user.name')).toBe('Bob');
    expect(fd.get('user.age')).toBe('30');
  });

  test('null and undefined values are omitted', () => {
    const fd = toFormData({ a: null, b: undefined, c: 'ok' });
    expect(fd.has('a')).toBe(false);
    expect(fd.has('b')).toBe(false);
    expect(fd.get('c')).toBe('ok');
  });

  test('File values are appended without conversion', () => {
    const file = new File(['data'], 'test.txt');
    const fd = toFormData({ attachment: file });
    expect(fd.get('attachment')).toBe(file);
  });

  test('array values result in multiple entries for the same key', () => {
    const fd = toFormData({ tags: ['js', 'ts'] });
    expect(fd.getAll('tags')).toEqual(['js', 'ts']);
  });
});

// ---------------------------------------------------------------------------
// ValidationError
// ---------------------------------------------------------------------------

describe('ValidationError', () => {
  test('is an instanceof Error', () => {
    const err = new ValidationError({ name: 'Required' });
    expect(err).toBeInstanceOf(Error);
  });

  test('carries the errors map and the "validation" type discriminant', () => {
    const err = new ValidationError({ name: 'Required', email: 'Invalid' });
    expect(err.errors).toEqual({ name: 'Required', email: 'Invalid' });
    expect(err.type).toBe('validation');
  });

  test('message is human-readable', () => {
    const err = new ValidationError({});
    expect(err.message).toContain('validation');
  });
});

// ---------------------------------------------------------------------------
// getState (snapshot)
// ---------------------------------------------------------------------------

describe('getState', () => {
  test('returns the current form state synchronously', () => {
    const form = createForm({ values: { x: 1 } });
    const state = form.getState();
    expect(state.submitCount).toBe(0);
    expect(state.isValid).toBe(true);
    expect(state.isDirty).toBe(false);
    expect(state.isTouched).toBe(false);
  });

  test('each call returns a new snapshot object', () => {
    const form = createForm({ values: { x: 1 } });
    const s1 = form.getState();
    form.set('x', 2);
    const s2 = form.getState();
    expect(s1).not.toBe(s2);
    expect(s2.dirty.has('x')).toBe(true);
  });

  test('mutations to the returned snapshot do not affect the form', () => {
    const form = createForm({ values: { x: 1 } });
    const state = form.getState();
    state.dirty.add('x');
    expect(form.isDirty('x')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// dispose
// ---------------------------------------------------------------------------

describe('dispose', () => {
  test('stops all form and field subscriber notifications', async () => {
    const form = createForm({ values: { x: 1 } });
    let formCount = 0;
    let fieldCount = 0;
    form.subscribe(() => {
      formCount++;
    });
    form.subscribeField('x', () => {
      fieldCount++;
    });

    const initForm = formCount;
    const initField = fieldCount;
    form.dispose();

    form.set('x', 2);
    await new Promise((r) => setTimeout(r, 10));
    expect(formCount).toBe(initForm);
    expect(fieldCount).toBe(initField);
  });
});
