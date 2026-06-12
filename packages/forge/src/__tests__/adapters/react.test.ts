import type { FormState } from '../../types';

import { createForgeHooks, type UseSyncExternalStoreFn } from '../../adapters/react';
import { createForm } from '../../index';

// Minimal synchronous mock: subscribes and immediately returns the snapshot.
const mockStore: UseSyncExternalStoreFn = <T>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => T,
): T => {
  subscribe(() => {});

  return getSnapshot();
};

const { useField, useFormState, useFormValues } = createForgeHooks(mockStore);

describe('/forge react adapter', () => {
  describe('useFormState', () => {
    test('returns the current FormState snapshot', () => {
      const form = createForm({ defaultValues: { name: 'Alice' } });
      const state = useFormState(form);

      expect(state.isValid).toBe(true);
      expect(state.isDirty).toBe(false);
      expect(state.isSubmitting).toBe(false);
    });

    test('getSnapshot function returns live state after mutations', () => {
      let capturedGetSnapshot!: () => FormState;
      const form = createForm({ defaultValues: { name: 'Alice' } });
      const hooks = createForgeHooks(<T>(sub: (fn: () => void) => () => void, snap: () => T): T => {
        capturedGetSnapshot = snap as () => FormState;
        sub(() => {});

        return snap();
      });

      hooks.useFormState(form);

      form.set('name', 'Bob');
      expect(capturedGetSnapshot().isDirty).toBe(true);
    });

    test('subscribe function notifies when form state changes', () => {
      let capturedSubscribe!: (fn: () => void) => () => void;
      const form = createForm({ defaultValues: { name: 'Alice' } });
      const hooks = createForgeHooks(<T>(sub: (fn: () => void) => () => void, snap: () => T): T => {
        capturedSubscribe = sub;
        sub(() => {});

        return snap();
      });

      hooks.useFormState(form);

      let notifications = 0;
      const unsub = capturedSubscribe(() => notifications++);

      form.set('name', 'Bob');
      expect(notifications).toBe(1);

      unsub();
      form.set('name', 'Charlie');
      expect(notifications).toBe(1);
    });
  });

  describe('useField', () => {
    test('returns the current FieldState for the named field', () => {
      const form = createForm({ defaultValues: { age: 30, name: 'Alice' } });
      const field = useField(form, 'name');

      expect(field.value).toBe('Alice');
      expect(field.dirty).toBe(false);
      expect(field.error).toBeUndefined();
      expect(field.touched).toBe(false);
    });

    test('getSnapshot reflects the live field value', () => {
      let capturedGetSnapshot!: () => { value: string };
      const form = createForm({ defaultValues: { name: 'Alice' } });
      const hooks = createForgeHooks(<T>(sub: (fn: () => void) => () => void, snap: () => T): T => {
        capturedGetSnapshot = snap as () => { value: string };
        sub(() => {});

        return snap();
      });

      hooks.useField(form, 'name');

      form.set('name', 'Bob');
      expect(capturedGetSnapshot().value).toBe('Bob');
    });

    test('subscribe only notifies when the subscribed field changes', () => {
      let capturedSubscribe!: (fn: () => void) => () => void;
      const form = createForm({ defaultValues: { age: 30, name: 'Alice' } });
      const hooks = createForgeHooks(<T>(sub: (fn: () => void) => () => void, snap: () => T): T => {
        capturedSubscribe = sub;
        sub(() => {});

        return snap();
      });

      hooks.useField(form, 'name');

      let notifications = 0;

      capturedSubscribe(() => notifications++);

      form.set('age', 31);
      expect(notifications).toBe(0);

      form.set('name', 'Bob');
      expect(notifications).toBe(1);
    });
  });

  describe('useFormValues', () => {
    test('returns the current values', () => {
      const form = createForm({ defaultValues: { age: 30, name: 'Alice' } });
      const vals = useFormValues(form);

      expect(vals).toEqual({ age: 30, name: 'Alice' });
    });
  });
});
