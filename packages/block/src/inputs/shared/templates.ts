import type { ReadonlySignal } from '@vielzeug/ripple';

import { html } from '@vielzeug/craft';

import type { ErrorHelperState } from '../../headless';

/**
 * Renders the standard assistive text region (helper/error) used across all
 * field components. Encapsulates the repeated `aria-live`/`hidden` markup so
 * each component only passes the data.
 *
 * @param assistiveId - The stable ID shared with the ARIA `aria-describedby` attribute.
 * @param assistive   - Reactive assistive state from the field primitive.
 * @param setRef      - Optional callback to capture the container element (e.g. `checkable.setHelperEl`).
 */
export const renderHelperRegion = (
  assistiveId: string,
  assistive: ReadonlySignal<ErrorHelperState>,
  setRef?: (el: HTMLElement | null) => void,
) => {
  return html`<div
    class="helper-text"
    part="helper-text"
    id="${assistiveId}"
    :role="${() => (assistive.value.errorText ? 'alert' : null)}"
    aria-live="polite"
    ?hidden="${() => !assistive.value.errorText && !assistive.value.helperText}"
    ref=${(el: HTMLElement | null) => {
      setRef?.(el);
    }}>
    ${() => assistive.value.errorText || assistive.value.helperText}
  </div>`;
};
