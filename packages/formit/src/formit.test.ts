import { createForm, FormValidationError, fromSchema, SubmitError, toFormData } from './formit';

const nextTick = () => new Promise<void>((r) => queueMicrotask(r));

// ---------------------------------------------------------------------------
// Values — storage, typing, and shape
// ---------------------------------------------------------------------------

describe('values', () => {
  test('primitive types are preserved without string coercion', () => {
    const form = createForm({
      defaultValues: { age: 25, flag: true, name: 'Alice', score: 3.14 },
    });

    expect(form.get<number>('age')).toBe(25);
    expect(form.get<boolean>('flag')).toBe(true);
    expect(form.get<number>('score')).toBe(3.14);
    expect(form.get<string>('name')).toBe('Alice');
  });

  test('plain objects are flattened; arrays are stored by reference', () => {
    const tags = ['js', 'ts'];
    const form = createForm({ defaultValues: { profile: { city: 'NYC' }, tags } });

    // plain objects are flattened — the parent key is not stored
    expect(form.get('profile')).toBeUndefined();
    expect(form.get('profile.city')).toBe('NYC');
    // arrays are leaf values — stored by reference
    expect(form.get('tags')).toBe(tags);
  });

  test('null and undefined can be stored directly', () => {
    const form = createForm<Record<string, unknown>>({ defaultValues: { x: null } });

    expect(form.get('x')).toBeNull();

    form.set('x', undefined);
    expect(form.get('x')).toBeUndefined();
  });

  test('nested plain objects are auto-flattened to dot-notation keys', () => {
    const form = createForm({
      defaultValues: {
        user: { address: { city: 'NYC' }, name: 'Alice' },
      },
    });

    expect(form.get('user.name')).toBe('Alice');
    expect(form.get('user.address.city')).toBe('NYC');
  });

  test('values() unflattens back to the original nested shape', () => {
    const form = createForm({
      defaultValues: { score: 10, user: { name: 'Alice' } },
    });

    expect(form.values()).toEqual({ score: 10, user: { name: 'Alice' } });
  });

  test('arrays and File instances inside defaultValues are not recursively flattened', () => {
    const file = new File(['content'], 'upload.txt');
    const form = createForm({ defaultValues: { attachment: file, tags: ['a', 'b'] } });

    expect(form.get('tags')).toEqual(['a', 'b']);
    expect(form.get('attachment')).toBe(file);
  });

  test('flat dot-notation keys are accepted directly and round-trip correctly', () => {
    const form = createForm({ defaultValues: { 'user.age': 30, 'user.name': 'Alice' } });

    expect(form.get('user.name')).toBe('Alice');
    form.set('user.name', 'Bob');
    expect(form.get('user.name')).toBe('Bob');
    expect(form.values()).toEqual({ user: { age: 30, name: 'Bob' } });
  });
});

// ---------------------------------------------------------------------------
// set / patch
// ---------------------------------------------------------------------------

