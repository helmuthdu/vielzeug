import { type ComputedSignal, type ReadonlySignal, type Signal, effect } from '@vielzeug/stateit';

import { currentRuntime } from './runtime-core';

/** @internal */
export const formCallbackRegistry = new WeakMap<HTMLElement, FormFieldCallbacks>();
/** @internal */
export const internalsRegistry = new WeakMap<HTMLElement, ElementInternals>();

/**
 * Callbacks that hook into form lifecycle events. Can be passed directly to defineField
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
  const ctor = host.constructor as typeof HTMLElement & { formAssociated?: boolean };

  if (!ctor.formAssociated) {
    throw new Error('[craftit:E8] defineField() requires define(..., { formAssociated: true, ... })');
  }

  const internals = internalsRegistry.get(host) ?? host.attachInternals();

  internalsRegistry.set(host, internals);

  const toFormValue = options.toFormValue ?? ((v: T) => (v == null ? '' : String(v)));

  effect(() => {
    internals.setFormValue(toFormValue(options.value.value));
  });

  const disabled = options.disabled;

  if (disabled) {
    effect(() => {
      if (disabled.value) {
        internals.states.add('disabled');
      } else {
        internals.states.delete('disabled');
      }
    });
  }

  if (callbacks) {
    formCallbackRegistry.set(host, { ...formCallbackRegistry.get(host), ...callbacks });
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
