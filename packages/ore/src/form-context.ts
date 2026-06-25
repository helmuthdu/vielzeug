import { computed, type Readable, signal } from '@vielzeug/ripple';

import { createContext } from './context';

/**
 * Context shape injected by child field components.
 * Contains only what a field needs — not submit/error/status APIs.
 */
export type FormFieldContext = {
  /** Whether any field has been touched (interacted with). Set via markDirty(). */
  readonly dirty: Readable<boolean>;
  markDirty(): void;
  /**
   * Register a field's validity signal with the form context.
   * Returns a cleanup function.
   */
  registerField(validity: Readable<boolean>): () => void;
};

/**
 * Full form controller returned by `createFormContext`.
 * Extends `FormFieldContext` with submission and status APIs.
 */
export type FormController = FormFieldContext & {
  /**
   * Clear `dirty` and `error` status signals and invoke `onReset` if provided.
   * Note: this does not reset individual field values — pass an `onReset` callback
   * to handle value restoration.
   */
  clearStatus(): void;
  /** The last submit error, or null if the last submit succeeded. */
  readonly error: Readable<unknown>;
  /** Submit the form programmatically. */
  submit(e?: Event): Promise<void>;
  /** Whether the form is currently submitting. */
  readonly submitting: Readable<boolean>;
  /** Whether all fields in the form are valid. */
  readonly valid: Readable<boolean>;
};

export const FORM_CONTEXT_KEY = createContext<FormFieldContext>('ore:form-context');

/**
 * Create a `FormController` for coordinating form state across child field components.
 * Call `ctx.provide(FORM_CONTEXT_KEY, form)` to make it available to descendants.
 *
 * @example
 * ```ts
 * define('my-form', {
 *   setup(_props, ctx) {
 *     const form = createFormContext({ onSubmit: async (e) => { ... } });
 *     ctx.provide(FORM_CONTEXT_KEY, form);
 *     return html`<form @submit=${form.submit}><slot></slot></form>`;
 *   }
 * });
 * ```
 */
export function createFormContext(
  options: {
    onReset?: () => void;
    onSubmit?: (e?: Event) => void | Promise<void>;
  } = {},
): FormController {
  const fieldValiditySignals = signal<Array<Readable<boolean>>>([]);
  const submitting = signal(false);
  const dirty = signal(false);
  const error = signal<unknown>(null);

  // Note: [].every() is vacuously true, so valid is true when no fields are registered.
  // This is intentional — a form with no fields is considered valid (nothing to invalidate it).
  const valid = computed(() => fieldValiditySignals.value.every((s) => s.value));

  const submit = async (e?: Event): Promise<void> => {
    e?.preventDefault();

    if (submitting.value) return;

    submitting.value = true;
    error.value = null;

    try {
      await options.onSubmit?.(e);
      dirty.value = false;
    } catch (err) {
      error.value = err;
    } finally {
      submitting.value = false;
    }
  };

  const clearStatus = (): void => {
    dirty.value = false;
    error.value = null;
    options.onReset?.();
  };

  const markDirty = (): void => {
    dirty.value = true;
  };

  const registerField = (validity: Readable<boolean>): (() => void) => {
    fieldValiditySignals.value = [...fieldValiditySignals.value, validity];

    return () => {
      fieldValiditySignals.value = fieldValiditySignals.value.filter((s) => s !== validity);
    };
  };

  return { clearStatus, dirty, error, markDirty, registerField, submit, submitting, valid };
}
