import type { FieldState, FormState } from '../../index';

import { fieldStore, formState, formValues } from '../../adapters/svelte';
import { createForm } from '../../index';

describe('/forge svelte adapter', () => {
  describe('formState', () => {
    test('subscriber is called immediately with the current FormState', () => {
      const form = createForm({ defaultValues: { name: 'Alice' } });
      const store = formState(form);

      let received: FormState | undefined;
      const unsub = store.subscribe((s) => {
        received = s;
      });

      expect(received).toBeDefined();
      expect(received!.isValid).toBe(true);
      expect(received!.isDirty).toBe(false);
      unsub();
    });

    test('subscriber is called when form state changes', () => {
      const form = createForm({ defaultValues: { name: 'Alice' } });
      const store = formState(form);

      const states: FormState[] = [];
      const unsub = store.subscribe((s) => states.push(s));

      states.length = 0; // clear the initial emission

      form.set('name', 'Bob');
      expect(states).toHaveLength(1);
      expect(states[0].isDirty).toBe(true);
      unsub();
    });

    test('unsubscribe stops future notifications', () => {
      const form = createForm({ defaultValues: { name: 'Alice' } });
      const store = formState(form);

      let calls = 0;
      const unsub = store.subscribe(() => calls++);

      calls = 0;

      unsub();
      form.set('name', 'Bob');
      expect(calls).toBe(0);
    });
  });

  describe('fieldStore', () => {
    test('subscriber is called immediately with the current FieldState', () => {
      const form = createForm({ defaultValues: { name: 'Alice' } });
      const store = fieldStore(form, 'name');

      let received: FieldState<string> | undefined;
      const unsub = store.subscribe((s) => {
        received = s as FieldState<string>;
      });

      expect(received?.value).toBe('Alice');
      expect(received?.dirty).toBe(false);
      unsub();
    });

    test('subscriber is called when the watched field changes', () => {
      const form = createForm({ defaultValues: { name: 'Alice' } });
      const store = fieldStore(form, 'name');

      const values: string[] = [];
      const unsub = store.subscribe((s) => values.push((s as FieldState<string>).value));

      values.length = 0; // clear initial

      form.set('name', 'Bob');
      form.set('name', 'Charlie');
      expect(values).toEqual(['Bob', 'Charlie']);
      unsub();
    });

    test('subscriber is NOT called when an unrelated field changes', () => {
      const form = createForm({ defaultValues: { age: 30, name: 'Alice' } });
      const store = fieldStore(form, 'name');

      let calls = 0;
      const unsub = store.subscribe(() => calls++);

      calls = 0; // clear initial

      form.set('age', 31);
      expect(calls).toBe(0);

      form.set('name', 'Bob');
      expect(calls).toBe(1);
      unsub();
    });

    test('unsubscribe stops field notifications', () => {
      const form = createForm({ defaultValues: { name: 'Alice' } });
      const store = fieldStore(form, 'name');

      let calls = 0;
      const unsub = store.subscribe(() => calls++);

      calls = 0;

      unsub();
      form.set('name', 'Bob');
      expect(calls).toBe(0);
    });

    test('subscriber receives updated error state', () => {
      const form = createForm({
        defaultValues: { email: '' },
        validators: { email: (v) => (v ? undefined : 'required') },
      });
      const store = fieldStore(form, 'email');

      let lastError: string | undefined = 'initial';
      const unsub = store.subscribe((s) => {
        lastError = (s as FieldState<string>).error;
      });

      form.setError('email', 'invalid email');
      expect(lastError).toBe('invalid email');
      unsub();
    });
  });

  describe('formValues', () => {
    test('subscriber is called immediately with the current values', () => {
      const form = createForm({ defaultValues: { age: 30, name: 'Alice' } });
      const store = formValues(form);

      let received: unknown;
      const unsub = store.subscribe((v) => {
        received = v;
      });

      expect(received).toEqual({ age: 30, name: 'Alice' });
      unsub();
    });

    test('subscriber is called when any field value changes', () => {
      const form = createForm({ defaultValues: { name: 'Alice' } });
      const store = formValues(form);

      const snapshots: unknown[] = [];
      const unsub = store.subscribe((v) => snapshots.push(v));

      snapshots.length = 0; // clear initial

      form.set('name', 'Bob');
      expect(snapshots).toHaveLength(1);
      expect((snapshots[0] as { name: string }).name).toBe('Bob');
      unsub();
    });

    test('unsubscribe stops value notifications', () => {
      const form = createForm({ defaultValues: { name: 'Alice' } });
      const store = formValues(form);

      let calls = 0;
      const unsub = store.subscribe(() => calls++);

      calls = 0;

      unsub();
      form.set('name', 'Bob');
      expect(calls).toBe(0);
    });
  });
});
