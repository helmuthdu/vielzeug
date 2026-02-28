import { colorThemeMixin, disabledStateMixin, sizeVariantMixin } from '../../styles';
import type { ComponentSize, ThemeColor } from '../../types';

const styles = /* css */ `
  @layer buildit.base {
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
      gap: var(--_gap, var(--size-2));
      cursor: pointer;
      user-select: none;
    }

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

    /* ========================================
       Label
       ======================================== */

    .label {
      font-size: var(--_font-size);
      color: var(--color-contrast);
    }
  }

  ${colorThemeMixin()}
  ${disabledStateMixin()}

  @layer buildit.overrides {
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

    :host([checked]) .checkmark,
    :host([indeterminate]:not([checked])) .dash {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }

  ${sizeVariantMixin({
    lg: {
      fontSize: 'var(--text-base)',
      gap: 'var(--size-2-5)',
      size: 'var(--size-6)',
    },
    sm: {
      fontSize: 'var(--text-xs)',
      gap: 'var(--size-1-5)',
      size: 'var(--size-4)',
    },
  })}
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
 * - **change**: Emitted when the checkbox state changes
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
 * A customizable checkbox component with theme colors, sizes, and indeterminate state support.
 *
 * @element bit-checkbox
 *
 * @attr {boolean} checked - Checked state
 * @attr {boolean} disabled - Disable checkbox interaction
 * @attr {boolean} indeterminate - Indeterminate state (partially checked)
 * @attr {string} value - Field value
 * @attr {string} name - Form field name
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'neutral'
 * @attr {string} size - Checkbox size: 'sm' | 'md' | 'lg'
 *
 * @fires change - Emitted when the checkbox state changes
 *
 * @slot - Checkbox label text
 *
 * @part checkbox - The checkbox wrapper element
 * @part box - The visual checkbox box
 * @part label - The label text element
 *
 * @cssprop --checkbox-size - Checkbox dimensions
 * @cssprop --checkbox-bg - Background color (unchecked)
 * @cssprop --checkbox-checked-bg - Background color (checked)
 * @cssprop --checkbox-border-color - Border color
 * @cssprop --checkbox-color - Checkmark icon color
 * @cssprop --checkbox-radius - Border radius
 * @cssprop --checkbox-font-size - Label font size
 */
class BitCheckbox extends HTMLElement {
  static formAssociated = true;
  static observedAttributes = ['checked', 'disabled', 'indeterminate', 'value', 'name', 'color', 'size'] as const;

  #internals: ElementInternals;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.#internals = this.attachInternals();
  }

  formResetCallback(): void {
    this.removeAttribute('checked');
    this.removeAttribute('indeterminate');
    this.#updateFormValue();
  }

  formStateRestoreCallback(state: string | null): void {
    if (state === 'checked') {
      this.setAttribute('checked', '');
    } else {
      this.removeAttribute('checked');
    }
    this.#updateFormValue();
  }

  #updateFormValue(): void {
    if (!this.#internals?.setFormValue) return;
    const isChecked = this.hasAttribute('checked');
    const value = this.getAttribute('value') || 'on';
    this.#internals.setFormValue(isChecked ? value : null, isChecked ? 'checked' : undefined);
  }

  connectedCallback() {
    this.render();

    const input = this.shadowRoot?.querySelector('input') as HTMLInputElement | null;
    const label = this.shadowRoot?.querySelector('.label') as HTMLElement | null;

    const isIndeterminate = this.hasAttribute('indeterminate');
    const isChecked = this.hasAttribute('checked');
    const isDisabled = this.hasAttribute('disabled');

    if (input) {
      input.indeterminate = isIndeterminate;
      input.checked = isChecked;
    }

    this.setAttribute('role', 'checkbox');
    this.setAttribute('aria-checked', isIndeterminate ? 'mixed' : isChecked ? 'true' : 'false');
    this.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');

    // Generate unique ID for label association
    const labelId = `checkbox-label-${Math.random().toString(36).substr(2, 9)}`;
    if (label && label.textContent?.trim()) {
      label.id = labelId;
      this.setAttribute('aria-labelledby', labelId);
    }

    if (!isDisabled && !this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }

    // Helper to toggle checkbox state
    const toggleCheckbox = (originalEvent: Event) => {
      if (this.hasAttribute('disabled')) return;

      const nextChecked = !this.hasAttribute('checked');

      if (nextChecked) this.setAttribute('checked', '');
      else this.removeAttribute('checked');

      if (this.hasAttribute('indeterminate')) this.removeAttribute('indeterminate');

      if (input) {
        input.checked = nextChecked;
        input.indeterminate = false;
      }

      this.setAttribute('aria-checked', nextChecked ? 'true' : 'false');
      this.#updateFormValue();
      this.dispatchEvent(
        new CustomEvent('change', {
          bubbles: true,
          composed: true,
          detail: {
            checked: nextChecked,
            originalEvent,
            value: this.getAttribute('value'),
          },
        }),
      );
    };

    this.addEventListener('keydown', (keyEvent) => {
      const kbEvent = keyEvent as KeyboardEvent;
      if (kbEvent.key === ' ' || kbEvent.key === 'Enter') {
        kbEvent.preventDefault();
        toggleCheckbox(keyEvent);
      }
    });

    this.addEventListener('click', (e) => {
      toggleCheckbox(e);
    });
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Attribute synchronization requires handling multiple states (checked, indeterminate, disabled) and their interactions
  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null) {
    const input = this.shadowRoot?.querySelector('input') as HTMLInputElement | null;
    if (!input) return;

    if (name === 'indeterminate') {
      const isIndeterminate = newValue !== null;
      input.indeterminate = isIndeterminate;

      // Update aria-checked to reflect indeterminate state
      const isChecked = this.hasAttribute('checked');
      this.setAttribute('aria-checked', isIndeterminate ? 'mixed' : isChecked ? 'true' : 'false');
    } else if (name === 'checked') {
      const isChecked = newValue !== null;
      input.checked = isChecked;

      // Update aria-checked (consider indeterminate state)
      const isIndeterminate = this.hasAttribute('indeterminate');
      this.setAttribute('aria-checked', isIndeterminate ? 'mixed' : isChecked ? 'true' : 'false');
    } else if (name === 'disabled') {
      const isDisabled = newValue !== null;
      input.disabled = isDisabled;

      // Update aria-disabled and tabindex
      this.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
      if (isDisabled) {
        this.removeAttribute('tabindex');
      } else if (!this.hasAttribute('tabindex')) {
        this.setAttribute('tabindex', '0');
      }
    }
  }

  render() {
    const isChecked = this.hasAttribute('checked');
    const isDisabled = this.hasAttribute('disabled');
    const isIndeterminate = this.hasAttribute('indeterminate');
    const name = this.getAttribute('name') || '';
    const value = this.getAttribute('value') || '';

    this.shadowRoot!.innerHTML = /* html */ `
      <style>${styles}</style>
      <div class="checkbox-wrapper" part="checkbox">
        <input
          type="checkbox"
          ${isChecked ? 'checked' : ''}
          ${isDisabled ? 'disabled' : ''}
          name="${name}"
          value="${value}"
          style="display: none;"
          aria-hidden="true"
          tabindex="-1" />
        <div class="box" part="box">
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
      <span class="label" part="label"><slot></slot></span>
    `;

    this.#updateFormValue();

    // Set indeterminate after render since it's a property, not an attribute
    if (isIndeterminate) {
      const input = this.shadowRoot?.querySelector('input') as HTMLInputElement | null;
      if (input) {
        input.indeterminate = true;
      }
    }
  }
}

if (!customElements.get('bit-checkbox')) {
  customElements.define('bit-checkbox', BitCheckbox);
}

export default {};
