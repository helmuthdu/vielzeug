import type { FieldState, FlatKeyOf, Form, FormState, TypeAtPath } from '../index.js';

/**
 * Minimal `shallowRef` signature — matches `shallowRef` from `vue`.
 * Typed locally so this adapter has no hard dependency on the `vue` package.
 */
export type ShallowRefFn = <T>(value: T) => { value: T };

/**
 * Minimal `onScopeDispose` signature — matches `onScopeDispose` from `vue`.
 * Must be called from within an active Vue effect scope (inside `setup()` or a composable).
 */
export type OnScopeDisposeFn = (fn: () => void, failSilently?: boolean) => void;

/** A Vue-compatible readonly ref — a plain object with a reactive `.value`. */
export type VueReadonlyRef<T> = { readonly value: T };

/**
 * Explicit return type of {@link createForgeComposables}. Useful for annotating the
 * shared composables object exported from an app's `lib/form-composables.ts`.
 */
export type ForgeComposables = {
  useField<T extends Record<string, unknown>, K extends FlatKeyOf<T>>(
    form: Form<T>,
    name: K,
  ): VueReadonlyRef<FieldState<TypeAtPath<T, K>>>;
  useFormState<T extends Record<string, unknown>>(form: Form<T>): VueReadonlyRef<FormState>;
  useFormValues<T extends Record<string, unknown>>(form: Form<T>): VueReadonlyRef<T>;
};

/**
 * Creates Vue composables bound to the provided `shallowRef` and `onScopeDispose` functions.
 * Call once per application (typically in a shared module) and re-use the returned composables.
 *
 * @example
 * ```ts
 * // lib/form-composables.ts
 * import { onScopeDispose, shallowRef } from 'vue';
 * import { createForgeComposables } from '@vielzeug/forge/vue';
 *
 * export const { useFormState, useField, useFormValues } = createForgeComposables({ shallowRef, onScopeDispose });
 * ```
 */
export function createForgeComposables(deps: {
  onScopeDispose: OnScopeDisposeFn;
  shallowRef: ShallowRefFn;
}): ForgeComposables {
  const { onScopeDispose, shallowRef } = deps;

  return {
    /**
     * Vue composable — wraps a single field's {@link FieldState} in a reactive `shallowRef`.
     * Updates only when that specific field changes.
     * Auto-disposed when the enclosing scope is torn down.
     */
    useField<T extends Record<string, unknown>, K extends FlatKeyOf<T>>(
      form: Form<T>,
      name: K,
    ): VueReadonlyRef<FieldState<TypeAtPath<T, K>>> {
      const ref = shallowRef(form.field(name));
      const unsubscribe = form.subscribeField(name, (state) => {
        ref.value = state;
      });

      onScopeDispose(unsubscribe, true);

      return ref as VueReadonlyRef<FieldState<TypeAtPath<T, K>>>;
    },

    /**
     * Vue composable — wraps the full {@link FormState} in a reactive `shallowRef`.
     * Auto-disposed when the enclosing scope is torn down (component unmount, effectScope().stop()).
     */
    useFormState<T extends Record<string, unknown>>(form: Form<T>): VueReadonlyRef<FormState> {
      const ref = shallowRef(form.state);
      const unsubscribe = form.subscribe((state) => {
        ref.value = state;
      });

      onScopeDispose(unsubscribe, true);

      return ref as VueReadonlyRef<FormState>;
    },

    /**
     * Vue composable — wraps all form values in a reactive `shallowRef`.
     * Updates whenever any field value changes.
     * For single-field access prefer `useField`.
     * Auto-disposed when the enclosing scope is torn down.
     */
    useFormValues<T extends Record<string, unknown>>(form: Form<T>): VueReadonlyRef<T> {
      const ref = shallowRef(form.values());
      const unsubscribe = form.subscribe(() => {
        ref.value = form.values();
      });

      onScopeDispose(unsubscribe, true);

      return ref as VueReadonlyRef<T>;
    },
  };
}
