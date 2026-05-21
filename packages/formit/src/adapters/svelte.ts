export * from '../index.js';

import type { FieldState, FlatKeyOf, Form, FormState, TypeAtPath } from '../index.js';

/**
 * Svelte readable store shape — compatible with Svelte's `$`-prefix auto-subscription.
 */
export type SvelteReadable<T> = {
  subscribe(run: (value: T) => void): () => void;
};

/**
 * Adapts a form's {@link FormState} to a Svelte readable store.
 *
 * The subscriber is called **immediately** with the current snapshot, then again on every
 * state change. This matches Svelte's store contract for `$`-prefix auto-subscription.
 *
 * @example
 * ```svelte
 * <script>
 *   import { createForm, formState } from '@vielzeug/formit/svelte';
 *
 *   const form = createForm({ defaultValues: { email: '' } });
 *   const state = formState(form);
 * </script>
 *
 * <button disabled={!$state.isValid || $state.isSubmitting}>Submit</button>
 * {#if $state.errors.email}<span>{$state.errors.email}</span>{/if}
 * ```
 */
export const formState = <T extends Record<string, unknown>>(form: Form<T>): SvelteReadable<FormState> => ({
  subscribe(run) {
    run(form.state);

    return form.subscribe((state) => run(state));
  },
});

/**
 * Adapts a single field's {@link FieldState} to a Svelte readable store.
 *
 * The subscriber is called **immediately** with the current field snapshot, then only when
 * that specific field changes — not on unrelated field changes. This matches Svelte's store
 * contract and keeps components granularly reactive.
 *
 * @example
 * ```svelte
 * <script>
 *   import { createForm, fieldStore } from '@vielzeug/formit/svelte';
 *
 *   const form = createForm({ defaultValues: { email: '', name: '' } });
 *   const email = fieldStore(form, 'email');
 * </script>
 *
 * <input
 *   bind:value={$email.value}
 *   on:blur={() => form.touch('email')}
 * />
 * {#if $email.touched && $email.error}<span>{$email.error}</span>{/if}
 * ```
 */
export const fieldStore = <T extends Record<string, unknown>, K extends FlatKeyOf<T>>(
  form: Form<T>,
  name: K,
): SvelteReadable<FieldState<TypeAtPath<T, K>>> => ({
  subscribe(run) {
    run(form.field(name));

    return form.subscribeField(name, (state) => run(state));
  },
});

/**
 * Adapts all form values to a Svelte readable store.
 * Triggers on every value change across any field.
 *
 * For single-field access, prefer {@link fieldStore} — it only re-runs subscribers when
 * that specific field changes.
 *
 * @example
 * ```svelte
 * <script>
 *   import { createForm, formValues } from '@vielzeug/formit/svelte';
 *
 *   const form = createForm({ defaultValues: { email: '', name: '' } });
 *   const values = formValues(form);
 * </script>
 *
 * <pre>{JSON.stringify($values, null, 2)}</pre>
 * ```
 */
export const formValues = <T extends Record<string, unknown>>(form: Form<T>): SvelteReadable<T> => ({
  subscribe(run) {
    run(form.values());

    return form.subscribe(() => run(form.values()));
  },
});
