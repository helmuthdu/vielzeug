import { colorThemeMixin, disabledStateMixin, sizeVariantMixin } from '../../styles';
import type { ComponentSize, ThemeColor } from '../../types';
import { setupLabelAssociation } from '../../utils/common';
import { CheckedStateController, FormFieldController } from '../../utils/controllers';

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

/** Checkbox component properties */
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
 *
 * @example
 * ```html
 * <bit-checkbox checked>Accept terms</bit-checkbox>
 * <bit-checkbox color="primary" size="lg">Subscribe</bit-checkbox>
 * <bit-checkbox indeterminate>Select all</bit-checkbox>
 * ```
 */
class BitCheckbox extends HTMLElement {
  static formAssociated = true;
  static observedAttributes = ['checked', 'disabled', 'indeterminate', 'value', 'name', 'color', 'size'] as const;

  private formField = new FormFieldController(this, {
    getInput: () => this.shadowRoot?.querySelector('input') ?? null,
  });

  private checkedState = new CheckedStateController(this, {
    getInput: () => this.shadowRoot?.querySelector('input') ?? null,
    onToggle: (checked, value) => {
      this.formField.setFormValue(checked ? value : null, checked ? 'checked' : undefined);
    },
    type: 'checkbox',
  });

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setCustomValidity(message: string): void {
    this.formField.setCustomValidity(message);
  }

  checkValidity(): boolean {
    return this.formField.checkValidity();
  }

  reportValidity(): boolean {
    return this.formField.reportValidity();
  }

  get validity(): ValidityState {
    return this.formField.validity;
  }

  get validationMessage(): string {
    return this.formField.validationMessage;
  }

  connectedCallback() {
    this.render();
    this.formField.hostConnected();

    const isIndeterminate = this.hasAttribute('indeterminate');
    this.checkedState.syncState(isIndeterminate);

    // Setup label association
    setupLabelAssociation(this.shadowRoot, this, 'checkbox');

    // Toggle on click
    this.addEventListener('click', (e) => {
      this.checkedState.toggle(e);
    });

    // Toggle on Space/Enter
    this.addEventListener('keydown', (keyEvent) => {
      const kbEvent = keyEvent as KeyboardEvent;
      if (kbEvent.key === ' ' || kbEvent.key === 'Enter') {
        kbEvent.preventDefault();
        this.checkedState.toggle(keyEvent);
      }
    });
  }

  disconnectedCallback() {
    this.formField.hostDisconnected();
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null) {
    if (!this.isConnected) return;

    if (name === 'checked' || name === 'indeterminate' || name === 'disabled') {
      const isIndeterminate = this.hasAttribute('indeterminate');
      this.checkedState.syncState(isIndeterminate);
    }

    if (name === 'checked') {
      const isChecked = newValue !== null;
      const value = this.getAttribute('value') || 'on';
      this.formField.setFormValue(isChecked ? value : null, isChecked ? 'checked' : undefined);
    }
  }

  render() {
    const isChecked = this.hasAttribute('checked');
    const isDisabled = this.hasAttribute('disabled');
    const isIndeterminate = this.hasAttribute('indeterminate');
    const name = this.getAttribute('name') || '';
    const value = this.getAttribute('value') || 'on';

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

    this.formField.setFormValue(isChecked ? value : null, isChecked ? 'checked' : undefined);

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
