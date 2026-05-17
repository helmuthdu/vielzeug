import { vi } from 'vitest';

import { createForm } from '../../index';

describe('form bind behavior', () => {
  test('binding getters reflect live field value and meta state', () => {
    const form = createForm({ defaultValues: { name: '' } });
    const binding = form.bind('name');

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

    form.bind('name', { touchOnBlur: false }).onBlur();

    expect(form.field('name').touched).toBe(false);
  });

  test('validateOnChange triggers validation from bind.onChange', async () => {
    const form = createForm({
      defaultValues: { name: '' },
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    form.bind('name', { validateOnChange: true }).onChange('');

    await vi.waitFor(() => expect(form.field('name').error).toBe('Required'));
  });

  test('validateOnTouch validates on change only after first blur', async () => {
    const form = createForm({
      defaultValues: { name: '' },
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });
    const binding = form.bind('name', { touchOnBlur: true, validateOnTouch: true });

    binding.onChange('');
    expect(form.field('name').error).toBeUndefined();

    binding.onBlur();
    binding.onChange('');

    await vi.waitFor(() => expect(form.field('name').error).toBe('Required'));
  });

  test('per-bind config overrides bindDefaults', async () => {
    const form = createForm({
      bindDefaults: { touchOnBlur: false, validateOnChange: false },
      defaultValues: { name: '' },
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    const binding = form.bind('name', { touchOnBlur: true, validateOnChange: true });

    binding.onBlur();
    binding.onChange('');

    expect(form.field('name').touched).toBe(true);
    await vi.waitFor(() => expect(form.field('name').error).toBe('Required'));
  });
});

describe('validation mode defaults', () => {
  test("mode 'onSubmit' does not validate on blur or change", async () => {
    const form = createForm({
      defaultValues: { name: '' },
      mode: 'onSubmit',
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });
    const binding = form.bind('name');

    binding.onBlur();
    binding.onChange('');

    expect(form.field('name').error).toBeUndefined();
  });

  test("mode 'onBlur' validates when field blurs", async () => {
    const form = createForm({
      defaultValues: { name: '' },
      mode: 'onBlur',
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    form.bind('name').onBlur();

    await vi.waitFor(() => expect(form.field('name').error).toBe('Required'));
  });

  test("mode 'onChange' validates on every change", async () => {
    const form = createForm({
      defaultValues: { name: '' },
      mode: 'onChange',
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    form.bind('name').onChange('');

    await vi.waitFor(() => expect(form.field('name').error).toBe('Required'));
  });

  test("mode 'onTouched' validates on blur, then on subsequent changes", async () => {
    const form = createForm({
      defaultValues: { name: '' },
      mode: 'onTouched',
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });
    const binding = form.bind('name');

    binding.onChange('');
    expect(form.field('name').error).toBeUndefined();

    binding.onBlur();
    await vi.waitFor(() => expect(form.field('name').error).toBe('Required'));

    binding.onChange('Alice');
    await vi.waitFor(() => expect(form.field('name').error).toBeUndefined());
  });

  test('explicit bindDefaults takes precedence over mode defaults', async () => {
    const form = createForm({
      bindDefaults: { validateOnBlur: false, validateOnChange: false },
      defaultValues: { name: '' },
      mode: 'onChange',
      validators: { name: (v: unknown) => (!v ? 'Required' : undefined) },
    });

    form.bind('name').onChange('');

    expect(form.field('name').error).toBeUndefined();
  });
});
