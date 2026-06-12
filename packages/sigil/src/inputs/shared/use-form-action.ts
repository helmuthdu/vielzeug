import type { ReadonlySignal } from '@vielzeug/craft';

import type { ButtonType } from '../../shared';

/**
 * Handles form submission relay for form-associated button-like components.
 *
 * The inner `<button>` always has `type="button"` so the shadow DOM never
 * drives native form actions directly. This composable intercepts clicks and
 * forwards submit/reset to the associated form via `ElementInternals`.
 *
 * @param form      - The associated HTMLFormElement (from `defineField().internals.form`).
 * @param type      - Reactive signal for the button `type` prop.
 * @param isDisabled - Reactive signal indicating whether the button is disabled/loading.
 * @param host       - The host custom element.
 * @returns A click handler to attach to the inner element.
 */
export function useFormAction(
  getForm: () => HTMLFormElement | null,
  type: ReadonlySignal<ButtonType | undefined>,
  isDisabled: ReadonlySignal<boolean>,
  host: HTMLElement,
): (e: MouseEvent) => void {
  return (e: MouseEvent) => {
    if (isDisabled.value) {
      e.preventDefault();
      e.stopImmediatePropagation();

      return;
    }

    const form = getForm();

    if (form) {
      if (type.value === 'submit') {
        e.preventDefault();
        form.requestSubmit();
      } else if (type.value === 'reset') {
        e.preventDefault();
        form.reset();
      }
    }

    // Re-dispatch if the native click didn't bubble to host (shadow DOM interop).
    if (!e.composedPath().includes(host)) {
      host.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
    }
  };
}