describe('set / patch', () => {
  test('set stores a value and schedules a notification', async () => {
    const form = createForm({ defaultValues: { count: 0 } });
    const snapshots: number[] = [];

    form.subscribe((s) => snapshots.push(s.isDirty ? 1 : 0));
    form.set('count', 42);
    await nextTick();

    expect(form.get('count')).toBe(42);
    expect(snapshots.at(-1)).toBe(1);
  });

  test('set with dirty:false does not mark the field dirty', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    form.set('x', 99, { dirty: false });
    expect(form.field('x').dirty).toBe(false);
  });

  test('set with touched:true marks the field touched', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    form.set('x', 2, { touched: true });
    expect(form.field('x').touched).toBe(true);
  });

  test('setting a field back to its initial value clears dirty', () => {
    const form = createForm({ defaultValues: { name: 'Alice' } });

    form.set('name', 'Bob');
    expect(form.field('name').dirty).toBe(true);
    form.set('name', 'Alice');
    expect(form.field('name').dirty).toBe(false);
  });

  test('patch deep-merges nested objects and flattens them', () => {
    const form = createForm({ defaultValues: { a: 1, b: 2, c: 0 } });

    form.patch({ b: 99 });
    expect(form.values()).toEqual({ a: 1, b: 99, c: 0 });
  });

  test('patch marks patched fields dirty by default', () => {
    const form = createForm({ defaultValues: { a: 1, b: 2 } });

    form.patch({ b: 99 });
    expect(form.field('b').dirty).toBe(true);
    expect(form.field('a').dirty).toBe(false);
  });

  test('patch with dirty:false leaves dirty state unchanged', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    form.patch({ x: 1 }, { dirty: false });
    expect(form.field('x').dirty).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe('reset', () => {
  test('reset with no args restores the original initial values', () => {
    const form = createForm({ defaultValues: { age: 25, name: 'Alice' } });

    form.set('name', 'Bob');
    form.set('age', 30);
    form.reset();
    expect(form.values()).toEqual({ age: 25, name: 'Alice' });
  });

  test('reset(newValues) replaces both the store and the baseline', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    form.reset({ x: 99 });
    expect(form.values()).toEqual({ x: 99 });
    // after reset the new value is the baseline — changing it marks dirty
    form.set('x', 100);
    expect(form.field('x').dirty).toBe(true);
    // but resetting back to 99 should clear dirty
    form.set('x', 99);
    expect(form.field('x').dirty).toBe(false);
  });

  test('reset(newValues) sets new baseline; subsequent reset() returns to that baseline', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    form.reset({ x: 50 });
    // construction-time default is no longer the anchor — 50 is the new baseline
    form.set('x', 99);
    form.reset();
    expect(form.values()).toEqual({ x: 50 });
  });

  test('reset clears dirty, touched, and error state', () => {
    const form = createForm({ defaultValues: { name: '' } });

    form.set('name', 'Bob');
    form.touch('name');
    form.setError('name', 'Required');
    form.reset();

    const f = form.field('name');

    expect(f.dirty).toBe(false);
    expect(f.touched).toBe(false);
    expect(f.error).toBeUndefined();
  });

  test('reset accepts nested objects and flattens them', () => {
    const form = createForm({ defaultValues: { user: { name: 'Alice' } } });

    form.reset({ user: { name: 'Bob' } });
    expect(form.get('user.name')).toBe('Bob');
  });
});

// ---------------------------------------------------------------------------
// resetField
// ---------------------------------------------------------------------------

