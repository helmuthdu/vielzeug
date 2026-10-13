import type { Readable, Signal } from '@vielzeug/ripple';

import { warn } from '../_dev';
import { ORE_ERRORS, OreApiError } from '../errors';
import { getHost, onCleanup, onFormReset, watchEffect } from '../runtime';

/** @internal */
const internalsRegistry = new WeakMap<HTMLElement, ElementInternals>();
/** @internal */
const activeFieldRegistry = new WeakSet<HTMLElement>();

/**
 * One field-validity state: the flags and the message travel together because
 * the platform's `setValidity()` contract couples them (flags without a
 * non-empty message throw). A single `{ flags, message } | null` input makes a
 * desynced pair unrepresentable, where the old split `validity` +
 * `validationMessage` options could drift apart.
 */
export type FormFieldValidity = { flags: ValidityStateFlags; message: string };

export type FormFieldOptions<T = unknown> = {
  disabled?: Readable<boolean>;
  /**
   * When `true`, a `null` or `undefined` value is submitted as an empty string
   * (`''`) instead of `null`. This keeps the field's key present in `FormData`
   * even when the value is absent: useful when the server expects the field to
   * always be included.
   *
   * @default false
   */
  emptyStringForNull?: boolean;
  /**
   * Called when the ancestor `<form>` is reset (see `onFormReset`). Use to restore
   * whatever local state backs `value`: `useField` itself owns no field state to reset.
   */
  onReset?: () => void;
  toFormValue?: (value: T) => File | FormData | string | null;
  /**
   * Recomputed reactively and passed straight to `internals.setValidity()`: `null`
   * (or omitting `validity` entirely) means always valid.
   *
   * @example
   * ```ts
   * validity: computed(() =>
   *   required.value && isBlank(value.value)
   *     ? { flags: { valueMissing: true }, message: 'Required.' }
   *     : null,
   * ),
   * ```
   */
  validity?: Readable<FormFieldValidity | null>;
  value: Signal<T> | Readable<T>;
};

export type FormFieldHandle = {
  checkValidity: () => boolean;
  readonly internals: ElementInternals;
  reportValidity: () => boolean;
  /**
   * Set (non-empty message) or clear (empty string) a custom validity error.
   * Guards the platform's throw-on-empty-message contract: prefer this over
   * calling `internals.setValidity` directly.
   */
  setCustomValidity: (message: string) => void;
};

export const useField = <T = unknown>(options: FormFieldOptions<T>): FormFieldHandle => {
  const host = getHost();
  const ctor = host.constructor as typeof HTMLElement & { formAssociated?: boolean };

  if (!ctor.formAssociated) {
    throw new OreApiError(ORE_ERRORS.defineFieldRequiresFormAssociated(host.localName));
  }

  if (activeFieldRegistry.has(host)) {
    throw new OreApiError(ORE_ERRORS.useFieldAlreadyCalled(host.localName));
  }

  // ElementInternals may only be attached once for an element's lifetime, while setup
  // legitimately runs again when a custom element is reconnected.
  const internals = internalsRegistry.get(host) ?? host.attachInternals();

  internalsRegistry.set(host, internals);
  activeFieldRegistry.add(host);
  onCleanup(() => activeFieldRegistry.delete(host));

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
        'useField(): ElementInternals.states (CustomStateSet) is not available in this environment: disabled state tracking skipped.',
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
      const state = options.validity?.value;

      if (!state) {
        internals.setValidity({});

        return;
      }

      // Per spec, ElementInternals.setValidity() throws if any flag is true and the
      // message is empty. The FormFieldValidity shape makes that state rare, but a
      // runtime empty string is still expressible: fall back to a generic message
      // instead of crashing this effect in a real browser.
      const hasFlag = Object.values(state.flags).some(Boolean);

      internals.setValidity(state.flags, hasFlag && !state.message ? 'Invalid value.' : state.message);
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
  };
};
