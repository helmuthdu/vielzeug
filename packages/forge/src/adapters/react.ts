import type { FieldState, FlatKeyOf, Form, FormState, TypeAtPath } from '../index.js';

/**
 * `useSyncExternalStore` signature — typed locally so this adapter has no hard
 * dependency on the `react` package.
 */
export type UseSyncExternalStoreFn = <T>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => T,
) => T;

/**
 * Explicit return type of {@link createForgeHooks}. Useful for annotating the
 * shared hooks object exported from an app's `lib/form-hooks.ts`.
 */
export type ForgeHooks = {
  useField<T extends Record<string, unknown>, K extends FlatKeyOf<T>>(
    form: Form<T>,
    name: K,
  ): FieldState<TypeAtPath<T, K>>;
  useFormState<T extends Record<string, unknown>>(form: Form<T>): FormState;
  useFormValues<T extends Record<string, unknown>>(form: Form<T>): T;
};

/**
 * Creates React hooks bound to the provided `useSyncExternalStore` function.
 * Call once per application (typically in a shared module) and re-use the returned hooks.
 *
 * @example
 * ```ts
 * // lib/form-hooks.ts
 * import { useSyncExternalStore } from 'react';
 * import { createForgeHooks } from '@vielzeug/forge/react';
 *
 * export const { useFormState, useField, useFormValues } = createForgeHooks(useSyncExternalStore);
 * ```
 */
export function createForgeHooks(useSyncExternalStore: UseSyncExternalStoreFn): ForgeHooks {
  return {
    /**
     * React hook — subscribes to a single field's {@link FieldState}.
     * Re-renders only when that specific field's value, error, touched, or dirty state changes.
     */
    useField<T extends Record<string, unknown>, K extends FlatKeyOf<T>>(
      form: Form<T>,
      name: K,
    ): FieldState<TypeAtPath<T, K>> {
      return useSyncExternalStore(
        (cb) => form.subscribeField(name, () => cb()),
        () => form.field(name),
      );
    },

    /**
     * React hook — subscribes to the full {@link FormState}.
     * Re-renders when any part of the form state changes.
     * For single-field components prefer `useField` — it scopes re-renders to that one field.
     */
    useFormState<T extends Record<string, unknown>>(form: Form<T>): FormState {
      return useSyncExternalStore(
        (cb) => form.subscribe(() => cb()),
        () => form.state,
      );
    },

    /**
     * React hook — subscribes to the complete values object of the form.
     * Re-renders whenever any field value changes.
     * For single-field access prefer `useField`.
     */
    useFormValues<T extends Record<string, unknown>>(form: Form<T>): T {
      return useSyncExternalStore(
        (cb) => form.subscribe(() => cb()),
        () => form.values(),
      );
    },
  };
}
