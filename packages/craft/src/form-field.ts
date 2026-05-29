import { type ReadonlySignal, type Signal } from '@vielzeug/ripple';

import { CRAFTIT_ERRORS } from './errors';
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
