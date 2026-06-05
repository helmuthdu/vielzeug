import type { HostBindFn } from '@vielzeug/craft';
import type { ReadonlySignal, Signal } from '@vielzeug/ripple';

import type { ErrorHelperState } from '../../headless';
import type { ComponentSize } from '../../types';

/**
 * Minimal shape of the handle returned by `createCheckable` that
 * `applyCheckableBinding` needs. Matches both checkbox (with `indeterminate`)
 * and switch (without).
 */
export type CheckableBindingHandle = {
  assistive: ReadonlySignal<ErrorHelperState>;
  assistiveId: string;
  checked: Signal<boolean>;
  disabled: ReadonlySignal<boolean>;
  handleClick: (event: MouseEvent) => boolean;
  handleKeydown: (event: KeyboardEvent) => boolean;
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
  fCtxSize: ReadonlySignal<ComponentSize | undefined>,
  handle: CheckableBindingHandle,
  role: 'checkbox' | 'radio' | 'switch',
): void => {
  const { assistive, assistiveId, checked, disabled, handleClick, handleKeydown, indeterminate, labelId } = handle;

  bind({
    attr: {
      ...(indeterminate !== undefined && { indeterminate }),
      ariaChecked: () => {
        if (role === 'checkbox' && indeterminate?.value) return 'mixed';

        return checked.value ? 'true' : 'false';
      },
      ariaDescribedby: () => (assistive.value.errorText || assistive.value.helperText ? assistiveId : null),
      ariaDisabled: () => (disabled.value ? 'true' : null),
      ariaInvalid: () => (assistive.value.errorText ? 'true' : null),
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
