import { vi } from 'vitest';

import { createForm, ValidationModes } from '../../index';

describe('form connect behavior', () => {
  test('connect() getters reflect live field value and meta state', () => {
    const form = createForm({ defaultValues: { name: '' } });
    const binding = form.connect('name', { touchOnBlur: true });

    expect(binding.value).toBe('');
    expect(binding.touched).toBe(false);
    expect(binding.dirty).toBe(false);

    binding.onChange('Alice');
    binding.onBlur();

    expect(binding.value).toBe('Alice');
    expect(binding.touched).toBe(true);
    expect(binding.dirty).toBe(true);
  });

  test('touchOnBlur:false keeps field untouched on blur', () => {
    const form = createForm({ defaultValues: { name: '' } });

    form.connect('name', { touchOnBlur: false }).onBlur();

    expect(form.field('name').touched).toBe(false);
  });

  test('validateOnChange triggers validation from connect().onChange', async () => {
    const form = createForm({
      defaultValues: { name: '' },
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    form.connect('name', { validateOnChange: true }).onChange('');

    await vi.waitFor(() => expect(form.field('name').error).toBe('Required'));
  });

  test('validateOnTouch validates on change only after first blur', async () => {
    const form = createForm({
      defaultValues: { name: '' },
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });
    const binding = form.connect('name', { touchOnBlur: true, validateOnTouch: true });

    binding.onChange('');
    expect(form.field('name').error).toBeUndefined();

    binding.onBlur();
    binding.onChange('');

    await vi.waitFor(() => expect(form.field('name').error).toBe('Required'));
  });

  test('per-connect config overrides connect defaults', async () => {
    const form = createForm({
      connect: { touchOnBlur: false, validateOnChange: false },
      defaultValues: { name: '' },
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    const binding = form.connect('name', { touchOnBlur: true, validateOnChange: true });

    binding.onBlur();
    binding.onChange('');

    expect(form.field('name').touched).toBe(true);
    await vi.waitFor(() => expect(form.field('name').error).toBe('Required'));
  });
});

describe('validate preset defaults', () => {
  test('no validate option does not validate on blur or change', async () => {
    const form = createForm({
      defaultValues: { name: '' },
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });
    const binding = form.connect('name');

    binding.onBlur();
    binding.onChange('');

    expect(form.field('name').error).toBeUndefined();
  });

  test('ValidationModes.onBlur validates when field blurs', async () => {
    const form = createForm({
      connect: ValidationModes.onBlur,
      defaultValues: { name: '' },
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    form.connect('name').onBlur();

    await vi.waitFor(() => expect(form.field('name').error).toBe('Required'));
  });

  test('ValidationModes.onChange validates on every change', async () => {
    const form = createForm({
      connect: ValidationModes.onChange,
      defaultValues: { name: '' },
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    form.connect('name').onChange('');

    await vi.waitFor(() => expect(form.field('name').error).toBe('Required'));
  });

  test('ValidationModes.onTouched validates on blur, then on subsequent changes', async () => {
    const form = createForm({
      connect: ValidationModes.onTouched,
      defaultValues: { name: '' },
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });
    const binding = form.connect('name');

    binding.onChange('');
    expect(form.field('name').error).toBeUndefined();

    binding.onBlur();
    await vi.waitFor(() => expect(form.field('name').error).toBe('Required'));

    binding.onChange('Alice');
    await vi.waitFor(() => expect(form.field('name').error).toBeUndefined());
  });

  test('inline validate config overrides preset', async () => {
    const form = createForm({
      connect: { validateOnBlur: false, validateOnChange: false },
      defaultValues: { name: '' },
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    form.connect('name').onChange('');

    expect(form.field('name').error).toBeUndefined();
  });

  test('debounce delays auto-validation trigger', async () => {
    vi.useFakeTimers();

    const form = createForm({
      connect: { debounce: 300, validateOnChange: true },
      defaultValues: { name: '' },
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });
    const binding = form.connect('name');

    binding.onChange('');

    // Error should not appear yet — debounce is pending.
    expect(form.field('name').error).toBeUndefined();

    await vi.runAllTimersAsync();

    expect(form.field('name').error).toBe('Required');

    vi.useRealTimers();
  });

  test('R2: dispose clears pending debounce timers so validation never fires after dispose', async () => {
    vi.useFakeTimers();

    let validatorCalls = 0;
    const form = createForm({
      connect: { debounce: 500, validateOnChange: true },
      defaultValues: { name: 'Alice' },
      validators: {
        name: (_v: unknown) => {
          validatorCalls++;

          return undefined;
        },
      },
    });
    const binding = form.connect('name');

    // Trigger a debounced validation — timer is now pending, validator not called yet.
    binding.onChange('Bob');
    expect(validatorCalls).toBe(0);

    // Dispose before debounce resolves.
    form.dispose();

    // Advance time fully — the timer must NOT fire the validator.
    await vi.runAllTimersAsync();

    expect(validatorCalls).toBe(0);

    vi.useRealTimers();
  });
});

describe('ValidationModes.onSubmit edge cases', () => {
  test('onSubmit preset does not touch the field on blur', async () => {
    const form = createForm({
      connect: ValidationModes.onSubmit,
      defaultValues: { name: '' },
    });
    const binding = form.connect('name');

    binding.onBlur();

    expect(form.field('name').touched).toBe(false);
  });
});

describe('per-binding debounce isolation', () => {
  test('two connect() calls for the same field have independent debounce timers', async () => {
    vi.useFakeTimers();

    let validatorCalls = 0;
    const form = createForm({
      connect: { debounce: 200, validateOnChange: true },
      defaultValues: { name: '' },
      validators: {
        name: (_v: unknown) => {
          validatorCalls++;

          return undefined;
        },
      },
    });

    const b1 = form.connect('name');
    const b2 = form.connect('name');

    // Fire both bindings — each should have its own independent debounce clock.
    b1.onChange('Alice');
    await vi.advanceTimersByTimeAsync(100);
    b2.onChange('Bob');

    // b1's debounce (200ms) expired at t=200, b2's at t=300.
    await vi.advanceTimersByTimeAsync(100); // t=200 — b1 fires
    expect(validatorCalls).toBe(1);

    await vi.advanceTimersByTimeAsync(100); // t=300 — b2 fires
    expect(validatorCalls).toBe(2);

    form.dispose();
    vi.useRealTimers();
  });

  test('connect() binding.disposed is false initially and true after dispose()', () => {
    const form = createForm({ defaultValues: { name: '' } });
    const binding = form.connect('name');

    expect(binding.disposed).toBe(false);

    binding.dispose();

    expect(binding.disposed).toBe(true);
  });

  test('connect() binding.disposed is true after [Symbol.dispose]()', () => {
    const form = createForm({ defaultValues: { name: '' } });
    const binding = form.connect('name');

    expect(binding.disposed).toBe(false);

    binding[Symbol.dispose]();

    expect(binding.disposed).toBe(true);
  });

  test('connect() binding.dispose() is idempotent — multiple calls keep disposed true', () => {
    const form = createForm({ defaultValues: { name: '' } });
    const binding = form.connect('name');

    binding.dispose();
    binding.dispose();

    expect(binding.disposed).toBe(true);
  });
});
