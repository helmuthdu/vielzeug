export * from '../index.js';

import type { FieldState, FlatKeyOf, Form, FormState, TypeAtPath } from '../index.js';

/**
 * `useSyncExternalStore` signature — typed locally so this adapter has no hard
 * dependency on the `react` package.
 */
export type UseSyncExternalStoreFn = <T>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => T,
) => T;

let _useSyncExternalStore: UseSyncExternalStoreFn | undefined;

/**
 * Registers React's `useSyncExternalStore` with this adapter.
 * Call once at your app's entry point before any component uses the form hooks.
 *
 * @example
 * ```ts
 * // main.tsx
 * import { useSyncExternalStore } from 'react';
 * import { init } from '@vielzeug/formit/react';
 *
 * init(useSyncExternalStore);
 * ```
 */
export const init = (useSyncExternalStore: UseSyncExternalStoreFn): void => {
  _useSyncExternalStore = useSyncExternalStore;
};

function requireStore(): UseSyncExternalStoreFn {
  if (!_useSyncExternalStore) {
    throw new Error('[formit/react] Call init(useSyncExternalStore) once at your app entry before using form hooks.');
  }

  return _useSyncExternalStore;
}

/**
 * React hook — subscribes to the full {@link FormState}.
 * Re-renders the component whenever any part of the form state changes
 * (validity, errors, submission status, dirty/touched flags, etc.).
 *
 * For components that only need a single field, prefer {@link useField} —
 * it re-renders only when that specific field changes.
 *
 * Requires {@link init} to be called once before use.
 *
 * @example
 * ```tsx
 * // main.tsx — once, at app entry
 * import { useSyncExternalStore } from 'react';
 * import { init } from '@vielzeug/formit/react';
 * init(useSyncExternalStore);
 *
 * // SubmitButton.tsx
 * import { useFormState } from '@vielzeug/formit/react';
 *
 * function SubmitButton({ form }: { form: Form<MyValues> }) {
 *   const { isValid, isSubmitting } = useFormState(form);
 *   return <button disabled={!isValid || isSubmitting}>Submit</button>;
 * }
 * ```
 */
export const useFormState = <T extends Record<string, unknown>>(form: Form<T>): FormState => {
  const useSyncExternalStore = requireStore();

  return useSyncExternalStore(
    (onStoreChange) => form.subscribe(() => onStoreChange()),
    () => form.state,
  );
};

/**
 * React hook — subscribes to a single field's {@link FieldState}.
 * Re-renders only when that specific field's value, error, touched, or dirty state changes.
 *
 * Requires {@link init} to be called once before use.
 *
 * @example
 * ```tsx
 * import { useField } from '@vielzeug/formit/react';
 *
 * function EmailInput({ form }: { form: Form<{ email: string }> }) {
 *   const { dirty, error, touched, value } = useField(form, 'email');
 *   return (
 *     <>
 *       <input
 *         value={value}
 *         onBlur={() => form.touch('email')}
 *         onChange={(e) => form.set('email', e.target.value)}
 *       />
 *       {touched && error && <span>{error}</span>}
 *     </>
 *   );
 * }
 * ```
 */
export const useField = <T extends Record<string, unknown>, K extends FlatKeyOf<T>>(
  form: Form<T>,
  name: K,
): FieldState<TypeAtPath<T, K>> => {
  const useSyncExternalStore = requireStore();

  return useSyncExternalStore(
    (onStoreChange) => form.subscribeField(name, () => onStoreChange()),
    () => form.field(name),
  );
};

/**
 * React hook — subscribes to the complete values object of the form.
 * Re-renders whenever any field value changes.
 *
 * For components that only read a single field, prefer {@link useField} —
 * it scopes re-renders to that one field.
 *
 * Requires {@link init} to be called once before use.
 *
 * @example
 * ```tsx
 * import { useFormValues } from '@vielzeug/formit/react';
 *
 * function FormPreview({ form }: { form: Form<MyValues> }) {
 *   const values = useFormValues(form);
 *   return <pre>{JSON.stringify(values, null, 2)}</pre>;
 * }
 * ```
 */
export const useFormValues = <T extends Record<string, unknown>>(form: Form<T>): T => {
  const useSyncExternalStore = requireStore();

  return useSyncExternalStore(
    (onStoreChange) => form.subscribe(() => onStoreChange()),
    () => form.values(),
  );
};
