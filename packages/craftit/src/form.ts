import { type ComputedSignal, type ReadonlySignal, type Signal } from '@vielzeug/stateit';

import { currentRuntime, effect } from './runtime';

// ─── Registries ───────────────────────────────────────────────────────────────
type FormAssociatedCallbacks = {
  formAssociated?: (form: HTMLFormElement | null) => void;
  formDisabled?: (disabled: boolean) => void;
  formReset?: () => void;
  formStateRestore?: (state: unknown, mode: 'autocomplete' | 'restore') => void;
};

export const formCallbackRegistry = new WeakMap<HTMLElement, FormAssociatedCallbacks>();
export const internalsRegistry = new WeakMap<HTMLElement, ElementInternals>();

export const setFormCallback = <K extends keyof FormAssociatedCallbacks>(
  key: K,
  fn: FormAssociatedCallbacks[K],
): void => {
  const el = currentRuntime().el;

  if (!formCallbackRegistry.has(el)) formCallbackRegistry.set(el, {});

  formCallbackRegistry.get(el)![key] = fn;
};

// ─── Public types ─────────────────────────────────────────────────────────────
/**
 * Callbacks that hook into form lifecycle events. Can be passed directly to {@link defineField}
 * as a second argument to keep all form logic co-located.
 */
export type FormFieldCallbacks = {
  onAssociated?: (form: HTMLFormElement | null) => void;
  onDisabled?: (disabled: boolean) => void;
  onReset?: () => void;
  onStateRestore?: (state: unknown, mode: 'autocomplete' | 'restore') => void;
};

export type FormFieldOptions<T = unknown> = {
  disabled?: Signal<boolean> | ReadonlySignal<boolean> | ComputedSignal<boolean>;
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

export const defineField = <T = unknown>(
  options: FormFieldOptions<T>,
  callbacks?: FormFieldCallbacks,
): FormFieldHandle => {
  const rt = currentRuntime();
  const host = rt.el;

  const internals = internalsRegistry.get(host) ?? host.attachInternals();

  internalsRegistry.set(host, internals);

  const toFormValue = options.toFormValue ?? ((v: T) => (v == null ? '' : String(v)));

  effect(() => {
    internals.setFormValue(toFormValue(options.value.value));
  });

  if (options.disabled) {
    effect(() => {
      if (options.disabled!.value) {
        internals.states.add('disabled');
      } else {
        internals.states.delete('disabled');
      }
    });
  }

  if (callbacks?.onReset) setFormCallback('formReset', callbacks.onReset);

  if (callbacks?.onAssociated) setFormCallback('formAssociated', callbacks.onAssociated);

  if (callbacks?.onDisabled) setFormCallback('formDisabled', callbacks.onDisabled);

  if (callbacks?.onStateRestore) setFormCallback('formStateRestore', callbacks.onStateRestore);

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
