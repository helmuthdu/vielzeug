import { type UseSyncExternalStoreFn, init, useField, useFormState, useFormValues } from '../../adapters/react';
import { createForm } from '../../index';

// Minimal synchronous mock: subscribes (retaining the unsub handle) and returns the snapshot.
const mockStore: UseSyncExternalStoreFn = <T>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => T,
): T => {
  subscribe(() => {});

  return getSnapshot();
};

describe('/forge react adapter', () => {
  beforeEach(() => {
    init(mockStore);
  });

  describe('useFormState', () => {
    test('returns the current FormState snapshot', () => {
      const form = createForm({ defaultValues: { name: 'Alice' } });
      const state = useFormState(form);

      expect(state.isValid).toBe(true);
      expect(state.isDirty).toBe(false);
      expect(state.isSubmitting).toBe(false);
    });

    test('getSnapshot function returns live state after mutations', () => {
      let capturedGetSnapshot!: () => ReturnType<typeof form.state>;
      const form = createForm({ defaultValues: { name: 'Alice' } });

      init(<T>(sub: (fn: () => void) => () => void, snap: () => T): T => {
        capturedGetSnapshot = snap as () => ReturnType<typeof form.state>;
        sub(() => {});

        return snap();
      });

      useFormState(form);

      form.set('name', 'Bob');
      expect(capturedGetSnapshot().isDirty).toBe(true);
    });

    test('subscribe function notifies when form state changes', () => {
      let capturedSubscribe!: (fn: () => void) => () => void;
      const form = createForm({ defaultValues: { name: 'Alice' } });

      init(<T>(sub: (fn: () => void) => () => void, snap: () => T): T => {
        capturedSubscribe = sub;
        sub(() => {});

        return snap();
      });

      useFormState(form);

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

      init(<T>(sub: (fn: () => void) => () => void, snap: () => T): T => {
        capturedGetSnapshot = snap as () => { value: string };
        sub(() => {});

        return snap();
      });

      useField(form, 'name');

      form.set('name', 'Bob');
      expect(capturedGetSnapshot().value).toBe('Bob');
    });

    test('subscribe only notifies when the subscribed field changes', () => {
      let capturedSubscribe!: (fn: () => void) => () => void;
      const form = createForm({ defaultValues: { age: 30, name: 'Alice' } });

      init(<T>(sub: (fn: () => void) => () => void, snap: () => T): T => {
        capturedSubscribe = sub;
        sub(() => {});

        return snap();
      });

      useField(form, 'name');

      let notifications = 0;

      capturedSubscribe(() => notifications++);

      form.set('age', 31); // different field — no notification
      expect(notifications).toBe(0);

      form.set('name', 'Bob'); // subscribed field — notified
      expect(notifications).toBe(1);
    });
  });

  describe('useFormValues', () => {
    test('returns the current values object', () => {
      const form = createForm({ defaultValues: { age: 30, name: 'Alice' } });
      const values = useFormValues(form);

      expect(values).toEqual({ age: 30, name: 'Alice' });
    });

    test('getSnapshot reflects live values', () => {
      let capturedGetSnapshot!: () => { name: string };
      const form = createForm({ defaultValues: { name: 'Alice' } });

      init(<T>(sub: (fn: () => void) => () => void, snap: () => T): T => {
        capturedGetSnapshot = snap as () => { name: string };
        sub(() => {});

        return snap();
      });

      useFormValues(form);

      form.set('name', 'Bob');
      expect(capturedGetSnapshot().name).toBe('Bob');
    });
  });

  test('throws if init() was not called', () => {
    // Force-clear the internal reference by injecting undefined via a type cast
    init(undefined as unknown as UseSyncExternalStoreFn);

    const form = createForm({ defaultValues: { x: 1 } });

    expect(() => useFormState(form)).toThrow('[forge/react]');
  });
});
