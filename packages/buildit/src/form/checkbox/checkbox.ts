import { css, defineElement, html } from '@vielzeug/craftit';
import { colorThemeMixin, disabledStateMixin } from '../../styles';
import type {
  ThemeColor,
  ComponentSize,
  CheckableChangeEventDetail,
} from '../../types';

/**
 * # bit-checkbox
 *
 * A customizable checkbox component with theme colors, sizes, and indeterminate state support.
 *
 * @element bit-checkbox
 */

const styles = css`
  /* ========================================
     Base Styles & Defaults
     ======================================== */

  :host {
    --_size: var(--checkbox-size, var(--size-5));
    --_radius: var(--checkbox-radius, var(--rounded-md));
    --_font-size: var(--checkbox-font-size, var(--text-sm));
    --_bg: var(--checkbox-bg, var(--color-contrast-200));
    --_border: var(--checkbox-border-color, var(--color-contrast-300));
    
    display: inline-flex;
    align-items: center;
    gap: var(--size-2);
    cursor: pointer;
    user-select: none;
  }

  /* ========================================
     States (Shared Mixin)
     ======================================== */

  ${disabledStateMixin()}

  .checkbox-wrapper {
    position: relative;
    display: block;
    width: var(--_size);
    height: var(--_size);
    flex-shrink: 0;
  }

  input {
    display: none;
  }

  .box {
    width: var(--_size);
    height: var(--_size);
    border: var(--border-2) solid var(--_border);
    border-radius: var(--_radius);
    background: var(--_bg);
    transition:
      background var(--transition-slower),
      border-color var(--transition-slower),
      box-shadow var(--transition-normal);
    position: relative;
    box-sizing: border-box;
  }

  /* ========================================
     Color Themes (Shared Mixin)
     ======================================== */

  ${colorThemeMixin()}

  /* Map theme variables to checkbox-specific variables */
  :host {
    --_active-bg: var(--checkbox-checked-bg, var(--_theme-base));
    --_icon-color: var(--checkbox-color, var(--_theme-contrast));
    --_focus-shadow: var(--_theme-shadow);
  }

  /* ========================================
     Checked & Indeterminate States
     ======================================== */

  :host([checked]) .box,
  :host([indeterminate]) .box {
    background: var(--_active-bg);
    border-color: var(--_active-bg);
  }

  /* ========================================
     Focus State
     ======================================== */

  input:focus-visible + .box {
    box-shadow: var(--_focus-shadow);
  }

  /* ========================================
     Icons (Checkmark & Dash)
     ======================================== */

  .checkmark,
  .dash {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 80%;
    height: 80%;
    transform: translate(-50%, -50%) scale(0.5);
    color: var(--_icon-color);
    stroke: currentColor;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
    opacity: 0;
    transition:
      opacity var(--transition-spring),
      transform var(--transition-spring);
  }

  :host([checked]) .checkmark,
  :host([indeterminate]:not([checked])) .dash {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }

  /* ========================================
     Size Variants
     ======================================== */

  :host([size='sm']) {
    --_size: var(--size-4);
    --_font-size: var(--text-xs);
    gap: var(--size-1-5);
  }

  :host([size='lg']) {
    --_size: var(--size-6);
    --_font-size: var(--text-base);
    gap: var(--size-2-5);
  }

  /* ========================================
     Label
     ======================================== */

  .label {
    font-size: var(--_font-size);
    color: var(--color-contrast);
  }
`;

/**
 * Checkbox Component Properties
 *
 * A customizable checkbox with theme colors, sizes, checked and indeterminate states.
 *
 * ## Slots
 * - **default**: Checkbox label text
 *
 * ## Events
 * - **change**: Emitted when checkbox state changes
 *
 * ## CSS Custom Properties
 * - `--checkbox-size`: Checkbox dimensions
 * - `--checkbox-bg`: Background color (unchecked)
 * - `--checkbox-checked-bg`: Background color (checked)
 * - `--checkbox-border-color`: Border color
 * - `--checkbox-color`: Checkmark icon color
 * - `--checkbox-radius`: Border radius
 * - `--checkbox-font-size`: Label font size
 *
 * @example
 * ```html
 * <!-- Basic usage -->
 * <bit-checkbox checked>Accept terms</bit-checkbox>
 *
 * <!-- With color and size -->
 * <bit-checkbox color="primary" size="lg">
 *   Subscribe to newsletter
 * </bit-checkbox>
 *
 * <!-- Indeterminate state -->
 * <bit-checkbox indeterminate>
 *   Select all
 * </bit-checkbox>
 *
 * <!-- Disabled -->
 * <bit-checkbox checked disabled>
 *   Cannot change
 * </bit-checkbox>
 * ```
 */
