import { computed, signal, type ReadonlySignal } from '@vielzeug/stateit';

import { createContext, inject, provide } from './context';

/**
 * A shared form context value, typically provided by a parent form component
 * and injected by child field components.
 */
export type FormContextValue = {
  /** Whether any field has been touched (interacted with). */
  readonly dirty: ReadonlySignal<boolean>;
  /**
   * Register a field's validity signal with the form context.
   * Returns a cleanup function.
   */
  registerField(validity: ReadonlySignal<boolean>): () => void;
  /** Reset all registered field values. */
  reset(): void;
  /** Submit the form programmatically. */
  submit(): void;
  /** Whether the form is currently submitting. */
  readonly submitting: ReadonlySignal<boolean>;
  /** Whether all fields in the form are valid. */
  readonly valid: ReadonlySignal<boolean>;
};

export const FORM_CONTEXT_KEY = createContext<FormContextValue>('craftit:form-context');

/**
 * Create a `FormContextValue` for coordinating form state across child field components.
 * Call `provide()` with the result to make it available to child components via `useFormContext`.
 *
 * @example
 * ```ts
 * define('my-form', {
 *   setup() {
 *     const form = createForm({ onSubmit: async (e) => { ... } });
 *     provide(FORM_CONTEXT_KEY, form);
 *     return html`<form @submit=${form.submit}><slot></slot></form>`;
 *   }
 * });
 * ```
 */
export function createForm(
  options: {
    onReset?: () => void;
    onSubmit?: (e?: Event) => void | Promise<void>;
  } = {},
): FormContextValue {
  const fieldValiditySignals = signal<Array<ReadonlySignal<boolean>>>([]);
  const submitting = signal(false);
  const dirty = signal(false);

  const valid = computed(() => fieldValiditySignals.value.every((s) => s.value));

  const submit = async (e?: Event): Promise<void> => {
    e?.preventDefault();

    if (submitting.value) return;

    submitting.value = true;

    try {
      await options.onSubmit?.(e);
    } finally {
      submitting.value = false;
    }
  };

  const reset = (): void => {
    dirty.value = false;
    options.onReset?.();
  };

  const registerField = (validity: ReadonlySignal<boolean>): (() => void) => {
    fieldValiditySignals.value = [...fieldValiditySignals.value, validity];

    return () => {
      fieldValiditySignals.value = fieldValiditySignals.value.filter((s) => s !== validity);
    };
  };

  return { dirty, registerField, reset, submit, submitting, valid };
}

/**
 * Inject the nearest `FormContextValue` from a parent form component.
 *
 * @example
 * ```ts
 * define('my-input', {
 *   setup(props) {
 *     const form = useFormContext();
 *     // form?.registerField(isValid);
 *   }
 * });
 * ```
 */
export function useFormContext(): FormContextValue | undefined {
  return inject(FORM_CONTEXT_KEY);
}

/**
 * Provide a form context to child components.
 *
 * @example
 * ```ts
 * const form = createForm({ onSubmit: handleSubmit });
 * provideFormContext(form);
 * ```
 */
export function provideFormContext(ctx: FormContextValue): void {
  provide(FORM_CONTEXT_KEY, ctx);
}
