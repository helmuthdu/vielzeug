import { vi } from 'vitest';

import { createForm, ValidationModes } from '../../index';

describe('form wire behavior', () => {
  test('wire getters reflect live field value and meta state', () => {
    const form = createForm({ defaultValues: { name: '' } });
    const binding = form.wire('name');

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

    form.wire('name', { touchOnBlur: false }).onBlur();

    expect(form.field('name').touched).toBe(false);
  });

  test('validateOnChange triggers validation from wire.onChange', async () => {
    const form = createForm({
      defaultValues: { name: '' },
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    form.wire('name', { validateOnChange: true }).onChange('');

    await vi.waitFor(() => expect(form.field('name').error).toBe('Required'));
  });

  test('validateOnTouch validates on change only after first blur', async () => {
    const form = createForm({
      defaultValues: { name: '' },
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });
    const binding = form.wire('name', { touchOnBlur: true, validateOnTouch: true });

    binding.onChange('');
    expect(form.field('name').error).toBeUndefined();

    binding.onBlur();
    binding.onChange('');

    await vi.waitFor(() => expect(form.field('name').error).toBe('Required'));
  });

  test('per-wire config overrides validate defaults', async () => {
    const form = createForm({
      defaultValues: { name: '' },
      validate: { touchOnBlur: false, validateOnChange: false },
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    const binding = form.wire('name', { touchOnBlur: true, validateOnChange: true });

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
    const binding = form.wire('name');

    binding.onBlur();
    binding.onChange('');

    expect(form.field('name').error).toBeUndefined();
  });

  test('ValidationModes.onBlur validates when field blurs', async () => {
    const form = createForm({
      defaultValues: { name: '' },
      validate: ValidationModes.onBlur,
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    form.wire('name').onBlur();

    await vi.waitFor(() => expect(form.field('name').error).toBe('Required'));
  });

  test('ValidationModes.onChange validates on every change', async () => {
    const form = createForm({
      defaultValues: { name: '' },
      validate: ValidationModes.onChange,
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    form.wire('name').onChange('');

    await vi.waitFor(() => expect(form.field('name').error).toBe('Required'));
  });

  test('ValidationModes.onTouched validates on blur, then on subsequent changes', async () => {
    const form = createForm({
      defaultValues: { name: '' },
      validate: ValidationModes.onTouched,
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });
    const binding = form.wire('name');

    binding.onChange('');
    expect(form.field('name').error).toBeUndefined();

    binding.onBlur();
    await vi.waitFor(() => expect(form.field('name').error).toBe('Required'));

    binding.onChange('Alice');
    await vi.waitFor(() => expect(form.field('name').error).toBeUndefined());
  });

  test('inline validate config overrides preset', async () => {
    const form = createForm({
      defaultValues: { name: '' },
      validate: { validateOnBlur: false, validateOnChange: false },
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    form.wire('name').onChange('');

    expect(form.field('name').error).toBeUndefined();
  });

  test('debounce delays auto-validation trigger', async () => {
    vi.useFakeTimers();

    const form = createForm({
      defaultValues: { name: '' },
      validate: { debounce: 300, validateOnChange: true },
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });
    const binding = form.wire('name');

    binding.onChange('');

    // Error should not appear yet — debounce is pending.
    expect(form.field('name').error).toBeUndefined();

    await vi.runAllTimersAsync();

    expect(form.field('name').error).toBe('Required');

    vi.useRealTimers();
  });
});
