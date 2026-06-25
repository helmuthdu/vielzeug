import type { Readable } from '@vielzeug/ripple';

import { html } from '@vielzeug/ore';

/**
 * Renders the standard assistive text region (helper/error) used across all
 * field components. Encapsulates the repeated `aria-live`/`hidden` markup so
 * each component only passes the data.
 *
 * @param assistiveId - The stable ID shared with the ARIA `aria-describedby` attribute.
 * @param errorText   - Reactive error text signal from the field primitive.
 * @param helperText  - Reactive helper text signal from the field primitive.
 * @param setRef      - Optional callback to capture the container element.
 */
export const renderHelperRegion = (
  assistiveId: string,
  errorText: Readable<string>,
  helperText: Readable<string>,
  setRef?: (el: HTMLElement | null) => void,
) => {
  return html`<div
    class="helper-text"
    part="helper-text"
    id="${assistiveId}"
    :role="${() => (errorText.value ? 'alert' : null)}"
    aria-live="polite"
    ?hidden="${() => !errorText.value && !helperText.value}"
    ref=${(el: HTMLElement | null) => {
      setRef?.(el);
    }}>
    ${() => errorText.value || helperText.value}
  </div>`;
};
