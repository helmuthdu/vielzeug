import { type ReadonlySignal, type Signal } from '@vielzeug/ripple';

import { warn } from './_warn';
import { CRAFT_ERRORS } from './errors';
import { effect, getCurrentElement, onCleanup } from './runtime';

/** @internal */
const internalsRegistry = new WeakMap<HTMLElement, ElementInternals>();

export type FormFieldOptions<T = unknown> = {
  disabled?: ReadonlySignal<boolean>;
  /**
   * The host element to attach `ElementInternals` to.
   * Defaults to the element currently being set up via `getCurrentElement()`.
   * Pass this explicitly when calling `useField` from a composable that is
   * not called directly during `setup()` (e.g. a helper factory function).
   */
  el?: HTMLElement;
  /**
   * When `true`, a `null` or `undefined` value is submitted as an empty string
   * (`''`) instead of `null`. This keeps the field's key present in `FormData`
   * even when the value is absent — useful when the server expects the field to
   * always be included.
   *
   * @default false
   */
  emptyStringForNull?: boolean;
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

export const useField = <T = unknown>(options: FormFieldOptions<T>): FormFieldHandle => {
  const host = options.el ?? getCurrentElement();
  const ctor = host.constructor as typeof HTMLElement & { formAssociated?: boolean };

  if (!ctor.formAssociated) {
    throw new Error(CRAFT_ERRORS.defineFieldRequiresFormAssociated(host.localName));
  }

  if (internalsRegistry.has(host)) {
    throw new Error(`useField() was already called on <${host.localName}>. Call it only once per component.`);
  }

  const internals = host.attachInternals();

  internalsRegistry.set(host, internals);
  onCleanup(() => internalsRegistry.delete(host));

  const toFormValue =
    options.toFormValue ??
    ((v: T): File | FormData | string | null => {
      if (v == null) return options.emptyStringForNull ? '' : null;

      if (v instanceof File || v instanceof FormData) return v;

      return String(v);
    });

  effect(() => {
    internals.setFormValue(toFormValue(options.value.value));
  });

  const disabled = options.disabled;

  if (disabled) {
    if (!('states' in internals)) {
      warn(
        'useField(): ElementInternals.states (CustomStateSet) is not available in this environment — disabled state tracking skipped.',
      );
    } else {
      const states = internals.states as CustomStateSet;

      effect(() => {
        if (disabled.value) states.add('disabled');
        else states.delete('disabled');
      });
    }
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