describe('resetField', () => {
  test('restores the field to its initial value', () => {
    const form = createForm({ defaultValues: { age: 25, name: 'Alice' } });

    form.set('name', 'Bob');
    form.resetField('name');
    expect(form.get('name')).toBe('Alice');
  });

  test('clears dirty, touched, and error state for that field only', () => {
    const form = createForm({ defaultValues: { age: 25, name: 'Alice' } });

    form.set('name', 'Bob');
    form.touch('name');
    form.setError('name', 'Too long');
    form.resetField('name');
    expect(form.field('name').dirty).toBe(false);
    expect(form.field('name').touched).toBe(false);
    expect(form.field('name').error).toBeUndefined();
  });

  test('does not affect other fields', () => {
    const form = createForm({ defaultValues: { age: 25, name: 'Alice' } });

    form.set('name', 'Bob');
    form.set('age', 99);
    form.touch('age');
    form.resetField('name');
    expect(form.get('age')).toBe(99);
    expect(form.field('age').dirty).toBe(true);
    expect(form.field('age').touched).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// dirty & touched
// ---------------------------------------------------------------------------

describe('dirty & touched', () => {
  test('dirty and touched are false on a fresh form', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    expect(form.field('x').dirty).toBe(false);
    expect(form.field('x').touched).toBe(false);
  });

  test('touch marks a field as touched without affecting dirty', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    form.touch('x');
    expect(form.field('x').touched).toBe(true);
    expect(form.field('x').dirty).toBe(false);
  });

  test('snapshot isDirty / isTouched flags reflect aggregate state', async () => {
    const form = createForm({ defaultValues: { a: 1, b: 2 } });

    expect(form.state.isDirty).toBe(false);

    form.set('a', 99);
    await nextTick();
    expect(form.state.isDirty).toBe(true);

    form.touch('b');
    await nextTick();
    expect(form.state.isTouched).toBe(true);
  });

  test('touchAll marks every known field as touched', () => {
    const form = createForm({
      defaultValues: { a: 1, b: 2 },
      validators: { c: () => undefined },
    });

    form.touchAll();
    expect(form.field('a').touched).toBe(true);
    expect(form.field('b').touched).toBe(true);
    expect(form.field('c').touched).toBe(true);
  });

  test('untouch removes touched state from a single field without resetting its value', () => {
    const form = createForm({ defaultValues: { a: 1, b: 2 } });

    form.touch('a');
    form.touch('b');
    form.untouch('a');
    expect(form.field('a').touched).toBe(false);
    expect(form.field('b').touched).toBe(true);
    expect(form.get('a')).toBe(1);
  });

  test('untouchAll removes touched state from all fields without resetting values', () => {
    const form = createForm({ defaultValues: { a: 1, b: 2 } });

    form.set('a', 99);
    form.touchAll();
    form.untouchAll();
    expect(form.isTouched).toBe(false);
    // values and dirty state are preserved
    expect(form.get('a')).toBe(99);
    expect(form.field('a').dirty).toBe(true);
  });

  test('top-level isValid / isDirty / isTouched getters mirror state flags', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    expect(form.isValid).toBe(true);
    expect(form.isDirty).toBe(false);
    expect(form.isTouched).toBe(false);

    form.set('x', 2);
    expect(form.isDirty).toBe(true);

    form.touch('x');
    expect(form.isTouched).toBe(true);

    form.setError('x', 'Bad');
    expect(form.isValid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// errors
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// field (unified field state)
// ---------------------------------------------------------------------------

describe('field', () => {
  test('returns value, error, touched, and dirty for a field', () => {
    const form = createForm({ defaultValues: { name: 'Alice' } });

    form.setError('name', 'Too short');
    form.touch('name');

    const f = form.field('name');

    expect(f.value).toBe('Alice');
    expect(f.error).toBe('Too short');
    expect(f.touched).toBe(true);
    expect(f.dirty).toBe(false);
  });

  test('field() mirrors the watch payload', () => {
    const form = createForm({ defaultValues: { x: 42 } });
    let last: ReturnType<typeof form.field> | undefined;

    form.watch('x', (p) => {
      last = p;
    });
    expect(form.field('x')).toEqual(last);
  });
});

// ---------------------------------------------------------------------------
// errors
// ---------------------------------------------------------------------------

describe('errors', () => {
  test('setError stores a field error accessible via field()', () => {
    const form = createForm({});

    form.setError('email', 'Invalid');
    expect(form.field('email').error).toBe('Invalid');
  });

  test('empty string is a valid error value', () => {
    const form = createForm({});

    form.setError('field', '');
    expect(form.field('field').error).toBe('');
  });

  test('setError with undefined removes the error', () => {
    const form = createForm({});

    form.setError('email', 'Bad');
    form.setError('email', undefined);
    expect(form.field('email').error).toBeUndefined();
  });

  test('state.errors returns a shallow copy of all errors', () => {
    const form = createForm({});

    form.setError('a', 'Err A');
    form.setError('b', 'Err B');
    expect(form.state.errors).toEqual({ a: 'Err A', b: 'Err B' });

    // each call returns a new snapshot — mutations do not affect the form
    const snap = form.state.errors;

    snap.a = 'changed';
    expect(form.field('a').error).toBe('Err A');
  });

  test('setErrors replaces the entire error map', () => {
    const form = createForm({});

    form.setError('old', 'Old error');
    form.setErrors({ email: 'Invalid', name: 'Required' });
    expect(form.field('old').error).toBeUndefined();
    expect(form.state.errors).toEqual({ email: 'Invalid', name: 'Required' });
  });

  test('setErrors with empty object clears all errors', () => {
    const form = createForm({});

    form.setError('x', 'Oops');
    form.setErrors({});
    expect(Object.keys(form.state.errors)).toHaveLength(0);
  });

  test('clearErrors() is a shorthand for setErrors({})', () => {
    const form = createForm({});

    form.setError('a', 'Err A');
    form.setError('b', 'Err B');
    form.clearErrors();
    expect(Object.keys(form.state.errors)).toHaveLength(0);
    expect(form.isValid).toBe(true);
  });

  test('isValid reflects whether the error map is empty', async () => {
    const form = createForm({ defaultValues: { name: 'Alice' } });

    expect(form.state.isValid).toBe(true);

    form.setError('name', 'Too short');
    await nextTick();
    expect(form.state.isValid).toBe(false);

    form.setErrors({});
    await nextTick();
    expect(form.state.isValid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validation
// ---------------------------------------------------------------------------

describe('validation', () => {
  test('validateField runs per-field validators and returns the error message', async () => {
    const form = createForm({
      validators: { email: (v) => (!String(v).includes('@') ? 'Invalid format' : undefined) },
    });

    form.set('email', 'notanemail');
    expect(await form.validateField('email')).toBe('Invalid format');
  });

  test('validateField returns undefined when the field is valid', async () => {
    const form = createForm({
      validators: { email: (v) => (!String(v).includes('@') ? 'Invalid' : undefined) },
    });

    form.set('email', 'a@b.com');
    expect(await form.validateField('email')).toBeUndefined();
  });

  test('validators are run in order; first failing rule wins', async () => {
    const form = createForm({
      validators: {
        pw: [(v) => (!v ? 'Required' : undefined), (v) => (String(v).length < 8 ? 'Too short' : undefined)],
      },
    });

    form.set('pw', '');
    expect(await form.validateField('pw')).toBe('Required');

    form.set('pw', 'abc');
    expect(await form.validateField('pw')).toBe('Too short');
  });

  test('validate() runs every field validator and the form-level validator', async () => {
    const form = createForm({
      defaultValues: { confirm: 'xyz', password: '' },
      validator: (vals) => (vals.password !== vals.confirm ? { confirm: 'Must match' } : undefined),
      validators: { password: (v) => (!v ? 'Required' : undefined) },
    });

    const { errors, valid } = await form.validate();

    expect(valid).toBe(false);
    expect(errors.password).toBe('Required');
    expect(errors.confirm).toBe('Must match');
  });

  test('validate({ onlyTouched }) skips untouched fields', async () => {
    const form = createForm({
      validators: {
        email: (v) => (!v ? 'Required' : undefined),
        name: (v) => (!v ? 'Required' : undefined),
      },
    });

    form.touch('name');

    const { errors } = await form.validate({ onlyTouched: true });

    expect(errors.name).toBe('Required');
    expect(errors.email).toBeUndefined();
  });

  test('validate({ fields:[] }) validates nothing (empty partial)', async () => {
    const form = createForm({
      validators: { name: (v) => (!v ? 'Required' : undefined) },
    });
    const { errors, valid } = await form.validate({ fields: [] });

    expect(valid).toBe(true);
    expect(Object.keys(errors)).toHaveLength(0);
    expect(form.field('name').error).toBeUndefined();
  });

  test('validate({ fields }) validates only those fields', async () => {
    const form = createForm({
      validators: {
        age: (v) => (!v ? 'Age required' : undefined),
        email: (v) => (!v ? 'Email required' : undefined),
        name: (v) => (!v ? 'Name required' : undefined),
      },
    });

    const { errors } = await form.validate({ fields: ['name', 'email'] });

    expect(errors.name).toBe('Name required');
    expect(errors.email).toBe('Email required');
    expect(errors.age).toBeUndefined();
  });

  test('validateField stores the result in the error map', async () => {
    const form = createForm({
      validators: { x: (v) => (v !== 1 ? 'Must be 1' : undefined) },
    });

    form.set('x', 2);
    await form.validateField('x');
    expect(form.field('x').error).toBe('Must be 1');

    form.set('x', 1);
    await form.validateField('x');
    expect(form.field('x').error).toBeUndefined();
  });

  test('validate() sets isValidating during async validation', async () => {
    let seenTrue = false;
    const form = createForm({
      validators: {
        slow: () => new Promise<string | undefined>((r) => setTimeout(() => r(undefined), 20)),
      },
    });

    form.subscribe((s) => {
      if (s.isValidating) seenTrue = true;
    });
    await form.validate();
    expect(seenTrue).toBe(true);
    expect(form.state.isValidating).toBe(false);
  });

  test('validateField() sets isValidating during async validation', async () => {
    let seenTrue = false;
    const form = createForm({
      validators: {
        slow: () => new Promise<string | undefined>((r) => setTimeout(() => r(undefined), 20)),
      },
    });

    form.subscribe((s) => {
      if (s.isValidating) seenTrue = true;
    });
    await form.validateField('slow');
    expect(seenTrue).toBe(true);
    expect(form.state.isValidating).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// submit
// ---------------------------------------------------------------------------

describe('submit', () => {
  test('calls onSubmit with the typed values when valid', async () => {
    const form = createForm({
      defaultValues: { age: 30, name: 'Alice' },
      validators: { name: (v) => (!v ? 'Required' : undefined) },
    });

    const received: unknown[] = [];

    await form.submit(async (vals) => {
      received.push(vals);
    });
    expect(received[0]).toEqual({ age: 30, name: 'Alice' });
  });

  test('increments submitCount on each submission attempt', async () => {
    const form = createForm({ defaultValues: { x: 1 } });

    await form.submit(async () => {});
    await form.submit(async () => {});
    expect(form.state.submitCount).toBe(2);
  });

  test('throws FormValidationError and marks all fields touched on validation failure', async () => {
    const form = createForm({
      defaultValues: { name: '' },
      validators: { name: (v) => (!v ? 'Required' : undefined) },
    });

    await expect(form.submit(async () => {})).rejects.toBeInstanceOf(FormValidationError);
    expect(form.field('name').touched).toBe(true);
  });

  test('FormValidationError carries the field-level error map', async () => {
    const form = createForm({
      validators: { email: (v) => (!v ? 'Required' : undefined) },
    });

    try {
      await form.submit(async () => {});
    } catch (err) {
      expect(err).toBeInstanceOf(FormValidationError);
      expect((err as FormValidationError).type).toBe('validation');
      expect((err as FormValidationError).errors.email).toBe('Required');
    }
  });

  test('skipValidation:true skips validation and touchAll; calls onSubmit regardless of errors', async () => {
    const form = createForm({
      validators: { name: (v) => (!v ? 'Required' : undefined) },
    });
    let called = false;

    await form.submit(
      async () => {
        called = true;
      },
      { skipValidation: true },
    );
    expect(called).toBe(true);
    expect(form.field('name').touched).toBe(false);
  });

  test('rejects a second concurrent submission', async () => {
    const form = createForm({ defaultValues: { x: 1 } });
    const p1 = form.submit(() => new Promise((r) => setTimeout(r, 50)));

    await expect(form.submit(async () => {})).rejects.toBeInstanceOf(SubmitError);
    await p1;
  });

  test('submit validates all fields and marks them touched', async () => {
    const form = createForm({
      validators: {
        email: (v) => (!v ? 'Email required' : undefined),
        name: (v) => (!v ? 'Name required' : undefined),
      },
    });

    await expect(form.submit(async () => {})).rejects.toBeInstanceOf(FormValidationError);
    expect(form.field('name').error).toBe('Name required');
    expect(form.field('name').touched).toBe(true);
    expect(form.field('email').error).toBe('Email required');
    expect(form.field('email').touched).toBe(true);
  });

  test('isSubmitting is true during and false after submission', async () => {
    const form = createForm({ defaultValues: { x: 1 } });
    const states: boolean[] = [];

    form.subscribe((s) => states.push(s.isSubmitting));

    await form.submit(async () => {});
    expect(states).toContain(true);
    expect(form.state.isSubmitting).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// subscribe
// ---------------------------------------------------------------------------

describe('subscribe', () => {
  test('subscribe fires immediately with the current state', () => {
    const form = createForm({ defaultValues: { x: 1 } });
    let called = 0;

    form.subscribe(() => {
      called++;
    });
    expect(called).toBe(1);
  });

  test('subscribe with immediate:false does not fire on registration', () => {
    const form = createForm({ defaultValues: { x: 1 } });
    let called = 0;

    form.subscribe(
      () => {
        called++;
      },
      { immediate: false },
    );
    expect(called).toBe(0);
  });

  test('subscribe fires again after any state change', async () => {
    const form = createForm({ defaultValues: { x: 1 } });
    const counts: number[] = [];

    form.subscribe((s) => counts.push(s.isDirty ? 1 : 0));
    form.set('x', 2);
    await nextTick();
    expect(counts.length).toBeGreaterThan(1);
  });

  test('unsubscribing stops future notifications', async () => {
    const form = createForm({ defaultValues: { x: 1 } });
    let count = 0;
    const unsub = form.subscribe(() => count++);
    const initial = count;

    unsub();
    form.set('x', 2);
    await new Promise<void>((r) => queueMicrotask(r));
    expect(count).toBe(initial);
  });

  test('watch fires immediately with the current field payload', () => {
    const form = createForm({ defaultValues: { name: 'Alice' } });
    let payload: unknown;

    form.watch('name', (p) => {
      payload = p;
    });
    expect((payload as { value: unknown }).value).toBe('Alice');
  });

  test('watch with immediate:false does not fire on registration', () => {
    const form = createForm({ defaultValues: { x: 1 } });
    let count = 0;

    form.watch(
      'x',
      () => {
        count++;
      },
      { immediate: false },
    );
    expect(count).toBe(0);
  });

  test('watch only fires when the subscribed field changes', async () => {
    const form = createForm({ defaultValues: { a: 1, b: 2 } });
    let bCount = 0;

    form.watch('b', () => {
      bCount++;
    });

    const initial = bCount;

    form.set('a', 99);
    await new Promise<void>((r) => queueMicrotask(r));
    expect(bCount).toBe(initial);
  });

  test('watch payload reflects current error and touched state', async () => {
    const form = createForm({ defaultValues: { email: '' } });
    const payloads: { error?: string; touched: boolean }[] = [];

    form.watch('email', (p) => payloads.push({ error: p.error, touched: p.touched }));

    form.setError('email', 'Invalid');
    form.touch('email');
    await new Promise<void>((r) => queueMicrotask(r));

    const last = payloads.at(-1)!;

    expect(last.error).toBe('Invalid');
    expect(last.touched).toBe(true);
  });

  test('unsubscribeField stops future notifications and cleans up the bucket', () => {
    const form = createForm({ defaultValues: { x: 1 } });
    const unsub = form.watch('x', () => {});

    unsub();
    // no error expected — internal bucket should be removed
  });

  test('multiple independent watch listeners on one field all fire', async () => {
    const form = createForm({ defaultValues: { x: 0 } });
    let a = 0;
    let b = 0;

    form.watch('x', () => {
      a++;
    });
    form.watch('x', () => {
      b++;
    });

    const aInit = a;
    const bInit = b;

    form.set('x', 1);
    await new Promise<void>((r) => queueMicrotask(r));
    expect(a).toBeGreaterThan(aInit);
    expect(b).toBeGreaterThan(bInit);
  });
});

// ---------------------------------------------------------------------------
// bind
// ---------------------------------------------------------------------------

describe('bind', () => {
  test('value getter returns the current stored value', () => {
    const form = createForm({ defaultValues: { name: 'Alice' } });

    expect(form.bind('name').value).toBe('Alice');
  });

  test('onChange with an event object extracts event.target.value', () => {
    const form = createForm({ defaultValues: { name: '' } });

    form.bind('name').onChange({ target: { value: 'Bob' } });
    expect(form.get('name')).toBe('Bob');
  });

  test('onChange with a raw value stores it directly', () => {
    const form = createForm({ defaultValues: { name: '' } });

    form.bind('name').onChange('Charlie');
    expect(form.get('name')).toBe('Charlie');
  });

  test('use form.set() to programmatically set a bound field', () => {
    const form = createForm({ defaultValues: { count: 0 } });

    form.set('count', 5);
    expect(form.get('count')).toBe(5);
  });

  test('value getter reflects latest value after onChange', () => {
    const form = createForm({ defaultValues: { name: '' } });
    const binding = form.bind('name');

    binding.onChange('Eve');
    expect(binding.value).toBe('Eve');
  });

  test('error getter returns the current error for the field', async () => {
    const form = createForm({
      defaultValues: { name: '' },
      validators: { name: (v) => (!v ? 'Required' : undefined) },
    });

    await form.validateField('name');
    expect(form.bind('name').error).toBe('Required');
    form.set('name', 'Alice');
    await form.validateField('name');
    expect(form.bind('name').error).toBeUndefined();
  });

  test('touched getter reflects current touched state', () => {
    const form = createForm({ defaultValues: { name: '' } });
    const binding = form.bind('name');

    expect(binding.touched).toBe(false);
    binding.onBlur();
    expect(binding.touched).toBe(true);
  });

  test('dirty getter reflects current dirty state', () => {
    const form = createForm({ defaultValues: { name: '' } });
    const binding = form.bind('name');

    expect(binding.dirty).toBe(false);
    binding.onChange('Alice');
    expect(binding.dirty).toBe(true);
  });

  test('onBlur marks the field as touched by default', () => {
    const form = createForm({ defaultValues: { name: '' } });

    form.bind('name').onBlur();
    expect(form.field('name').touched).toBe(true);
  });

  test('bind() returns the same object reference on repeated calls with same args', () => {
    const form = createForm({ defaultValues: { name: '' } });
    const b1 = form.bind('name');
    const b2 = form.bind('name');

    expect(b1).toBe(b2);
  });

  test('bind() with different configs returns distinct cached objects', () => {
    const form = createForm({ defaultValues: { name: '' } });
    const b1 = form.bind('name', { validateOnBlur: true });
    const b2 = form.bind('name', { validateOnBlur: false });

    expect(b1).not.toBe(b2);
  });

  test('touchOnBlur:false prevents onBlur from marking touched', () => {
    const form = createForm({ defaultValues: { name: '' } });

    form.bind('name', { touchOnBlur: false }).onBlur();
    expect(form.field('name').touched).toBe(false);
  });

  test('custom valueExtractor is used instead of event.target.value', () => {
    const form = createForm({ defaultValues: { category: '' } });

    form.bind('category', { valueExtractor: (e: unknown) => (e as { id: string }).id }).onChange({ id: 'books' });
    expect(form.get('category')).toBe('books');
  });
});

// ---------------------------------------------------------------------------
// toFormData
// ---------------------------------------------------------------------------

describe('toFormData', () => {
  test('converts flat values to FormData entries', () => {
    const fd = toFormData({ age: 25, name: 'Alice' });

    expect(fd.get('name')).toBe('Alice');
    expect(fd.get('age')).toBe('25');
  });

  test('nested objects are flattened to dot-notation keys', () => {
    const fd = toFormData({ user: { age: 30, name: 'Bob' } });

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
// FormValidationError
// ---------------------------------------------------------------------------

describe('FormValidationError', () => {
  test('is an instanceof Error', () => {
    const err = new FormValidationError({ name: 'Required' });

    expect(err).toBeInstanceOf(Error);
  });

  test('carries the errors map and the "validation" type discriminant', () => {
    const err = new FormValidationError({ email: 'Invalid', name: 'Required' });

    expect(err.errors).toEqual({ email: 'Invalid', name: 'Required' });
    expect(err.type).toBe('validation');
  });

  test('message is human-readable', () => {
    const err = new FormValidationError({});

    expect(err.message).toContain('validation');
  });
});

// ---------------------------------------------------------------------------
// state (snapshot)
// ---------------------------------------------------------------------------

describe('state', () => {
  test('returns the current form state synchronously', () => {
    const form = createForm({ defaultValues: { x: 1 } });
    const state = form.state;

    expect(state.submitCount).toBe(0);
    expect(state.isValid).toBe(true);
    expect(state.isDirty).toBe(false);
    expect(state.isTouched).toBe(false);
  });

  test('each call returns a new snapshot object', () => {
    const form = createForm({ defaultValues: { x: 1 } });
    const s1 = form.state;

    form.set('x', 2);

    const s2 = form.state;

    expect(s1).not.toBe(s2);
    expect(form.field('x').dirty).toBe(true);
  });

  test('mutations to the returned snapshot do not affect the form', () => {
    const form = createForm({ defaultValues: { x: 1 } });
    const state = form.state;

    state.errors.x = 'oops';
    expect(form.field('x').error).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// SubmitError
// ---------------------------------------------------------------------------

describe('SubmitError', () => {
  test('is an instanceof Error', () => {
    const err = new SubmitError();

    expect(err).toBeInstanceOf(Error);
  });

  test('carries the "submit" type discriminant', () => {
    const err = new SubmitError();

    expect(err.type).toBe('submit');
  });

  test('message is human-readable', () => {
    const err = new SubmitError();

    expect(err.message).toContain('submit');
  });
});

// ---------------------------------------------------------------------------
// dispose
// ---------------------------------------------------------------------------

describe('dispose', () => {
  test('stops all form and field subscriber notifications', async () => {
    const form = createForm({ defaultValues: { x: 1 } });
    let formCount = 0;
    let fieldCount = 0;

    form.subscribe(() => {
      formCount++;
    });
    form.watch('x', () => {
      fieldCount++;
    });

    const initForm = formCount;
    const initField = fieldCount;

    form.dispose();

    expect(() => form.set('x', 2)).toThrow('Cannot modify a disposed form');
    expect(formCount).toBe(initForm);
    expect(fieldCount).toBe(initField);
  });
});

// ---------------------------------------------------------------------------
// field shorthand getters
// ---------------------------------------------------------------------------

describe('field shorthand getters', () => {
  test('getError returns the current field error', () => {
    const form = createForm({});

    form.setError('email', 'Invalid');
    expect(form.getError('email')).toBe('Invalid');
    form.setError('email', undefined);
    expect(form.getError('email')).toBeUndefined();
  });

  test('isFieldDirty returns whether a field differs from baseline', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    expect(form.isFieldDirty('x')).toBe(false);
    form.set('x', 2);
    expect(form.isFieldDirty('x')).toBe(true);
    form.set('x', 1);
    expect(form.isFieldDirty('x')).toBe(false);
  });

  test('isFieldTouched returns whether a field has been touched', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    expect(form.isFieldTouched('x')).toBe(false);
    form.touch('x');
    expect(form.isFieldTouched('x')).toBe(true);
    form.untouch('x');
    expect(form.isFieldTouched('x')).toBe(false);
  });

  test('shorthand getters return same values as field()', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    form.setError('x', 'Bad');
    form.touch('x');
    form.set('x', 2);
    expect(form.getError('x')).toBe(form.field('x').error);
    expect(form.isFieldTouched('x')).toBe(form.field('x').touched);
    expect(form.isFieldDirty('x')).toBe(form.field('x').dirty);
  });
});

// ---------------------------------------------------------------------------
// array field utilities
// ---------------------------------------------------------------------------

describe('array field utilities', () => {
  test('appendField adds an item to an existing array field', () => {
    const form = createForm({ defaultValues: { tags: ['a', 'b'] } });

    form.appendField('tags', 'c');
    expect(form.get('tags')).toEqual(['a', 'b', 'c']);
  });

  test('appendField creates the array when the field is not yet set', () => {
    const form = createForm<Record<string, unknown>>({});

    form.appendField('tags', 'first');
    expect(form.get('tags')).toEqual(['first']);
  });

  test('appendField marks the field dirty', () => {
    const form = createForm({ defaultValues: { tags: ['a'] } });

    form.appendField('tags', 'b');
    expect(form.isFieldDirty('tags')).toBe(true);
  });

  test('removeField removes the item at the given index', () => {
    const form = createForm({ defaultValues: { tags: ['a', 'b', 'c'] } });

    form.removeField('tags', 1);
    expect(form.get('tags')).toEqual(['a', 'c']);
  });

  test('removeField is a no-op when the field is not an array', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    expect(() => form.removeField('x', 0)).not.toThrow();
    expect(form.get('x')).toBe(1);
  });

  test('moveField reorders items in an array field', () => {
    const form = createForm({ defaultValues: { tags: ['a', 'b', 'c', 'd'] } });

    form.moveField('tags', 0, 2);
    expect(form.get('tags')).toEqual(['b', 'c', 'a', 'd']);
  });

  test('moveField is a no-op when the field is not an array', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    expect(() => form.moveField('x', 0, 1)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// fromSchema
// ---------------------------------------------------------------------------

describe('fromSchema', () => {
  const mockSchema = {
    safeParse: (data: unknown) => {
      const v = data as { age: number; email: string };
      const issues: { message: string; path: string[] }[] = [];

      if (!String(v.email ?? '').includes('@')) issues.push({ message: 'Invalid email', path: ['email'] });

      if ((v.age ?? 0) < 18) issues.push({ message: 'Must be 18+', path: ['age'] });

      if (issues.length) return { error: { issues }, success: false as const };

      return { success: true as const };
    },
  };

  test('converts a safeParse-compatible schema into a validator option', async () => {
    const form = createForm({
      defaultValues: { age: 15, email: 'notvalid' },
      ...fromSchema(mockSchema),
    });

    const { errors, valid } = await form.validate();

    expect(valid).toBe(false);
    expect(errors.email).toBe('Invalid email');
    expect(errors.age).toBe('Must be 18+');
  });

  test('returns undefined (no errors) when schema validation passes', async () => {
    const form = createForm({
      defaultValues: { age: 25, email: 'alice@example.com' },
      ...fromSchema(mockSchema),
    });

    const { errors, valid } = await form.validate();

    expect(valid).toBe(true);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  test('first issue per path wins when schema reports multiple issues', async () => {
    const multiSchema = {
      safeParse: (_: unknown) => ({
        error: {
          issues: [
            { message: 'First', path: ['email'] },
            { message: 'Second', path: ['email'] },
          ],
        },
        success: false as const,
      }),
    };
    const form = createForm({ defaultValues: { email: '' }, ...fromSchema(multiSchema) });
    const { errors } = await form.validate();

    expect(errors.email).toBe('First');
  });
});
