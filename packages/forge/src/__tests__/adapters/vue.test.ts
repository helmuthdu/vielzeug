import {
  type OnScopeDisposeFn,
  type ShallowRefFn,
  init,
  useField,
  useFormState,
  useFormValues,
} from '../../adapters/vue';
import { createForm } from '../../index';

// Minimal shallowRef mock — plain mutable object, sufficient for tests.
const makeShallowRef: ShallowRefFn = <T>(value: T): { value: T } => ({ value });

// Silent onScopeDispose mock — ignores cleanup registrations.
const noopOnScopeDispose: OnScopeDisposeFn = () => {};

describe('/forge vue adapter', () => {
  beforeEach(() => {
    init({ onScopeDispose: noopOnScopeDispose, shallowRef: makeShallowRef });
  });

  describe('useFormState', () => {
    test('ref starts with the current FormState', () => {
      const form = createForm({ defaultValues: { name: 'Alice' } });
      const ref = useFormState(form);

      expect(ref.value.isValid).toBe(true);
      expect(ref.value.isDirty).toBe(false);
    });

    test('ref.value updates when form state changes', () => {
      const form = createForm({ defaultValues: { name: 'Alice' } });
      const ref = useFormState(form);

      form.set('name', 'Bob');
      expect(ref.value.isDirty).toBe(true);
    });

    test('onScopeDispose is called with the unsubscribe function', () => {
      const disposed: (() => void)[] = [];

      init({ onScopeDispose: (fn) => disposed.push(fn), shallowRef: makeShallowRef });

      const form = createForm({ defaultValues: { name: 'Alice' } });
      const ref = useFormState(form);

      expect(disposed).toHaveLength(1);

      // Invoking the dispose fn stops future ref updates
      disposed[0]();
      form.set('name', 'Bob');
      expect(ref.value.isDirty).toBe(false);
    });
  });

  describe('useField', () => {
    test('ref starts with the current FieldState', () => {
      const form = createForm({ defaultValues: { name: 'Alice' } });
      const ref = useField(form, 'name');

      expect(ref.value.value).toBe('Alice');
      expect(ref.value.dirty).toBe(false);
      expect(ref.value.error).toBeUndefined();
    });

    test('ref.value updates when the field changes', () => {
      const form = createForm({ defaultValues: { name: 'Alice' } });
      const ref = useField(form, 'name');

      form.set('name', 'Bob');
      expect(ref.value.value).toBe('Bob');
    });

    test('ref does not update when an unrelated field changes', () => {
      const form = createForm({ defaultValues: { age: 30, name: 'Alice' } });
      const ref = useField(form, 'name');
      const snapshotBefore = ref.value;

      form.set('age', 31);
      // ref.value is the same object reference — no subscription was triggered
      expect(ref.value).toBe(snapshotBefore);
    });

    test('onScopeDispose stops field updates', () => {
      const disposed: (() => void)[] = [];

      init({ onScopeDispose: (fn) => disposed.push(fn), shallowRef: makeShallowRef });

      const form = createForm({ defaultValues: { name: 'Alice' } });
      const ref = useField(form, 'name');

      disposed[0]();
      form.set('name', 'Bob');
      expect(ref.value.value).toBe('Alice');
    });
  });

  describe('useFormValues', () => {
    test('ref starts with the current values', () => {
      const form = createForm({ defaultValues: { age: 30, name: 'Alice' } });
      const ref = useFormValues(form);

      expect(ref.value).toEqual({ age: 30, name: 'Alice' });
    });

    test('ref.value updates when any field value changes', () => {
      const form = createForm({ defaultValues: { name: 'Alice' } });
      const ref = useFormValues(form);

      form.set('name', 'Bob');
      expect(ref.value.name).toBe('Bob');
    });

    test('onScopeDispose stops value updates', () => {
      const disposed: (() => void)[] = [];

      init({ onScopeDispose: (fn) => disposed.push(fn), shallowRef: makeShallowRef });

      const form = createForm({ defaultValues: { name: 'Alice' } });
      const ref = useFormValues(form);

      disposed[0]();
      form.set('name', 'Bob');
      expect(ref.value.name).toBe('Alice');
    });
  });

  test('throws if init() was not called', () => {
    init({
      onScopeDispose: null as unknown as OnScopeDisposeFn,
      shallowRef: null as unknown as ShallowRefFn,
    });

    const form = createForm({ defaultValues: { x: 1 } });

    expect(() => useFormState(form)).toThrow('[forge/vue]');
  });
});
