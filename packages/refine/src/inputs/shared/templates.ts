import { html } from '@vielzeug/ore';
import type { Readable } from '@vielzeug/ripple';

import { type CounterState, counterClassName } from '../../core';

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
  return html`
    <div
      class="helper-text"
      part="helper-text"
      id="${assistiveId}"
      role="${() => (errorText.value ? 'alert' : null)}"
      aria-live="polite"
      ?hidden="${() => !errorText.value && !helperText.value}"
      ref=${(el: HTMLElement | null) => {
        setRef?.(el);
      }}>
      ${() => errorText.value || helperText.value}
    </div>
  `;
};

/**
 * Inline error/success status icon shown inside a field — identical markup across
 * `ore-input`, `ore-textarea`, and `ore-message-composer` (previously hand-duplicated in all
 * three, down to the same derived-signal names).
 */
export const renderStatusIcon = (errorText: Readable<string>) => html`
  <span
    class="status-icon"
    part="status-icon"
    aria-hidden="true"
    data-status="${() => (errorText.value ? 'error' : 'success')}">
    ${() =>
      errorText.value
        ? html`
            <ore-icon name="alert-circle" size="14" stroke-width="2" aria-hidden="true"></ore-icon>
          `
        : html`
            <ore-icon name="check" size="14" stroke-width="2.5" aria-hidden="true"></ore-icon>
          `}
  </span>
`;

/**
 * Character counter + separate helper/error text regions below a field — identical across
 * `ore-textarea` and `ore-message-composer` (kept out of `ore-input`, which slots its
 * helper/error content and drives its counter off a different data-attribute scheme via its
 * own `char-counter` part — a genuinely different shape, not worth forcing into this one).
 */
export const renderFieldStatusRegion = (tf: {
  assistiveId: string;
  counter: Readable<CounterState> | null;
  errorId: string;
  errorText: Readable<string>;
  helperText: Readable<string>;
}) => html`
  <span class="${() => counterClassName(tf.counter?.value)}" aria-live="polite" ?hidden="${() => !tf.counter}">
    ${() => tf.counter?.value.counterText.replace(' / ', '/') ?? ''}
  </span>
  <div
    id="${tf.assistiveId}"
    class="helper-text"
    aria-live="polite"
    part="helper"
    ?hidden="${() => !!tf.errorText.value || !tf.helperText.value}">
    ${() => tf.helperText.value}
  </div>
  <div id="${tf.errorId}" class="helper-text" role="alert" part="error" ?hidden="${() => !tf.errorText.value}">
    ${() => tf.errorText.value}
  </div>
`;
