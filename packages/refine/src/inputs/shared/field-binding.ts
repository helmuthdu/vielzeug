import type { Readable, Signal } from '@vielzeug/ripple';

import { bind } from '@vielzeug/ore';

import type { ComponentSize } from '../../types';

/**
 * Minimal shape of the handle returned by `createCheckable` that
 * `applyCheckableBinding` needs. Matches both checkbox (with `indeterminate`)
 * and switch (without).
 */
export type CheckableBindingHandle = {
  assistiveId: string;
  checked: Signal<boolean>;
  disabled: Readable<boolean>;
  errorText: Readable<string>;
  handleClick: (event: MouseEvent) => boolean;
  handleKeydown: (event: KeyboardEvent) => boolean;
  helperText: Readable<string>;
  indeterminate?: Signal<boolean>;
  labelId: string;
  /** Reflects `aria-required` — there's no native form control here to carry a real `required` attribute. */
  required?: Readable<boolean | undefined>;
};

/**
 * `prop.string()` already reflects `error`'s raw value as an attribute, but that leaves the
 * attribute present-but-empty (`error=""`) once set instead of removing it — this normalizes
 * an empty error back to "no attribute at all". Shared by every text-field component
 * (`ore-input`, `ore-textarea`, `ore-message-composer`) since `bind()`'s own `error` writer
 * needs a derived getter, not the raw prop, to get that behavior.
 *
 * @example
 * ```ts
 * bind({ attr: { error: errorAttr(errorText), size: fCtxProps.size, variant: fCtxProps.variant } });
 * ```
 */
export const errorAttr = (errorText: Readable<string>): (() => string | undefined) => {
  return () => errorText.value || undefined;
};

/**
 * Applies the standard host bindings shared by all checkable components
 * (checkbox, switch, radio).
 *
 * Wires `role`, all ARIA attributes, `checked`, `size`, `tabindex`, the
 * `is-checked`/`is-disabled` classes, and the `click`/`keydown` event handlers.
 *
 * Pass `handle.indeterminate` for components that need it (checkbox);
 * omit it for switch/radio.
 */
export const applyCheckableBinding = (
  fCtxSize: Readable<ComponentSize | undefined>,
  handle: CheckableBindingHandle,
  role: 'checkbox' | 'radio' | 'switch',
): void => {
  const {
    assistiveId,
    checked,
    disabled,
    errorText,
    handleClick,
    handleKeydown,
    helperText,
    indeterminate,
    labelId,
    required,
  } = handle;

  bind({
    attr: {
      ...(indeterminate !== undefined && { indeterminate }),
      ariaChecked: () => {
        if (role === 'checkbox' && indeterminate?.value) return 'mixed';

        return checked.value ? 'true' : 'false';
      },
      ariaDescribedby: () => (errorText.value || helperText.value ? assistiveId : null),
      ariaDisabled: () => (disabled.value ? 'true' : null),
      ariaInvalid: () => (errorText.value ? 'true' : null),
      ariaLabelledby: labelId,
      ariaRequired: () => (required?.value ? 'true' : null),
      checked,
      role,
      size: fCtxSize,
      tabindex: () => (disabled.value ? undefined : 0),
    },
    class: () => ({
      'is-checked': checked.value,
      'is-disabled': disabled.value,
      ...(indeterminate !== undefined && { 'is-indeterminate': indeterminate.value }),
    }),
    on: {
      click: handleClick,
      keydown: handleKeydown,
    },
  });
};
