import type { HostBindFn } from '@vielzeug/ore';
import type { Readable, Signal } from '@vielzeug/ripple';

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
  bind: HostBindFn,
  fCtxSize: Readable<ComponentSize | undefined>,
  handle: CheckableBindingHandle,
  role: 'checkbox' | 'radio' | 'switch',
): void => {
  const { assistiveId, checked, disabled, errorText, handleClick, handleKeydown, helperText, indeterminate, labelId } =
    handle;

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
