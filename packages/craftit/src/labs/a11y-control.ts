import { effect, onMount } from '../core/runtime';
import { createId } from '../core/utils';

/**
 * Configuration for `useA11yControl()`.
 */
export type A11yControlConfig = {
  /** Reactive aria-checked value ('true' | 'false' | 'mixed' | undefined) */
  checked?: () => 'true' | 'false' | 'mixed' | undefined;
  /** Optional: custom helper ID instead of auto-generated */
  helperId?: string;
  /** Helper/error text to display below control */
  helperText?: () => string | undefined;
  /** Reactive aria-invalid value */
  invalid?: () => boolean;
  /** Optional: custom label ID instead of auto-generated */
  labelId?: string;
  /** Slot helper (from setup context) for label presence detection */
  labelSlot?: any;
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
 * - `aria-labelledby` wiring when label slot is present
 * - `aria-describedby` wiring when helper text is present
 * - `aria-invalid` sync with error state
 * - `aria-checked` for checkable controls
 * - Helper text live region with `aria-live="polite"`
 * - Error state alert role (`role="alert"`)
 *
 * @example
 * const a11y = useA11yControl(host, {
 *   role: 'checkbox',
 *   checked: () => indeterminate.value ? 'mixed' : String(checked.value),
 *   invalid: () => !!error.value,
 *   helperText: () => error.value || helper.value,
 *   labelSlot: slots.default,
 * });
 *
 * // Later in template:
 * // <span id=${a11y.labelId}>Label</span>
 * // <div id=${a11y.helperId}>Error text</div>
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

    // Detect label slot presence once on mount
    if (config.labelSlot && typeof config.labelSlot === 'object' && 'has' in config.labelSlot) {
      const hasLabel = (config.labelSlot.has as () => boolean)?.();

      if (hasLabel) {
        const labelSpan = shadow?.querySelector('[data-a11y-label]') as HTMLElement | null;

        if (labelSpan) {
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

          // Add alert role if this is error text (heuristic: starts with capital or error keywords)
          const isError = text.toLowerCase().includes('error') || text.toLowerCase().includes('required');

          if (isError) {
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