export interface CheckboxProps {
  /** Checked state */
  checked?: boolean;
  /** Disable checkbox interaction */
  disabled?: boolean;
  /** Indeterminate state (partially checked) */
  indeterminate?: boolean;
  /** Field value */
  value?: string;
  /** Form field name */
  name?: string;
  /** Theme color */
  color?: ThemeColor;
  /** Checkbox size */
  size?: ComponentSize;
}

/**
 * Checkbox Change Event Detail
 */
export interface CheckboxChangeEvent extends CheckableChangeEventDetail {}

defineElement<HTMLInputElement, CheckboxProps>('bit-checkbox', {
  observedAttributes: ['checked', 'disabled', 'indeterminate', 'value', 'name', 'color', 'size'] as const,

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Attribute synchronization requires handling multiple states (checked, indeterminate, disabled) and their interactions
  onAttributeChanged(el, name, _oldValue, newValue) {
    const host = el as unknown as HTMLElement;

    if (name === 'indeterminate') {
      const input = host.shadowRoot?.querySelector('input') as HTMLInputElement | null;
      if (input) {
        input.indeterminate = newValue !== null;
      }
      host.setAttribute('aria-checked', newValue !== null ? 'mixed' : host.hasAttribute('checked') ? 'true' : 'false');
    } else if (name === 'checked') {
      const input = host.shadowRoot?.querySelector('input') as HTMLInputElement | null;
      if (input) {
        input.checked = newValue !== null;
      }
      if (!host.hasAttribute('indeterminate')) {
        host.setAttribute('aria-checked', newValue !== null ? 'true' : 'false');
      }
    } else if (name === 'disabled') {
      const isDisabled = newValue !== null;
      host.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');

      // Optional: adjust tabindex when disabled/enabled
      if (isDisabled) {
        host.removeAttribute('tabindex');
      } else if (!host.hasAttribute('tabindex')) {
        host.setAttribute('tabindex', '0');
      }
    }
  },

  onConnected(el) {
    const host = el as unknown as HTMLElement;
    const input = host.shadowRoot?.querySelector('input') as HTMLInputElement | null;

    const isIndeterminate = host.hasAttribute('indeterminate');
    const isChecked = host.hasAttribute('checked');
    const isDisabled = host.hasAttribute('disabled');

    if (input) {
      input.indeterminate = isIndeterminate;
      input.checked = isChecked;
    }

    // Host is the interactive element
    host.setAttribute('role', 'checkbox');
    host.setAttribute('aria-checked', isIndeterminate ? 'mixed' : isChecked ? 'true' : 'false');
    host.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');

    if (!isDisabled && !host.hasAttribute('tabindex')) {
      host.setAttribute('tabindex', '0');
    }

    // Helper to toggle checkbox state
    const toggleCheckbox = (originalEvent: Event) => {
      if (host.hasAttribute('disabled')) return;

      const nextChecked = !host.hasAttribute('checked');

      if (nextChecked) host.setAttribute('checked', '');
      else host.removeAttribute('checked');

      if (host.hasAttribute('indeterminate')) host.removeAttribute('indeterminate');

      if (input) {
        input.checked = nextChecked;
        input.indeterminate = false;
      }

      host.setAttribute('aria-checked', nextChecked ? 'true' : 'false');
      el.emit('change', {
        checked: nextChecked,
        originalEvent,
        value: host.getAttribute('value'),
      });
    };

    el.on('keydown', (keyEvent) => {
      if (keyEvent.key === ' ' || keyEvent.key === 'Enter') {
        keyEvent.preventDefault();
        toggleCheckbox(keyEvent);
      }
    });

    el.on('click', (e) => {
      toggleCheckbox(e);
    });
  },

  styles: [styles],

  template: (el) => html`
    <div class="checkbox-wrapper">
      <input
        type="checkbox"
        ?checked="${el.hasAttribute('checked')}"
        ?disabled="${el.hasAttribute('disabled')}"
        .indeterminate="${el.hasAttribute('indeterminate')}"
        name="${el.getAttribute('name')}"
        value="${el.getAttribute('value')}"
        style="display: none;"
        aria-hidden="true"
        tabindex="-1" />
      <div class="box">
        <svg
          class="checkmark"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          xmlns="http://www.w3.org/2000/svg">
          <path d="M 20,6 9,17 4,12" />
        </svg>
        <svg
          class="dash"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          xmlns="http://www.w3.org/2000/svg">
          <path d="M 5,12 H 19" />
        </svg>
      </div>
    </div>
    <span class="label"><slot></slot></span>
  `,
});

export default {};
