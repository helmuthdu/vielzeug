import type { ComponentHost } from '@vielzeug/craftit';
import type { ReadonlySignal, Signal } from '@vielzeug/stateit';

import type { ComponentSize } from '../../types';

/**
 * Minimal shape of the handle returned by `createCheckable` that
 * `applyCheckableBinding` needs. Matches both checkbox (with `indeterminate`)
 * and switch (without).
 */
export type CheckableBindingHandle = {
  checked: Signal<boolean>;
  disabled: ReadonlySignal<boolean>;
  handleClick: (event: MouseEvent) => boolean;
  handleKeydown: (event: KeyboardEvent) => boolean;
  indeterminate?: Signal<boolean>;
};

/**
 * Applies the standard host bindings shared by all checkable components
 * (checkbox, switch, radio \u2026).
 *
 * Wires `checked`, `size`, `tabindex`, the `is-checked`/`is-disabled` classes,
 * and the `click`/`keydown` event handlers.  Pass `handle.indeterminate` for
 * components that need it (checkbox); omit it for switch/radio.
 */
export const applyCheckableBinding = (
  host: ComponentHost,
  fCtxSize: ReadonlySignal<ComponentSize | undefined>,
  handle: CheckableBindingHandle,
): void => {
  const { checked, disabled, handleClick, handleKeydown, indeterminate } = handle;

  host.bind({
    attr: {
      ...(indeterminate !== undefined && { indeterminate }),
      checked,
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
