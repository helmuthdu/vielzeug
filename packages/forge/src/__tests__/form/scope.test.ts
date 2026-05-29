import { createForm } from '../../index';

interface Address {
  city: string;
  street: string;
  zip: string;
}

interface UserValues {
  address: Address;
  billing: Address;
  name: string;
}

const defaults: UserValues = {
  address: { city: 'New York', street: '123 Main St', zip: '10001' },
  billing: { city: 'Boston', street: '456 Elm Ave', zip: '02101' },
  name: 'Alice',
};

describe('form.scope()', () => {
  test('get delegates to parent with prefixed path', () => {
    const form = createForm({ defaultValues: defaults });
    const address = form.scope('address');

    expect(address.get('city')).toBe(form.get('address.city'));
    expect(address.get('city')).toBe('New York');
  });

  test('set on scoped form updates the parent store', () => {
    const form = createForm({ defaultValues: defaults });
    const address = form.scope('address');

    address.set('city', 'Chicago');

    expect(form.get('address.city')).toBe('Chicago');
    expect(address.get('city')).toBe('Chicago');
  });

  test('values() returns only the scoped subset', () => {
    const form = createForm({ defaultValues: defaults });
    const address = form.scope('address');

    expect(address.values()).toEqual({ city: 'New York', street: '123 Main St', zip: '10001' });
  });

  test('values() reflects mutations applied via the scoped form', () => {
    const form = createForm({ defaultValues: defaults });
    const address = form.scope('address');

    address.set('city', 'Miami');

    expect(address.values()).toEqual({ city: 'Miami', street: '123 Main St', zip: '10001' });
  });

  test('field() returns scoped FieldState', () => {
    const form = createForm({ defaultValues: defaults });
    const address = form.scope('address');

    expect(address.field('city').value).toBe('New York');
    expect(address.field('city').dirty).toBe(false);
  });

  test('connect() on scoped form uses prefixed field name', () => {
    const form = createForm({ defaultValues: defaults });
    const address = form.scope('address');
    const binding = address.connect('city');

    expect(binding.value).toBe('New York');

    binding.onChange('Austin');

    expect(form.get('address.city')).toBe('Austin');
  });

  test('touch() on scoped form marks parent field as touched', () => {
    const form = createForm({ defaultValues: defaults });
    const address = form.scope('address');

    address.touch('city');

    expect(form.field('address.city').touched).toBe(true);
  });

  test('touchAll() on scoped form touches only scoped fields', () => {
    const form = createForm({ defaultValues: defaults });
    const address = form.scope('address');

    address.touchAll();

    // Scoped fields are touched
    expect(form.field('address.city').touched).toBe(true);
    expect(form.field('address.street').touched).toBe(true);
    expect(form.field('address.zip').touched).toBe(true);

    // Sibling scope and root fields are not touched
    expect(form.field('billing.city').touched).toBe(false);
    expect(form.field('name').touched).toBe(false);
  });

  test('validate() on scoped form validates only scoped fields', async () => {
    const form = createForm({
      defaultValues: defaults,
      validators: {
        'address.city': (v: unknown) => (!v ? 'City required' : undefined),
        name: (v: unknown) => (!v ? 'Name required' : undefined),
      },
    });

    form.set('address.city', '');
    form.set('name', '');

    const address = form.scope('address');
    const result = await address.validate();

    expect(result.errors['city']).toBe('City required');
    // Form-level name validator was not run
    expect(result.errors['name']).toBeUndefined();
    expect(form.field('name').error).toBeUndefined();
  });

  test('reset() on scoped form restores only scoped fields', () => {
    const form = createForm({ defaultValues: defaults });
    const address = form.scope('address');

    form.set('name', 'Bob');
    address.set('city', 'Seattle');
    address.set('street', '789 Pine Rd');

    address.reset();

    expect(form.get('address.city')).toBe('New York');
    expect(form.get('address.street')).toBe('123 Main St');
    // Non-scoped mutation preserved
    expect(form.get('name')).toBe('Bob');
  });

  test('state is shared with parent form', () => {
    const form = createForm({ defaultValues: defaults });
    const address = form.scope('address');

    address.set('city', 'Denver');

    expect(form.state.isDirty).toBe(true);
    expect(address.state).toBe(form.state);
  });

  test('subscribe on scoped form fires when scoped fields change', () => {
    const form = createForm({ defaultValues: defaults });
    const address = form.scope('address');

    let calls = 0;
    const unsub = address.subscribe(() => calls++);

    address.set('city', 'Denver');
    expect(calls).toBe(1);

    unsub();
    address.set('city', 'Phoenix');
    expect(calls).toBe(1);
  });

  test('dispose() on scoped form is a no-op — parent remains alive', () => {
    const form = createForm({ defaultValues: defaults });
    const address = form.scope('address');

    address.dispose();

    // Parent continues to work
    expect(() => form.set('name', 'Charlie')).not.toThrow();
    expect(form.get('name')).toBe('Charlie');
  });

  test('scope().scope() chains correctly', () => {
    const form = createForm({
      defaultValues: {
        org: {
          address: { city: 'Portland', street: '1 Oak St', zip: '97201' },
          name: 'Acme',
        },
      },
    });

    const orgAddress = form.scope('org').scope('address');

    expect(orgAddress.get('city')).toBe('Portland');

    orgAddress.set('city', 'Salem');

    expect(form.get('org.address.city')).toBe('Salem');
  });

  test('replace() on scoped form updates only scoped fields', () => {
    const form = createForm({ defaultValues: defaults });
    const address = form.scope('address');

    address.replace({ city: 'Tampa', street: '999 Bay Blvd', zip: '33601' });

    expect(form.get('address.city')).toBe('Tampa');
    expect(form.get('address.zip')).toBe('33601');
    // Non-scoped field unchanged
    expect(form.get('name')).toBe('Alice');
  });

  test('submit() on scoped form validates and returns scoped values', async () => {
    const form = createForm({ defaultValues: defaults });
    const address = form.scope('address');

    const result = await address.submit((vals) => vals);

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value).toEqual({ city: 'New York', street: '123 Main St', zip: '10001' });
    }
  });

  test('submit() on scoped form succeeds even when a sibling scope has errors', async () => {
    const form = createForm({
      defaultValues: { ...defaults, billing: { city: '' } },
      validators: {
        'billing.city': (v: unknown) => (!v ? 'Billing city required' : undefined),
      },
    });

    // Populate the sibling error
    await form.validateField('billing.city');
    expect(form.field('billing.city').error).toBe('Billing city required');

    // Scoped submit should not be blocked by the billing error
    const address = form.scope('address');
    const result = await address.submit((vals) => vals);

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value).toEqual({ city: 'New York', street: '123 Main St', zip: '10001' });
    }
  });

  test('submit() on scoped form returns only scoped errors on validation failure', async () => {
    const form = createForm({
      defaultValues: { ...defaults, billing: { city: '' } },
      validators: {
        'address.city': (v: unknown) => (!v ? 'City required' : undefined),
        'billing.city': (v: unknown) => (!v ? 'Billing city required' : undefined),
      },
    });

    // Pre-populate billing error
    await form.validateField('billing.city');

    // Trigger address.city error too
    const address = form.scope('address');

    address.set('city', '');

    const result = await address.submit(() => {});

    expect(result.ok).toBe(false);

    if (!result.ok) {
      // Only address-scoped errors, stripped of prefix
      expect(result.errors).toEqual({ city: 'City required' });
      expect('billing.city' in result.errors).toBe(false);
    }
  });

  test('validateFields() on scoped form returns relative keys and scoped valid flag', async () => {
    const form = createForm({
      defaultValues: defaults,
      validators: {
        'address.city': (v: unknown) => (!v ? 'City required' : undefined),
        'billing.city': (v: unknown) => (!v ? 'Billing city required' : undefined),
      },
    });

    // Pre-populate billing error so a non-scoped error exists
    form.set('billing.city', '');
    await form.validateField('billing.city');

    form.set('address.city', '');

    const address = form.scope('address');
    const result = await address.validateFields(['city']);

    // Key should be "city" not "address.city"
    expect(result.errors).toEqual({ city: 'City required' });
    // valid should reflect only scoped fields
    expect(result.valid).toBe(false);

    // Fix address.city — valid should now be true even though billing.city has an error
    address.set('city', 'New York');

    const result2 = await address.validateFields(['city']);

    expect(result2.valid).toBe(true);
    expect(result2.errors).toEqual({});
  });

  // ─── Error isolation ──────────────────────────────────────────────────────

  test('validate() errors do not include pre-existing errors from sibling scopes', async () => {
    const form = createForm({
      defaultValues: defaults,
      validators: {
        'address.city': (v: unknown) => (!v ? 'City required' : undefined),
        'billing.city': (v: unknown) => (!v ? 'Billing city required' : undefined),
      },
    });

    // Trigger a billing error first
    form.set('billing.city', '');
    await form.validateField('billing.city');
    expect(form.field('billing.city').error).toBe('Billing city required');

    // Now validate the address scope — billing error must not appear
    form.set('address.city', '');

    const address = form.scope('address');
    const result = await address.validate();

    expect(result.errors['city']).toBe('City required');
    expect(result.errors['billing.city']).toBeUndefined();
    expect(Object.keys(result.errors)).toEqual(['city']);
  });

  test('validate() valid flag reflects only scoped fields', async () => {
    const form = createForm({
      defaultValues: defaults,
      validators: {
        'address.city': (v: unknown) => (!v ? 'City required' : undefined),
        name: (v: unknown) => (!v ? 'Name required' : undefined),
      },
    });

    // Put an error on a non-scoped field
    form.set('name', '');
    await form.validateField('name');
    expect(form.field('name').error).toBe('Name required');

    // Address fields are all valid — scoped validate() should return valid=true
    const address = form.scope('address');
    const result = await address.validate();

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  test('validate() valid=false only when scoped fields themselves have errors', async () => {
    const form = createForm({
      defaultValues: defaults,
      validators: {
        'address.city': (v: unknown) => (!v ? 'City required' : undefined),
      },
    });

    form.set('address.city', '');

    const result = await form.scope('address').validate();

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual({ city: 'City required' });
  });

  // ─── resetField / setValidator delegation ────────────────────────────────

  test('resetField() on scoped form restores the scoped field to baseline', () => {
    const form = createForm({ defaultValues: defaults });
    const address = form.scope('address');

    address.set('city', 'Portland');
    expect(form.get('address.city')).toBe('Portland');

    address.resetField('city');

    expect(form.get('address.city')).toBe('New York');
    expect(form.field('address.city').dirty).toBe(false);
  });

  test('setValidator() on scoped form registers validator under the prefixed key', async () => {
    const form = createForm({ defaultValues: defaults });
    const address = form.scope('address');

    address.setValidator('city', (v: unknown) => (!v ? 'City required' : undefined));

    form.set('address.city', '');
    await form.validateField('address.city');

    expect(form.field('address.city').error).toBe('City required');
  });

  test('setValidator() on scoped form with undefined removes the validator and clears error', async () => {
    const form = createForm({
      defaultValues: defaults,
      validators: { 'address.city': (v: unknown) => (!v ? 'City required' : undefined) },
    });

    form.set('address.city', '');
    await form.validateField('address.city');
    expect(form.field('address.city').error).toBe('City required');

    const address = form.scope('address');

    address.setValidator('city', undefined);

    expect(form.field('address.city').error).toBeUndefined();
  });
});
