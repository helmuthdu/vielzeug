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
    expect(() => createForm({ initialValues: { dueAt: new Map() } })).toThrow(ForgeConfigError);
  });

  test('clones Date leaves so external mutation cannot change form state', () => {
    const date = new Date('2026-01-01');
    const form = createForm({ initialValues: { dueAt: date } });

    expect(form.value.dueAt).not.toBe(date);
    expect(form.value.dueAt).toEqual(date);
    date.setUTCFullYear(2030);
    expect(form.value.dueAt).toEqual(new Date('2026-01-01'));

    const next = new Date('2026-02-01');
    form.field('dueAt').set(next);
    expect(form.value.dueAt).not.toBe(next);
    expect(form.value.dueAt).toEqual(new Date('2026-02-01'));
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
      validate: (value) => {
        const issues: { path: (string | number)[]; message: string }[] = [];

        if (!value.email.includes('@')) issues.push({ message: 'Invalid email', path: ['email'] });
        if (value.profile.age < 18) issues.push({ message: 'Must be an adult', path: ['profile', 'age'] });

        return issues;
      },
    });

    await expect(form.validate()).resolves.toEqual({
      issues: [
        { message: 'Invalid email', path: ['email'] },
        { message: 'Must be an adult', path: ['profile', 'age'] },
      ],
      status: 'invalid',
    });

    form.field('email').set('a@example.com');
    expect(form.field('profile').field('age').error).toBe('Must be an adult');
    form.field('profile').field('age').set(20);

    await expect(form.validate()).resolves.toEqual({ status: 'valid' });
    expect(form.state.issues).toBeUndefined();
  });

  test('tracks validity as unknown after edits and resolved after validation', async () => {
    const form = createForm({
      initialValues: { email: '' },
      validate: (value) => (value.email.includes('@') ? undefined : [{ message: 'Invalid email', path: ['email'] }]),
    });

    expect(form.state.validity).toBe('unknown');
    expect(form.state.hasErrors).toBe(false);

    await form.validate();

    expect(form.state.validity).toBe('invalid');
    expect(form.state.hasErrors).toBe(true);

    form.field('email').set('a@example.com');

    expect(form.state.validity).toBe('unknown');
    expect(form.state.hasErrors).toBe(true);

    await form.validate();

    expect(form.state.validity).toBe('valid');
    expect(form.state.hasErrors).toBe(false);
  });

  test('aborts superseded validation without stale writes', async () => {
    let releaseFirst!: (value: readonly { path: ['name']; message: string }[]) => void;
    const first = new Promise<readonly { path: ['name']; message: string }[]>((resolve) => {
      releaseFirst = resolve;
    });
    let calls = 0;
    const form = createForm({
      initialValues: { name: '' },
      validate: async (value) => {
        calls++;

        if (calls === 1) return first;

        return value.name ? undefined : [{ message: 'Required', path: ['name'] }];
      },
    });

    const pending = form.validate();

    await Promise.resolve();
    form.field('name').set('Ada');

    const latest = form.validate();

    releaseFirst([{ message: 'Stale', path: ['name'] }]);

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
      validate: (value) => (value.email ? undefined : [{ message: 'Required', path: ['email'] }]),
    });

    await expect(form.submit(() => undefined)).resolves.toEqual({
      issues: [{ message: 'Required', path: ['email'] }],
      status: 'invalid',
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
    await expect(submission).resolves.toEqual({ status: 'ok', value: undefined });
  });

  test('submit passes a signal to the handler and returns aborted when cancelled', async () => {
    const form = createForm({
      initialValues: { email: 'a@example.com' },
      validate: (value) => (value.email ? undefined : [{ message: 'Required', path: ['email'] }]),
    });

    const controller = new AbortController();
    let receivedSignal: AbortSignal | undefined;
    let handlerStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      handlerStarted = resolve;
    });

    const submission = form.submit(async (_value, signal) => {
      receivedSignal = signal;
      handlerStarted();

      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    }, controller.signal);

    await started;
    controller.abort();

    await expect(submission).resolves.toEqual({ status: 'aborted' });
    expect(receivedSignal?.aborted).toBe(true);
  });

  test('submit handler receives disposal signal when no external signal is provided', async () => {
    const form = createForm({
      initialValues: { email: 'a@example.com' },
      validate: (value) => (value.email ? undefined : [{ message: 'Required', path: ['email'] }]),
    });

    let receivedSignal: AbortSignal | undefined;
    let handlerStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      handlerStarted = resolve;
    });

    const submission = form.submit(async (_value, signal) => {
      receivedSignal = signal;
      handlerStarted();

      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    });

    await started;
    form.dispose();

    await expect(submission).resolves.toEqual({ status: 'aborted' });
    expect(receivedSignal?.aborted).toBe(true);
  });

  test('submit rethrows handler errors that are not signal aborts', async () => {
    const form = createForm({ initialValues: { email: 'a@example.com' } });
    const failure = new Error('handler failed');

    await expect(
      form.submit(async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
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

    await expect(form.submit(() => undefined)).resolves.toEqual({ status: 'ok', value: undefined });
    expect(form.state.submitting).toBe(false);
    expect(subscriberErrors).toContain(failure);
  });

  test('keeps the public state snapshot stable between transitions', () => {
    const form = createForm({ initialValues: { name: '' } });
    const state = form.state;

    expect(form.state).toBe(state);
    form.field('name').touch();
    expect(form.state).not.toBe(state);
    expect(form.state).toBe(form.state);
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

  test('field state snapshot reads all properties in one path walk', () => {
    const form = createForm({ initialValues: { email: '' } });
    const email = form.field('email');

    email.set('a@example.com');
    email.touch();

    const state = email.state;

    expect(state).toEqual({
      dirty: true,
      error: undefined,
      touched: true,
      value: 'a@example.com',
    });
  });

  test('disposal aborts work and rejects future mutations', () => {
    const form = createForm({ initialValues: { name: '' } });

    form.dispose();

    expect(form.disposalSignal.aborted).toBe(true);
    expect(() => form.set({ name: 'Ada' })).toThrow(ForgeDisposedError);
    expect(() => form.subscribe(() => {})).toThrow(ForgeDisposedError);
    expect(() => form.field('name').subscribe(() => {})).toThrow(ForgeDisposedError);
  });

  test('rejects unsafe top-level field keys', () => {
    const form = createForm({ initialValues: { name: '' } });

    expect(() => form.field('__proto__' as never)).toThrow(ForgeConfigError);
    expect(() => form.field('constructor' as never)).toThrow(ForgeConfigError);
  });

  test('submit handler aborts on disposal even when an external signal is provided', async () => {
    const form = createForm({
      initialValues: { email: 'a@example.com' },
      validate: (value) => (value.email ? undefined : [{ message: 'Required', path: ['email'] }]),
    });

    const controller = new AbortController();
    let handlerStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      handlerStarted = resolve;
    });

    const submission = form.submit(async (_value, signal) => {
      handlerStarted();

      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    }, controller.signal);

    await started;
    form.dispose();

    await expect(submission).resolves.toEqual({ status: 'aborted' });
    expect(controller.signal.aborted).toBe(false);
  });

  test('array item fields support per-item reads, updates, and resets', () => {
    const form = createForm({ initialValues: { items: [{ email: 'a@example.com' }, { email: 'b@example.com' }] } });

    const items = form.field('items');
    const first = items.field(0);

    expect(first.value).toEqual({ email: 'a@example.com' });
    expect(first.dirty).toBe(false);

    first.field('email').set('x@example.com');

    expect(first.value).toEqual({ email: 'x@example.com' });
    expect(first.dirty).toBe(true);
    expect(form.value.items[1]).toEqual({ email: 'b@example.com' });
    expect(form.value.items[1]).toBe(items.field(1).value);

    first.reset();

    expect(first.value).toEqual({ email: 'a@example.com' });
    expect(first.dirty).toBe(false);
  });

  test('array item fields reject out-of-range indices and non-array values', () => {
    const form = createForm({ initialValues: { items: ['a'] as string[], name: '' } });

    expect(() => form.field('items').field(5)).not.toThrow();
    expect(() => form.field('items').field(5).set('x')).toThrow(ForgeConfigError);
    expect(() => (form.field('name') as unknown as { field: (index: number) => unknown }).field(0)).toThrow(
      ForgeConfigError,
    );
  });

  test('array item fields support per-item touch and subscribe', () => {
    const form = createForm({ initialValues: { items: ['a', 'b'] } });
    const listener = vi.fn();

    const first = form.field('items').field(0);
    const stop = first.subscribe(listener, { immediate: true });

    first.touch();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ touched: true }));

    first.set('c');
    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ dirty: true, value: 'c' }));

    stop();
    first.set('d');
    expect(listener).toHaveBeenCalledTimes(3);
  });

  test('restores parent dirty state after nested values return to baseline', () => {
    const form = createForm({ initialValues: { profile: { name: 'Ada' } } });
    const profile = form.field('profile');
    const name = profile.field('name');

    name.set('Grace');
    name.set('Ada');

    expect(name.dirty).toBe(false);
    expect(profile.dirty).toBe(false);
  });

  test('rejects unsupported, circular, and sparse values', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() => createForm({ initialValues: { callback: () => undefined } })).toThrow(ForgeConfigError);
    expect(() => createForm({ initialValues: { value: Number.NaN } })).toThrow(ForgeConfigError);
    expect(() => createForm({ initialValues: circular })).toThrow(/circular/);
    expect(() => createForm({ initialValues: { items: Array(2) } })).toThrow(/empty slots/);
  });

  test('rejects fractional and negative array indexes', () => {
    const form = createForm({ initialValues: { items: ['a'] } });

    expect(() => form.field('items').field(0.5)).toThrow(ForgeConfigError);
    expect(() => form.field('items').field(-1)).toThrow(ForgeConfigError);
  });

  test('owns immutable validation issues and exposes the first form error', async () => {
    const issues = [
      { message: 'Form failed', path: [] as Array<string | number> },
      { message: 'Required', path: ['name'] as Array<string | number> },
    ];
    const form = createForm({ initialValues: { name: '' }, validate: () => issues });

    await form.validate();
    issues[0].message = 'mutated';
    issues[1].path[0] = 'other';

    expect(form.state.formError).toBe('Form failed');
    expect(form.field('name').error).toBe('Required');
    expect(Object.isFrozen(form.state.issues?.[0])).toBe(true);
    expect(Object.isFrozen(form.state.issues?.[0]?.path)).toBe(true);
  });

  test('queues reentrant writes so every subscriber sees transitions in order', () => {
    const form = createForm({ initialValues: { first: 0, second: 0 } });
    let nested = false;
    const seen: number[] = [];
    form.subscribe(() => {
      if (!nested) {
        nested = true;
        form.field('second').set(1);
      }
    });
    form.subscribe(() => seen.push(form.value.second));

    form.field('first').set(1);

    expect(seen).toEqual([0, 1]);
  });

  test('does not submit values changed reentrantly after validation', async () => {
    const handler = vi.fn();
    const form = createForm({ initialValues: { email: 'valid' }, validate: () => undefined });
    form.subscribe((state) => {
      if (state.validity === 'valid') form.field('email').set('');
    });

    await expect(form.submit(handler)).resolves.toEqual({ status: 'aborted' });
    expect(handler).not.toHaveBeenCalled();
  });

  test('settles validation promptly when its signal aborts', async () => {
    const controller = new AbortController();
    const form = createForm({
      initialValues: { name: '' },
      validate: () => new Promise<readonly []>(() => undefined),
    });
    const pending = form.validate(controller.signal);

    controller.abort();

    await expect(pending).resolves.toEqual({ status: 'aborted' });
  });

  test('isolates immediate subscriber failures', () => {
    const failure = new Error('subscriber failed');
    const errors: unknown[] = [];
    const form = createForm({ initialValues: { name: '' }, onSubscriberError: (error) => errors.push(error) });

    expect(() =>
      form.subscribe(
        () => {
          throw failure;
        },
        { immediate: true },
      ),
    ).not.toThrow();
    expect(errors).toEqual([failure]);
  });

  test('submit touches array items individually', async () => {
    const form = createForm({
      initialValues: { items: [{ email: '' }, { email: '' }] },
      validate: (value) => {
        const issues: { path: (string | number)[]; message: string }[] = [];

        if (!value.items[0].email) issues.push({ message: 'Required', path: ['items', 0] });
        if (!value.items[1].email) issues.push({ message: 'Required', path: ['items', 1] });

        return issues;
      },
    });

    await form.validate();

    expect(form.field('items').field(0).error).toBe('Required');
    expect(form.field('items').field(1).error).toBe('Required');
    expect(form.field('items').error).toBeUndefined();

    await form.submit(() => undefined);

    expect(form.field('items').field(0).field('email').touched).toBe(true);
    expect(form.field('items').field(1).field('email').touched).toBe(true);
  });
});
