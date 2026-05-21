export * from '../index.js';

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

let _shallowRef: ShallowRefFn | undefined;
let _onScopeDispose: OnScopeDisposeFn | undefined;

/**
 * Registers Vue's `shallowRef` and `onScopeDispose` with this adapter.
 * Call once at your app's entry point before any composable uses the form hooks.
 *
 * @example
 * ```ts
 * // main.ts
 * import { onScopeDispose, shallowRef } from 'vue';
 * import { init } from '@vielzeug/formit/vue';
 *
 * init({ shallowRef, onScopeDispose });
 * ```
 */
export const init = (options: { onScopeDispose: OnScopeDisposeFn; shallowRef: ShallowRefFn }): void => {
  _shallowRef = options.shallowRef;
  _onScopeDispose = options.onScopeDispose;
};

function requireDeps(): { onScopeDispose: OnScopeDisposeFn; shallowRef: ShallowRefFn } {
  if (!_shallowRef || !_onScopeDispose) {
    throw new Error(
      '[formit/vue] Call init({ shallowRef, onScopeDispose }) once at your app entry before using form composables.',
    );
  }

  return { onScopeDispose: _onScopeDispose, shallowRef: _shallowRef };
}

/**
 * Vue composable — wraps the full {@link FormState} in a reactive `shallowRef`.
 * The ref's `.value` stays in sync with the form and is reactive in templates, `watch()`,
 * and `computed()`.
 *
 * The subscription is automatically disposed when the enclosing Vue scope is torn down
 * (component unmount, `effectScope().stop()`, etc.).
 *
 * Requires {@link init} to be called once before use.
 *
 * @example
 * ```ts
 * // main.ts — once, at app entry
 * import { onScopeDispose, shallowRef } from 'vue';
 * import { init } from '@vielzeug/formit/vue';
 * init({ shallowRef, onScopeDispose });
 *
 * // useMyForm.ts
 * import { createForm, useFormState } from '@vielzeug/formit/vue';
 *
 * export function useMyForm() {
 *   const form = createForm({ defaultValues: { email: '' } });
 *   const state = useFormState(form);
 *   return { form, state };
 * }
 * // In template: state.value.isValid, state.value.errors
 * ```
 */
export const useFormState = <T extends Record<string, unknown>>(form: Form<T>): VueReadonlyRef<FormState> => {
  const { onScopeDispose, shallowRef } = requireDeps();
  const ref = shallowRef(form.state);
  const unsubscribe = form.subscribe((state) => {
    ref.value = state;
  });

  onScopeDispose(unsubscribe, true);

  return ref as VueReadonlyRef<FormState>;
};

/**
 * Vue composable — wraps a single field's {@link FieldState} in a reactive `shallowRef`.
 * The ref updates only when that specific field changes — not on unrelated field changes.
 *
 * The subscription is automatically disposed when the enclosing Vue scope is torn down.
 *
 * Requires {@link init} to be called once before use.
 *
 * @example
 * ```ts
 * import { createForm, useField } from '@vielzeug/formit/vue';
 *
 * export function useMyForm() {
 *   const form = createForm({ defaultValues: { email: '' } });
 *   const emailField = useField(form, 'email');
 *   return { form, emailField };
 * }
 * // In template: emailField.value.value, emailField.value.error
 * ```
 */
export const useField = <T extends Record<string, unknown>, K extends FlatKeyOf<T>>(
  form: Form<T>,
  name: K,
): VueReadonlyRef<FieldState<TypeAtPath<T, K>>> => {
  const { onScopeDispose, shallowRef } = requireDeps();
  const ref = shallowRef(form.field(name));
  const unsubscribe = form.subscribeField(name, (state) => {
    ref.value = state;
  });

  onScopeDispose(unsubscribe, true);

  return ref as VueReadonlyRef<FieldState<TypeAtPath<T, K>>>;
};

/**
 * Vue composable — wraps all form values in a reactive `shallowRef`.
 * The ref updates whenever any field value changes.
 *
 * For reactive access to a single field, prefer {@link useField}.
 *
 * The subscription is automatically disposed when the enclosing Vue scope is torn down.
 *
 * Requires {@link init} to be called once before use.
 *
 * @example
 * ```ts
 * import { createForm, useFormValues } from '@vielzeug/formit/vue';
 *
 * export function useMyForm() {
 *   const form = createForm({ defaultValues: { email: '', name: '' } });
 *   const values = useFormValues(form);
 *   return { form, values };
 * }
 * // In template: values.value.email, values.value.name
 * ```
 */
export const useFormValues = <T extends Record<string, unknown>>(form: Form<T>): VueReadonlyRef<T> => {
  const { onScopeDispose, shallowRef } = requireDeps();
  const ref = shallowRef(form.values());
  const unsubscribe = form.subscribe(() => {
    ref.value = form.values();
  });

  onScopeDispose(unsubscribe, true);

  return ref as VueReadonlyRef<T>;
};
