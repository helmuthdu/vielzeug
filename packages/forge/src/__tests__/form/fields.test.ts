import { createForm } from '../../index';

describe('form.fields.list()', () => {
  test('returns an empty array for a form with no populated fields and no validators', () => {
    const form = createForm();

    expect(form.fields.list()).toEqual([]);
  });

  test('returns the deduplicated union of populated store keys and validator keys', () => {
    const form = createForm({
      defaultValues: { age: 25, name: 'Alice' },
      validators: { name: (v: unknown) => (v ? undefined : 'Required') },
    });

    expect([...form.fields.list()].sort()).toEqual(['age', 'name']);
  });

  test('includes a key that has a validator but no value yet', () => {
    const form = createForm<Record<string, unknown>>({});

    form.fields.setValidator('email', (v: unknown) => (v ? undefined : 'Required'));

    expect(form.fields.list()).toEqual(['email']);
  });

  test('reflects dynamically registered and removed fields', () => {
    const form = createForm<Record<string, unknown>>({});

    const unregister = form.fields.register('phone', { defaultValue: '555' });

    expect(form.fields.list()).toEqual(['phone']);

    unregister();

    expect(form.fields.list()).toEqual([]);
  });

  test('flattens nested field paths into dot-notation', () => {
    const form = createForm({ defaultValues: { address: { city: 'NYC' } } });

    expect(form.fields.list()).toEqual(['address.city']);
  });

  test('returns a frozen readonly array', () => {
    const form = createForm({ defaultValues: { name: 'Alice' } });

    expect(Object.isFrozen(form.fields.list())).toBe(true);
  });

  test('remains callable and returns a valid snapshot after the form is disposed', () => {
    const form = createForm({ defaultValues: { name: 'Alice' } });

    form.dispose();

    expect(() => form.fields.list()).not.toThrow();
    expect(form.fields.list()).toEqual(['name']);
  });
});

describe('scope(prefix).fields.list()', () => {
  test('returns only that prefix keys, with the prefix stripped', () => {
    const form = createForm({
      defaultValues: { address: { city: 'NYC', zip: '10001' }, name: 'Alice' },
    });
    const address = form.scope('address');

    expect([...address.fields.list()].sort()).toEqual(['city', 'zip']);
  });

  test('returns [] for an empty scope', () => {
    const form = createForm({ defaultValues: { address: {}, name: 'Alice' } });
    const address = form.scope('address');

    expect(address.fields.list()).toEqual([]);
  });

  test('includes scoped fields that only have a validator registered', () => {
    const form = createForm<Record<string, unknown>>({ defaultValues: { address: { city: 'NYC' } } });
    const address = form.scope('address');

    address.fields.setValidator('zip', (v: unknown) => (v ? undefined : 'Required'));

    expect([...address.fields.list()].sort()).toEqual(['city', 'zip']);
  });

  test('does not include fields outside the scope prefix', () => {
    const form = createForm({ defaultValues: { address: { city: 'NYC' }, name: 'Alice' } });
    const address = form.scope('address');

    expect(address.fields.list()).not.toContain('name');
    expect(address.fields.list()).toEqual(['city']);
  });

  test('returns a frozen readonly array', () => {
    const form = createForm({ defaultValues: { address: { city: 'NYC' } } });
    const address = form.scope('address');

    expect(Object.isFrozen(address.fields.list())).toBe(true);
  });
});
