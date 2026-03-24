import { effect, onMount } from '../core/runtime';
import { createId } from '../core/utilities';

/**
 * Tone of helper/error text: 'default' for helper, 'error' for error message.
 */
export type A11yTone = 'default' | 'error';

/**
 * Configuration for `useA11yControl()`.
 *
 * Label presence is detected via DOM query (not heuristics).
 * All other state getters are reactive and can change over time.
 */
export type A11yControlConfig = {
  /** Reactive aria-checked value ('true' | 'false' | 'mixed' | undefined) */
  checked?: () => 'true' | 'false' | 'mixed' | undefined;
  /** Optional: custom helper ID instead of auto-generated */
  helperId?: string;
  /** Helper text content (mutually exclusive with explicit label/helper management) */
  helperText?: () => string | undefined;
  /** Tone of helper text: 'error' to set role="alert", 'default' otherwise */
  helperTone?: () => A11yTone;
  /** Reactive aria-invalid value */
  invalid?: () => boolean;
  /** Optional: custom label ID instead of auto-generated */
  labelId?: string;
  /** ARIA role (e.g., 'checkbox', 'radio', 'switch') */
  role: string;
};

/**
 * Return value from `useA11yControl()`.
 */
export type A11yControlHandle = {
  /** ID for helper text element */
  helperId: string;
  /** ID for label element */
  labelId: string;
};

/**
 * Manages ARIA attributes, IDs, and helper/error live region for accessible form controls.
 *
 * Encapsulates:
 * - Stable ID generation for labels and helpers
 * - `aria-labelledby` wiring when label is present (detected via DOM query)
 * - `aria-describedby` wiring when helper text is present
 * - `aria-invalid` sync with error state
 * - `aria-checked` for checkable controls
 * - Helper text live region with `aria-live="polite"` or `role="alert"` based on tone
 *
 * @example
 * const a11y = useA11yControl(host, {
 *   role: 'checkbox',
 *   checked: () => indeterminate.value ? 'mixed' : String(checked.value),
 *   invalid: () => !!error.value,
 *   helperText: () => error.value || helper.value,
 *   helperTone: () => error.value ? 'error' : 'default',
 * });
 *
 * // Later in template:
 * // <span id=${a11y.labelId}>Label</span>
 * // <div id=${a11y.helperId} aria-live="polite">Error or helper text</div>
 */
export function useA11yControl(host: HTMLElement, config: A11yControlConfig): A11yControlHandle {
  const labelId = config.labelId || createId('a11y-label');
  const helperId = config.helperId || createId('a11y-helper');

  let helperElement: HTMLDivElement | null = null;

  // Set role once at setup
  host.setAttribute('role', config.role);

  onMount(() => {
    // Find helper element in shadow DOM
    const shadow = host.shadowRoot;

    if (shadow) {
      helperElement = shadow.querySelector('[data-a11y-helper]') as HTMLDivElement | null;
    }

    // Detect label presence via DOM query: check if label span has slotted content
    if (shadow) {
      const labelSpan = shadow.querySelector('[data-a11y-label]') as HTMLElement | null;

      if (labelSpan) {
        // Check if the label slot has any assigned nodes
        const slot = labelSpan.querySelector('slot') as HTMLSlotElement | null;
        const hasLabelContent = slot
          ? slot.assignedNodes().length > 0
          : (labelSpan.textContent?.trim().length ?? 0 > 0);

        if (hasLabelContent) {
          labelSpan.id = labelId;
          host.setAttribute('aria-labelledby', labelId);
        }
      }
    }

    // Reactive effects for aria attrs that can change
    effect(() => {
      // aria-checked
      if (config.checked) {
        const checked = config.checked();

        if (checked !== undefined) {
          host.setAttribute('aria-checked', checked);
        }
      }

      // aria-invalid
      if (config.invalid) {
        const invalid = config.invalid();

        host.setAttribute('aria-invalid', String(invalid));
      }

      // Helper text and describedby
      if (config.helperText && helperElement) {
        const text = config.helperText();

        if (text) {
          helperElement.textContent = text;
          helperElement.hidden = false;
          host.setAttribute('aria-describedby', helperId);

          // Set role based on explicit tone (no text heuristics)
          const tone = config.helperTone?.() ?? 'default';

          if (tone === 'error') {
            helperElement.setAttribute('role', 'alert');
          } else {
            helperElement.removeAttribute('role');
          }
        } else {
          helperElement.hidden = true;
          host.removeAttribute('aria-describedby');
        }
      }
    });
  });

  return {
    helperId,
    labelId,
  };
}
