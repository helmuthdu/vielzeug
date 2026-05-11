import { createForm, FormValidationError, SubmitError } from '../index';

const nextTick = () => new Promise<void>((r) => queueMicrotask(r));

// ---------------------------------------------------------------------------
// Values — storage, typing, and shape
// ---------------------------------------------------------------------------

describe('values', () => {
  test('primitive types are preserved without string coercion', () => {
    const form = createForm({
      defaultValues: { age: 25, flag: true, name: 'Alice', score: 3.14 },
    });

    expect(form.get('age')).toBe(25);
    expect(form.get('flag')).toBe(true);
    expect(form.get('score')).toBe(3.14);
    expect(form.get('name')).toBe('Alice');
  });

  test('plain objects are flattened; arrays are stored by reference', () => {
    const tags = ['js', 'ts'];
    const form = createForm<Record<string, unknown>>({ defaultValues: { profile: { city: 'NYC' }, tags } });

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

describe('set', () => {
  test('set stores a value and schedules a notification', async () => {
    const form = createForm({ defaultValues: { count: 0 } });
    const snapshots: number[] = [];

    form.subscribeForm((s) => snapshots.push(s.isDirty ? 1 : 0));
    form.set('count', 42);
    await nextTick();

    expect(form.get('count')).toBe(42);
    expect(snapshots.at(-1)).toBe(1);
  });

  test('set with track:false does not mark the field dirty', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    form.set('x', 99, { track: false });
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

  test('replace(newValues) replaces both the store and the baseline', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    form.replace({ x: 99 });
    expect(form.values()).toEqual({ x: 99 });
    // after reset the new value is the baseline — changing it marks dirty
    form.set('x', 100);
    expect(form.field('x').dirty).toBe(true);
    // but resetting back to 99 should clear dirty
    form.set('x', 99);
    expect(form.field('x').dirty).toBe(false);
  });

  test('replace(newValues) sets new baseline; subsequent reset() returns to that baseline', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    form.replace({ x: 50 });
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

    form.replace({ user: { name: 'Bob' } });
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

  test('touch() without args marks every known field as touched', () => {
    const form = createForm<Record<string, unknown>>({
      defaultValues: { a: 1, b: 2 },
      validators: { c: () => undefined },
    });

    form.touch();
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

  test('untouch() without args removes touched state from all fields', () => {
    const form = createForm({ defaultValues: { a: 1, b: 2 } });

    form.set('a', 99);
    form.touch();
    form.untouch();
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

  test('Date values compare by timestamp for dirty tracking', () => {
    const baseline = new Date('2024-01-01T00:00:00.000Z');
    const form = createForm({ defaultValues: { dueAt: baseline } });

    form.set('dueAt', new Date('2024-01-02T00:00:00.000Z'));
    expect(form.field('dueAt').dirty).toBe(true);

    form.set('dueAt', new Date('2024-01-01T00:00:00.000Z'));
    expect(form.field('dueAt').dirty).toBe(false);
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

  test('field() mirrors the field subscribe payload', () => {
    const form = createForm({ defaultValues: { x: 42 } });
    let last: ReturnType<typeof form.field> | undefined;

    form.subscribeField(
      'x',
      (p) => {
        last = p;
      },
      { sync: true },
    );
    expect(form.field('x')).toEqual(last);
  });
});

// ---------------------------------------------------------------------------
// errors
// ---------------------------------------------------------------------------

describe('errors', () => {
  test('setError stores a field error accessible via field()', () => {
    const form = createForm<Record<string, unknown>>({});

    form.setError('email', 'Invalid');
    expect(form.field('email').error).toBe('Invalid');
  });

  test('empty string is a valid error value', () => {
    const form = createForm<Record<string, unknown>>({});

    form.setError('field', '');
    expect(form.field('field').error).toBe('');
  });

  test('clearError removes the field error', () => {
    const form = createForm<Record<string, unknown>>({});

    form.setError('email', 'Bad');
    form.clearError('email');
    expect(form.field('email').error).toBeUndefined();
  });

  test('state.errors returns a shallow copy of all errors', () => {
    const form = createForm<Record<string, unknown>>({});

    form.setError('a', 'Err A');
    form.setError('b', 'Err B');
    expect(form.state.errors).toEqual({ a: 'Err A', b: 'Err B' });

    // each call returns a new snapshot — mutations do not affect the form
    const snap = form.state.errors;

    snap.a = 'changed';
    expect(form.field('a').error).toBe('Err A');
  });

  test('replaceErrors replaces the entire error map', () => {
    const form = createForm<Record<string, unknown>>({});

    form.setError('old', 'Old error');
    form.replaceErrors({ email: 'Invalid', name: 'Required' });
    expect(form.field('old').error).toBeUndefined();
    expect(form.state.errors).toEqual({ email: 'Invalid', name: 'Required' });
  });

  test('replaceErrors ignores undefined values in the provided map', () => {
    const form = createForm<Record<string, unknown>>({});

    form.replaceErrors({ skip: undefined as unknown as string, valid: 'Error' });
    expect(form.state.errors).toEqual({ valid: 'Error' });
  });

  test('replaceErrors with empty object clears all errors', () => {
    const form = createForm<Record<string, unknown>>({});

    form.setError('x', 'Oops');
    form.replaceErrors({});
    expect(Object.keys(form.state.errors)).toHaveLength(0);
  });

  test('mergeErrors updates only listed fields and preserves others', () => {
    const form = createForm<Record<string, unknown>>({});

    form.replaceErrors({ a: 'Err A', b: 'Err B' });
    form.mergeErrors({ b: 'Err B2', c: 'Err C' });

    expect(form.state.errors).toEqual({ a: 'Err A', b: 'Err B2', c: 'Err C' });
  });

  test('mergeErrors clears only fields explicitly set to undefined', () => {
    const form = createForm<Record<string, unknown>>({});

    form.replaceErrors({ a: 'Err A', b: 'Err B' });
    form.mergeErrors({ a: undefined });

    expect(form.state.errors).toEqual({ b: 'Err B' });
  });

  test('clearError only clears the targeted field error', () => {
    const form = createForm<Record<string, unknown>>({});

    form.setError('a', 'Err A');
    form.setError('b', 'Err B');
    form.clearError('a');
    expect(form.state.errors).toEqual({ b: 'Err B' });
    expect(form.isValid).toBe(false);
  });

  test('isValid reflects whether the error map is empty', async () => {
    const form = createForm({ defaultValues: { name: 'Alice' } });

    expect(form.state.isValid).toBe(true);

    form.setError('name', 'Too short');
    await nextTick();
    expect(form.state.isValid).toBe(false);

    form.replaceErrors({});
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
      validators: { email: (v: unknown) => (!String(v).includes('@') ? 'Invalid format' : undefined) },
    });

    form.set('email', 'notanemail');
    expect(await form.validateField('email')).toBe('Invalid format');
  });

  test('validateField returns undefined when the field is valid', async () => {
    const form = createForm({
      validators: { email: (v: unknown) => (!String(v).includes('@') ? 'Invalid' : undefined) },
    });

    form.set('email', 'a@b.com');
    expect(await form.validateField('email')).toBeUndefined();
  });

  test('validators are run in order; first failing rule wins', async () => {
    const form = createForm({
      validators: {
        pw: [
          (v: unknown) => (!v ? 'Required' : undefined),
          (v: unknown) => (String(v).length < 8 ? 'Too short' : undefined),
        ],
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
      validators: { password: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    const { errors, valid } = await form.validate();

    expect(valid).toBe(false);
    expect(errors.password).toBe('Required');
    expect(errors.confirm).toBe('Must match');
  });

  test("validate('touched') skips untouched fields", async () => {
    const form = createForm({
      validators: {
        email: (v: unknown) => (!v ? 'Required' : undefined),
        name: (v: unknown) => (!v ? 'Required' : undefined),
      },
    });

    form.touch('name');

    const { errors } = await form.validate('touched');

    expect(errors.name).toBe('Required');
    expect(errors.email).toBeUndefined();
  });

  test('validate([]) validates nothing (empty partial)', async () => {
    const form = createForm({
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });
    const { errors, valid } = await form.validate([]);

    expect(valid).toBe(true);
    expect(Object.keys(errors)).toHaveLength(0);
    expect(form.field('name').error).toBeUndefined();
  });

  test('validate(fields) validates only those fields', async () => {
    const form = createForm({
      validators: {
        age: (v: unknown) => (!v ? 'Age required' : undefined),
        email: (v: unknown) => (!v ? 'Email required' : undefined),
        name: (v: unknown) => (!v ? 'Name required' : undefined),
      },
    });

    const { errors } = await form.validate(['name', 'email']);

    expect(errors.name).toBe('Name required');
    expect(errors.email).toBe('Email required');
    expect(errors.age).toBeUndefined();
  });

  test('validateField stores the result in the error map', async () => {
    const form = createForm({
      validators: { x: (v: unknown) => (v !== 1 ? 'Must be 1' : undefined) },
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

    form.subscribeForm((s) => {
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

    form.subscribeForm((s) => {
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
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
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
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    await expect(form.submit(async () => {})).rejects.toBeInstanceOf(FormValidationError);
    expect(form.field('name').touched).toBe(true);
  });

  test('FormValidationError carries the field-level error map', async () => {
    const form = createForm({
      validators: { email: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    try {
      await form.submit(async () => {});
    } catch (err) {
      expect(err).toBeInstanceOf(FormValidationError);
      expect((err as FormValidationError).type).toBe('validation');
      expect((err as FormValidationError).errors.email).toBe('Required');
    }
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
        email: (v: unknown) => (!v ? 'Email required' : undefined),
        name: (v: unknown) => (!v ? 'Name required' : undefined),
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

    form.subscribeForm((s) => states.push(s.isSubmitting));

    await form.submit(async () => {});
    expect(states).toContain(true);
    expect(form.state.isSubmitting).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// subscribe
// ---------------------------------------------------------------------------

describe('subscribe', () => {
  test('subscribe with sync:true fires immediately with the current state', () => {
    const form = createForm({ defaultValues: { x: 1 } });
    let called = 0;

    form.subscribeForm(
      () => {
        called++;
      },
      { sync: true },
    );
    expect(called).toBe(1);
  });

  test('subscribe does not fire on registration by default', () => {
    const form = createForm({ defaultValues: { x: 1 } });
    let called = 0;

    form.subscribeForm(() => {
      called++;
    });
    expect(called).toBe(0);
  });

  test('subscribe fires when state changes', async () => {
    const form = createForm({ defaultValues: { x: 1 } });
    const counts: number[] = [];

    form.subscribeForm((s) => counts.push(s.isDirty ? 1 : 0));
    form.set('x', 2);
    await nextTick();
    expect(counts).toContain(1);
  });

  test('unsubscribing stops future notifications', async () => {
    const form = createForm({ defaultValues: { x: 1 } });
    let count = 0;
    const unsub = form.subscribeForm(() => count++);
    const initial = count;

    unsub();
    form.set('x', 2);
    await new Promise<void>((r) => queueMicrotask(r));
    expect(count).toBe(initial);
  });

  test('field subscribe with sync:true fires immediately with the current field payload', () => {
    const form = createForm({ defaultValues: { name: 'Alice' } });
    let payload: unknown;

    form.subscribeField(
      'name',
      (p) => {
        payload = p;
      },
      { sync: true },
    );
    expect((payload as { value: unknown }).value).toBe('Alice');
  });

  test('field subscribe does not fire on registration by default', () => {
    const form = createForm({ defaultValues: { x: 1 } });
    let count = 0;

    form.subscribeField('x', () => {
      count++;
    });
    expect(count).toBe(0);
  });

  test('field subscribe only fires when the subscribed field changes', async () => {
    const form = createForm({ defaultValues: { a: 1, b: 2 } });
    let bCount = 0;

    form.subscribeField('b', () => {
      bCount++;
    });

    const initial = bCount;

    form.set('a', 99);
    await new Promise<void>((r) => queueMicrotask(r));
    expect(bCount).toBe(initial);
  });

  test('field subscribe payload reflects current error and touched state', async () => {
    const form = createForm({ defaultValues: { email: '' } });
    const payloads: { error?: string; touched: boolean }[] = [];

    form.subscribeField('email', (p) => payloads.push({ error: p.error, touched: p.touched }));

    form.setError('email', 'Invalid');
    form.touch('email');
    await new Promise<void>((r) => queueMicrotask(r));

    const last = payloads.at(-1)!;

    expect(last.error).toBe('Invalid');
    expect(last.touched).toBe(true);
  });

  test('field unsubscribe stops future notifications and cleans up the bucket', () => {
    const form = createForm({ defaultValues: { x: 1 } });
    const unsub = form.subscribeField('x', () => {});

    unsub();
    // no error expected — internal bucket should be removed
  });

  test('multiple independent field listeners on one field all fire', async () => {
    const form = createForm({ defaultValues: { x: 0 } });
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

  test('onChange stores the provided value directly', () => {
    const form = createForm({ defaultValues: { name: '' } });

    form.bind('name').onChange('Bob');
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
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
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

  test('bind() returns a fresh object on repeated calls with same args', () => {
    const form = createForm({ defaultValues: { name: '' } });
    const b1 = form.bind('name');
    const b2 = form.bind('name');

    expect(b1).not.toBe(b2);
  });

  test('bind() with different configs returns distinct objects', () => {
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

  test('bind defaults are applied when per-bind config is omitted', async () => {
    const form = createForm({
      bindDefaults: { touchOnBlur: false, validateOnChange: true },
      defaultValues: { name: '' },
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    const binding = form.bind('name');

    binding.onBlur();
    expect(form.field('name').touched).toBe(false);

    binding.onChange('');
    await new Promise((r) => setTimeout(r, 0));
    expect(form.field('name').error).toBe('Required');
  });

  test('per-bind config overrides bind defaults', async () => {
    const form = createForm({
      bindDefaults: { touchOnBlur: false, validateOnChange: false },
      defaultValues: { name: '' },
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    const binding = form.bind('name', { touchOnBlur: true, validateOnChange: true });

    binding.onBlur();
    expect(form.field('name').touched).toBe(true);

    binding.onChange('');
    await new Promise((r) => setTimeout(r, 0));
    expect(form.field('name').error).toBe('Required');
  });
});

// ---------------------------------------------------------------------------
// toFormData
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

    form.subscribeForm(() => {
      formCount++;
    });
    form.subscribeField('x', () => {
      fieldCount++;
    });

    const initForm = formCount;
    const initField = fieldCount;

    form.dispose();

    expect(() => form.set('x', 2)).toThrow('Cannot modify a disposed form');
    expect(formCount).toBe(initForm);
    expect(fieldCount).toBe(initField);
  });

  test('subscribe throws after form is disposed', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    form.dispose();

    expect(() => form.subscribeForm(() => {})).toThrow('Cannot modify a disposed form');
    expect(() => form.subscribeField('x', () => {})).toThrow('Cannot modify a disposed form');
  });

  test('bind throws after form is disposed', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    form.dispose();

    expect(() => form.bind('x')).toThrow('Cannot modify a disposed form');
  });
});

// ---------------------------------------------------------------------------
// clearError
// ---------------------------------------------------------------------------

describe('clearError', () => {
  test('clears only one field error', () => {
    const form = createForm<Record<string, unknown>>({});

    form.setError('email', 'Invalid');
    form.setError('name', 'Required');
    form.clearError('email');
    expect(form.field('email').error).toBeUndefined();
    expect(form.field('name').error).toBe('Required');
  });
});

// ---------------------------------------------------------------------------
// array field utilities
// ---------------------------------------------------------------------------

describe('array field utilities', () => {
  test('array(name).append adds an item to an existing array field', () => {
    const form = createForm({ defaultValues: { tags: ['a', 'b'] } });

    form.array('tags').append('c');
    expect(form.get('tags')).toEqual(['a', 'b', 'c']);
  });

  test('array(name).append creates the array when the field is not yet set', () => {
    const form = createForm<Record<string, unknown>>({});

    form.array('tags').append('first');
    expect(form.get('tags')).toEqual(['first']);
  });

  test('array(name).append marks the field dirty', () => {
    const form = createForm({ defaultValues: { tags: ['a'] } });

    form.array('tags').append('b');
    expect(form.field('tags').dirty).toBe(true);
  });

  test('array(name).remove removes the item at the given index', () => {
    const form = createForm({ defaultValues: { tags: ['a', 'b', 'c'] } });

    form.array('tags').remove(1);
    expect(form.get('tags')).toEqual(['a', 'c']);
  });

  test('array(name).remove is a no-op when the field is not an array', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    expect(() => form.array('x').remove(0)).not.toThrow();
    expect(form.get('x')).toBe(1);
  });

  test('array(name).move reorders items in an array field', () => {
    const form = createForm({ defaultValues: { tags: ['a', 'b', 'c', 'd'] } });

    form.array('tags').move(0, 2);
    expect(form.get('tags')).toEqual(['b', 'c', 'a', 'd']);
  });

  test('array(name).move is a no-op when the field is not an array', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    expect(() => form.array('x').move(0, 1)).not.toThrow();
  });

  test('array(name).prepend adds an item to the front', () => {
    const form = createForm({ defaultValues: { tags: ['b', 'c'] } });

    form.array('tags').prepend('a');
    expect(form.get('tags')).toEqual(['a', 'b', 'c']);
  });

  test('array(name).prepend creates the array when field is not yet set', () => {
    const form = createForm<Record<string, unknown>>({});

    form.array('tags').prepend('first');
    expect(form.get('tags')).toEqual(['first']);
  });

  test('array(name).insert adds an item at the given index', () => {
    const form = createForm({ defaultValues: { tags: ['a', 'c'] } });

    form.array('tags').insert(1, 'b');
    expect(form.get('tags')).toEqual(['a', 'b', 'c']);
  });

  test('array(name).insert is a no-op when the field is not an array', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    expect(() => form.array('x').insert(0, 'v')).not.toThrow();
    expect(form.get('x')).toBe(1);
  });

  test('array(name).swap exchanges two items by index', () => {
    const form = createForm({ defaultValues: { tags: ['a', 'b', 'c'] } });

    form.array('tags').swap(0, 2);
    expect(form.get('tags')).toEqual(['c', 'b', 'a']);
  });

  test('array(name).swap is a no-op when the field is not an array', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    expect(() => form.array('x').swap(0, 1)).not.toThrow();
  });

  test('array(name).replace replaces the item at the given index', () => {
    const form = createForm({ defaultValues: { tags: ['a', 'b', 'c'] } });

    form.array('tags').replace(1, 'z');
    expect(form.get('tags')).toEqual(['a', 'z', 'c']);
  });

  test('array(name).replace is a no-op when the field is not an array', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    expect(() => form.array('x').replace(0, 'v')).not.toThrow();
    expect(form.get('x')).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// removeField
// ---------------------------------------------------------------------------

describe('removeField', () => {
  test('removes the field value from the store', () => {
    const form = createForm({ defaultValues: { age: 25, name: 'Alice' } });

    form.removeField('name');
    expect(form.get('name')).toBeUndefined();
    expect(form.get('age')).toBe(25);
  });

  test('removes the field from the baseline so reset() no longer restores it', () => {
    const form = createForm({ defaultValues: { email: '', name: '' } });

    form.set('name', 'Bob');
    form.removeField('name');
    form.reset();
    expect(form.get('name')).toBeUndefined();
    expect(form.get('email')).toBe('');
  });

  test('clears dirty, touched, and error state for that field', () => {
    const form = createForm({ defaultValues: { name: 'Alice' } });

    form.set('name', 'Bob');
    form.touch('name');
    form.setError('name', 'Too long');
    form.removeField('name');
    expect(form.field('name').dirty).toBe(false);
    expect(form.field('name').touched).toBe(false);
    expect(form.field('name').error).toBeUndefined();
  });

  test('removes the field validator so validation no longer runs for that field', async () => {
    const form = createForm({
      validators: {
        email: (v: unknown) => (!v ? 'Required' : undefined),
        name: (v: unknown) => (!v ? 'Required' : undefined),
      },
    });

    form.removeField('name');

    const { errors } = await form.validate();

    expect(errors.name).toBeUndefined();
    expect(errors.email).toBe('Required');
  });

  test('does not affect other fields', () => {
    const form = createForm({ defaultValues: { age: 30, name: 'Alice' } });

    form.set('age', 99);
    form.touch('age');
    form.removeField('name');
    expect(form.get('age')).toBe(99);
    expect(form.field('age').dirty).toBe(true);
    expect(form.field('age').touched).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// watch
// ---------------------------------------------------------------------------

describe('watch', () => {
  test('fires the callback when the field value changes', async () => {
    const form = createForm({ defaultValues: { name: '' } });
    const values: string[] = [];

    form.watch('name', (v: unknown) => values.push(v as string));
    form.set('name', 'Alice');
    await new Promise<void>((r) => queueMicrotask(r));
    expect(values).toContain('Alice');
  });

  test('sync:true fires immediately with the current value', () => {
    const form = createForm({ defaultValues: { name: 'Alice' } });
    let seen: unknown;

    form.watch(
      'name',
      (v: unknown) => {
        seen = v;
      },
      { sync: true },
    );
    expect(seen).toBe('Alice');
  });

  test('returns an unsubscribe that stops future notifications', async () => {
    const form = createForm({ defaultValues: { x: 0 } });
    let count = 0;
    const unsub = form.watch('x', () => {
      count++;
    });

    unsub();
    form.set('x', 1);
    await new Promise<void>((r) => queueMicrotask(r));
    expect(count).toBe(0);
  });

  test('does not fire when an unrelated field changes', async () => {
    const form = createForm({ defaultValues: { a: 1, b: 2 } });
    let count = 0;

    form.watch('b', () => {
      count++;
    });
    form.set('a', 99);
    await new Promise<void>((r) => queueMicrotask(r));
    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// validation mode
// ---------------------------------------------------------------------------

describe('validation mode', () => {
  test("mode:'onSubmit' (default) does not validate on blur or change", async () => {
    const form = createForm({
      defaultValues: { name: '' },
      mode: 'onSubmit',
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });
    const binding = form.bind('name');

    binding.onBlur();
    binding.onChange('');
    await new Promise((r) => setTimeout(r, 0));
    expect(form.field('name').error).toBeUndefined();
  });

  test("mode:'onBlur' triggers validation on blur", async () => {
    const form = createForm({
      defaultValues: { name: '' },
      mode: 'onBlur',
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    form.bind('name').onBlur();
    await new Promise((r) => setTimeout(r, 0));
    expect(form.field('name').error).toBe('Required');
  });

  test("mode:'onChange' triggers validation on every change", async () => {
    const form = createForm({
      defaultValues: { name: '' },
      mode: 'onChange',
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    form.bind('name').onChange('');
    await new Promise((r) => setTimeout(r, 0));
    expect(form.field('name').error).toBe('Required');
  });

  test("mode:'onTouched' validates on blur and then on change", async () => {
    const form = createForm({
      defaultValues: { name: '' },
      mode: 'onTouched',
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });
    const binding = form.bind('name');

    // before first blur, changes should not validate yet
    binding.onChange('');
    await new Promise((r) => setTimeout(r, 0));
    expect(form.field('name').error).toBeUndefined();

    // blur first triggers validation
    binding.onBlur();
    await new Promise((r) => setTimeout(r, 0));
    expect(form.field('name').error).toBe('Required');

    // subsequent change also validates
    binding.onChange('Alice');
    await new Promise((r) => setTimeout(r, 0));
    expect(form.field('name').error).toBeUndefined();
  });

  test('explicit bindDefaults takes precedence over mode', async () => {
    const form = createForm({
      bindDefaults: { validateOnBlur: false, validateOnChange: false },
      defaultValues: { name: '' },
      mode: 'onChange',
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    form.bind('name').onChange('');
    await new Promise((r) => setTimeout(r, 0));
    expect(form.field('name').error).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// submit with onInvalid callback
// ---------------------------------------------------------------------------

describe('submit onInvalid callback', () => {
  test('calls onInvalid with errors instead of throwing when validation fails', async () => {
    const form = createForm({
      validators: { email: (v: unknown) => (!v ? 'Required' : undefined) },
    });
    let captured: Record<string, string> | undefined;

    await form.submit(
      async () => {},
      (errors) => {
        captured = errors;
      },
    );
    expect(captured).toEqual({ email: 'Required' });
  });

  test('does not throw FormValidationError when onInvalid is provided', async () => {
    const form = createForm({
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    await expect(
      form.submit(
        async () => {},
        () => {},
      ),
    ).resolves.toBeUndefined();
  });

  test('still calls onSubmit when form is valid', async () => {
    const form = createForm({
      defaultValues: { name: 'Alice' },
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });
    let submitted = false;

    await form.submit(
      async () => {
        submitted = true;
      },
      () => {},
    );
    expect(submitted).toBe(true);
  });

  test('throws FormValidationError when onInvalid is omitted (existing behaviour)', async () => {
    const form = createForm({
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    await expect(form.submit(async () => {})).rejects.toBeInstanceOf(FormValidationError);
  });
});
