import { signal, type ReadonlySignal, type Signal } from '@vielzeug/stateit';

import { CRAFTIT_ERRORS } from './errors';
import { createContext, inject, provide } from './context';
import { getCurrentElement, effect } from './runtime';

/** @internal */
const internalsRegistry = new WeakMap<HTMLElement, ElementInternals>();

export type FormFieldOptions<T = unknown> = {
  disabled?: ReadonlySignal<boolean>;
  toFormValue?: (value: T) => File | FormData | string | null;
  value: Signal<T> | ReadonlySignal<T>;
};

export type FormFieldHandle = {
  checkValidity: () => boolean;
  readonly internals: ElementInternals;
  reportValidity: () => boolean;
  setCustomValidity: (message: string) => void;
  setValidity: ElementInternals['setValidity'];
};

export const defineField = <T = unknown>(options: FormFieldOptions<T>): FormFieldHandle => {
  const host = getCurrentElement();
  const ctor = host.constructor as typeof HTMLElement & { formAssociated?: boolean };

  if (!ctor.formAssociated) {
    throw new Error(CRAFTIT_ERRORS.defineFieldRequiresFormAssociated(host.localName));
  }

  const internals = internalsRegistry.get(host) ?? host.attachInternals();

  internalsRegistry.set(host, internals);

  const toFormValue =
    options.toFormValue ??
    ((v: T): File | FormData | string | null => {
      if (v == null) return null;

      if (v instanceof File || v instanceof FormData) return v;

      return String(v);
    });

  effect(() => {
    internals.setFormValue(toFormValue(options.value.value));
  });

  const disabled = options.disabled;

  if (disabled) {
    const states = internals.states as CustomStateSet;

    effect(() => {
      if (disabled.value) states.add('disabled');
      else states.delete('disabled');
    });
  }

  const checkValidity = () => internals.checkValidity();
  const reportValidity = () => internals.reportValidity();
  const setCustomValidity = (message: string) =>
    message ? internals.setValidity({ customError: true }, message) : internals.setValidity({});

  return {
    checkValidity,
    internals,
    reportValidity,
    setCustomValidity,
    setValidity: internals.setValidity.bind(internals),
  };
};

// ─── Form context (multi-field coordination) ─────────────────────────────────

/**
 * A shared form context value, typically provided by a parent form component
 * and injected by child field components.
 */
export type FormContextValue = {
  /** Whether all fields in the form are valid. */
  readonly valid: ReadonlySignal<boolean>;
  /** Whether the form is currently submitting. */
  readonly submitting: ReadonlySignal<boolean>;
  /** Whether any field has been touched (interacted with). */
  readonly dirty: ReadonlySignal<boolean>;
  /** Submit the form programmatically. */
  submit(): void;
  /** Reset all registered field values. */
  reset(): void;
  /**
   * Register a field's validity signal with the form context.
   * Returns a cleanup function.
   */
  registerField(validity: ReadonlySignal<boolean>): () => void;
};

const FORM_CONTEXT_KEY = createContext<FormContextValue>('craftit:form-context');

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
export function createForm(options: {
  onSubmit?: (e?: Event) => void | Promise<void>;
  onReset?: () => void;
} = {}): FormContextValue {
  const fieldValiditySignals: Array<ReadonlySignal<boolean>> = [];
  const submitting = signal(false);
  const dirty = signal(false);

  const valid: ReadonlySignal<boolean> = {
    get value() {
      return fieldValiditySignals.every((s) => s.value);
    },
  } as ReadonlySignal<boolean>;

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
    fieldValiditySignals.push(validity);
    dirty.value = true;

    return () => {
      const idx = fieldValiditySignals.indexOf(validity);

      if (idx !== -1) fieldValiditySignals.splice(idx, 1);
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

export { FORM_CONTEXT_KEY };
