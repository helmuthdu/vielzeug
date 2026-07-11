import { type Readable, type Signal } from '@vielzeug/ripple';

import { warn } from '../_dev';
import { OreApiError, ORE_ERRORS } from '../errors';
import { getHost, onCleanup, onFormReset, watchEffect } from '../runtime';

/** @internal */
const internalsRegistry = new WeakMap<HTMLElement, ElementInternals>();

export type FormFieldOptions<T = unknown> = {
  disabled?: Readable<boolean>;
  /**
   * The host element to attach `ElementInternals` to.
   * Defaults to the element currently being set up via `getHost()`.
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
  /**
   * Called when the ancestor `<form>` is reset (see `onFormReset`). Use to restore
   * whatever local state backs `value` — `useField` itself owns no field state to reset.
   */
  onReset?: () => void;
  toFormValue?: (value: T) => File | FormData | string | null;
  /**
   * Recomputed reactively and passed straight to `internals.setValidity()` — `null`
   * (or omitting `validity` entirely) means always valid. Pair with `validationMessage`.
   *
   * @example
   * ```ts
   * validity: computed(() => (required.value && isBlank(value.value)) ? { valueMissing: true } : null),
   * validationMessage: computed(() => (required.value && isBlank(value.value)) ? 'Required.' : ''),
   * ```
   */
  validationMessage?: Readable<string>;
  validity?: Readable<ValidityStateFlags | null>;
  value: Signal<T> | Readable<T>;
};

export type FormFieldHandle = {
  checkValidity: () => boolean;
  readonly internals: ElementInternals;
  reportValidity: () => boolean;
  setCustomValidity: (message: string) => void;
  setValidity: ElementInternals['setValidity'];
};

export const useField = <T = unknown>(options: FormFieldOptions<T>): FormFieldHandle => {
  const host = options.el ?? getHost();
  const ctor = host.constructor as typeof HTMLElement & { formAssociated?: boolean };

  if (!ctor.formAssociated) {
    throw new OreApiError(ORE_ERRORS.defineFieldRequiresFormAssociated(host.localName));
  }

  if (internalsRegistry.has(host)) {
    throw new OreApiError(`useField() was already called on <${host.localName}>. Call it only once per component.`);
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

  watchEffect(() => {
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

      watchEffect(() => {
        if (disabled.value) states.add('disabled');
        else states.delete('disabled');
      });
    }
  }

  if (options.validity) {
    watchEffect(() => {
      const flags = options.validity?.value ?? {};
      // Per spec, ElementInternals.setValidity() throws if any flag is true and message is
      // empty — a caller-supplied `validity` with no matching `validationMessage` would crash
      // this effect in a real browser. Fail safe with a generic message instead of propagating
      // that crash, and say so loudly in dev so the real fix (pass validationMessage) gets made.
      const hasFlag = Object.values(flags).some(Boolean);
      const message = options.validationMessage?.value ?? '';

      if (hasFlag && !message) {
        warn(
          'useField(): `validity` has a truthy flag but `validationMessage` is empty — internals.setValidity() ' +
            'requires a non-empty message whenever any flag is true. Falling back to a generic message; pass ' +
            '`validationMessage` to customize it.',
        );
        internals.setValidity(flags, 'Invalid value.');

        return;
      }

      internals.setValidity(flags, message);
    });
  }

  if (options.onReset) onFormReset(options.onReset);

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
