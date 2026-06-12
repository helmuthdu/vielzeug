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

      states.length = 0;

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

      values.length = 0;

      form.set('name', 'Bob');
      form.set('name', 'Charlie');
      expect(values).toEqual(['Bob', 'Charlie']);
      unsub();
    });

    test('subscriber is not called for unrelated field changes', () => {
      const form = createForm({ defaultValues: { a: 1, name: 'Alice' } });
      const store = fieldStore(form, 'name');

      let calls = 0;
      const unsub = store.subscribe(() => calls++);

      calls = 0;

      form.set('a', 2);
      expect(calls).toBe(0);
      unsub();
    });

    test('unsubscribe stops future notifications', () => {
      const form = createForm({ defaultValues: { name: 'Alice' } });
      const store = fieldStore(form, 'name');

      let calls = 0;
      const unsub = store.subscribe(() => calls++);

      calls = 0;
      unsub();
      form.set('name', 'Bob');
      expect(calls).toBe(0);
    });
  });

  describe('formValues', () => {
    test('subscriber is called immediately with the current values', () => {
      const form = createForm({ defaultValues: { name: 'Alice' } });
      const store = formValues(form);

      let received: Record<string, unknown> | undefined;
      const unsub = store.subscribe((v) => {
        received = v;
      });

      expect(received).toEqual({ name: 'Alice' });
      unsub();
    });

    test('subscriber is called when any field changes', () => {
      const form = createForm({ defaultValues: { name: 'Alice' } });
      const store = formValues(form);

      const snapshots: unknown[] = [];
      const unsub = store.subscribe((v) => snapshots.push(v));

      snapshots.length = 0;

      form.set('name', 'Bob');
      expect(snapshots).toHaveLength(1);
      unsub();
    });
  });
});
