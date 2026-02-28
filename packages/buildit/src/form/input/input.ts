import {
  colorThemeMixin,
  disabledLoadingMixin,
  frostVariantMixin,
  roundedVariantMixin,
  sizeVariantMixin,
} from '../../styles';
import type { ComponentSize, InputType, RoundedSize, ThemeColor, VisualVariant } from '../../types';
import { generateId } from '../../utils/common';
import { FormFieldController } from '../../utils/controllers';

const styles = /* css */ `
  @layer buildit.base {
    /* ========================================
       Base Styles & Defaults
       ======================================== */

    :host {
      --_font-size: var(--input-font-size, var(--text-sm));
      --_gap: var(--input-gap, var(--size-2));
      --_padding: var(--input-padding, var(--size-1-5) var(--size-3));
      --_radius: var(--input-radius, var(--rounded-md));
      --_placeholder: var(--input-placeholder-color, var(--color-contrast-500));
      --_bg: var(--input-bg, var(--color-contrast-100));
      --_border-color: var(--input-border-color, var(--color-contrast-300));

      align-items: stretch;
      display: inline-flex;
      flex-direction: column;
    }

    .input-wrapper {
      display: flex;
      flex-direction: column;
      gap: var(--size-1-5);
      width: 100%;
    }

    .field {
      align-items: stretch;
      background: var(--_bg);
      border-radius: var(--_radius);
      border: var(--border) solid var(--_border-color);
      box-shadow: var(--_shadown, var(--shadow-2xs));
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 0;
      justify-content: center;
      min-height: var(--size-10);
      padding: var(--_padding);
      transition:
        background var(--transition-fast),
        backdrop-filter var(--transition-slow),
        border-color var(--transition-fast),
        box-shadow var(--transition-fast),
        transform var(--transition-fast);
    }

    .input-row {
      display: flex;
      align-items: center;
      gap: var(--_gap);
      flex: 1;
    }

    /* ========================================
       Label Styles
       ======================================== */

    .label-inset,
    .label-outside,
    label.label-inset,
    label.label-outside {
      color: var(--color-contrast-500);
      cursor: pointer;
      font-weight: var(--font-medium);
      transition: color var(--transition-fast);
      user-select: none;
    }

    .label-inset,
    label.label-inset {
      font-size: var(--text-xs);
      line-height: var(--leading-tight);
      margin-bottom: 2px;
    }

    .label-outside,
    label.label-outside {
      font-size: var(--text-sm);
      line-height: var(--leading-none);
    }

    /* ========================================
       Helper Text
       ======================================== */

    .helper-text {
      color: var(--color-contrast-500);
      font-size: var(--text-xs);
      line-height: var(--leading-tight);
      padding-inline: 2px;
    }

    /* ========================================
       Slotted Prefix/Suffix Icons
       ======================================== */

    ::slotted([slot='prefix']),
    ::slotted([slot='suffix']) {
      align-items: center;
      color: var(--color-contrast-500);
      display: inline-flex;
      font-size: var(--size-4);
      justify-content: center;
      opacity: 0.8;
      transition: color var(--transition-fast);
      user-select: none;
    }

    /* ========================================
       Input Element
       ======================================== */

    input {
      /* No all: unset needed - reset layer handles it */
      color: var(--_theme-content);
      flex: 1;
      font: inherit;
      font-size: var(--_font-size);
      line-height: var(--leading-normal);
      min-width: 0;
      background: transparent;
      border: none;
      outline: none;
    }

    input::placeholder {
      color: var(--_placeholder);
      transition: color var(--transition-fast);
    }

    input:focus-visible {
      outline: none;
    }

    /* ========================================
       Hover & Focus States
       ======================================== */

    :host(:not([disabled]):not([variant='bordered']):not([variant='flat'])) .field:hover {
      border-color: var(--color-contrast-400);
    }

    :host(:not([disabled]):not([variant='text']):not([variant='flat'])) .field:focus-within {
      background: var(--color-canvas);
      border-color: var(--_theme-focus);
      box-shadow: var(--_theme-shadow, var(--color-primary-focus-shadow));
      transform: translateY(-1px);
    }

    :host(:not([disabled]):not([variant='frost'])) .field:focus-within .label-inset,
    :host(:not([disabled])) .field:focus-within .label-outside {
      color: var(--_theme-focus);
    }

    :host(:not([disabled])) .field:focus-within ::slotted([slot='prefix']),
    :host(:not([disabled])) .field:focus-within ::slotted([slot='suffix']) {
      color: var(--_theme-focus);
    }

    /* ========================================
       Error State
       ======================================== */

    :host([error]) .field {
      border-color: var(--color-error);
    }

    :host([error]) .field:focus-within {
      border-color: var(--color-error);
      box-shadow: var(--color-error-focus-shadow);
    }

    :host([error]) .label-inset,
    :host([error]) .label-outside {
      color: var(--color-error);
    }
  }

  ${sizeVariantMixin({
    lg: {
      fontSize: 'var(--text-base)',
      gap: 'var(--size-2-5)',
      padding: 'var(--size-2) var(--size-3-5)',
    },
    sm: {
      fontSize: 'var(--text-xs)',
      gap: 'var(--size-1-5)',
      padding: 'var(--size-1) var(--size-2)',
    },
  })}

  @layer buildit.variants {

    /* ========================================
       Visual Variants
       ======================================== */

    /* Solid (Default) - Standard input with background */
    :host(:not([variant])) .field,
    :host([variant='solid']) .field {
      background: var(--color-contrast-50);
      border-color: var(--color-contrast-300);
      box-shadow: var(--shadow-2xs);
    }

    /* Flat - Minimal with subtle color hint */
    :host([variant='flat']) .field {
      background: color-mix(in srgb, var(--_theme-base) 4%, var(--color-contrast-100));
      border-color: var(--_theme-border);
      box-shadow: var(--inset-shadow-2xs);
    }

    :host([variant='flat']) .field:hover {
      background: color-mix(in srgb, var(--_theme-base) 6%, var(--color-contrast-100));
      border-color: color-mix(in srgb, var(--_theme-base) 35%, var(--color-contrast-300));
    }

    :host([variant='flat']) .field:focus-within {
      background: color-mix(in srgb, var(--_theme-base) 8%, var(--color-canvas));
      border-color: color-mix(in srgb, var(--_theme-focus) 60%, transparent);
      box-shadow: var(--_theme-shadow);
    }

    /* Bordered - Filled with theme color */
    :host([variant='bordered']) .field {
      background: var(--_theme-backdrop);
      border-color: color-mix(in srgb, var(--_theme-focus) 70%, transparent);
    }

    :host([variant='bordered']) input {
      color: var(--_theme-content);
    }

    :host([variant='bordered']) input::placeholder {
      color: color-mix(in srgb, var(--_theme-content) 45%, transparent);
    }

    :host([variant='bordered']) .field:hover {
      border-color: var(--_theme-focus);
    }

    /* Outline - Transparent background */
    :host([variant='outline']) .field {
      background: transparent;
      box-shadow: none;
    }

    /* Ghost - Transparent until hover */
    :host([variant='ghost']) .field {
      background: transparent;
      border-color: transparent;
      box-shadow: none;
    }

    :host([variant='ghost']) .field:hover {
      background: var(--color-contrast-100);
    }

    /* Text - Underline style */
    :host([variant='text']) .field {
      background: transparent;
      border: none;
      border-bottom: var(--border) solid var(--_border-color);
      border-radius: 0;
      box-shadow: none;
    }

    :host([variant='text']) .field:focus-within {
      border-bottom: var(--border-2) solid var(--_theme-focus);
      transform: none;
    }

    /* Input-specific frost customizations for text and labels */
    :host([variant='frost']:not([color])) input {
      color: var(--color-contrast);
      text-shadow: var(--text-shadow-sm);
    }

    :host([variant='frost']:not([color])) .label-inset {
      color: color-mix(in srgb, var(--color-contrast) 85%, transparent);
    }

    :host([variant='frost']:not([color])) input::placeholder {
      color: color-mix(in srgb, var(--color-contrast) 50%, transparent);
    }

    :host([variant='frost'][color]) input {
      color: var(--_theme-content);
      text-shadow: var(--text-shadow-sm);
    }

    :host([variant='frost'][color]) input::placeholder {
      color: color-mix(in srgb, var(--_theme-content) 40%, transparent);
    }

    :host([variant='frost'][color]) .label-inset {
      color: color-mix(in srgb, var(--_theme-content) 90%, transparent);
    }

    :host([variant='frost'][color]) ::slotted([slot='prefix']),
    :host([variant='frost'][color]) ::slotted([slot='suffix']) {
      color: color-mix(in srgb, var(--_theme-content) 80%, transparent);
    }

    /* Input-specific hover/focus states with enhanced opacity */
    :host([variant='frost']:not([color])) .field:hover {
      background: color-mix(in srgb, var(--color-canvas) 80%, transparent);
      border-color: color-mix(in srgb, var(--color-contrast-500) 30%, transparent);
    }

    :host([variant='frost']:not([color])) .field:focus-within {
      background: color-mix(in srgb, var(--color-canvas) 85%, transparent);
      border-color: color-mix(in srgb, var(--_theme-focus) 40%, transparent);
    }

    :host([variant='frost'][color]) .field:hover {
      background: color-mix(in srgb, var(--_theme-base) 70%, var(--color-contrast) 30%);
      border-color: color-mix(in srgb, var(--_theme-focus) 50%, transparent);
    }

    :host([variant='frost'][color]) .field:focus-within {
      background: color-mix(in srgb, var(--_theme-base) 65%, var(--color-contrast) 35%);
      border-color: color-mix(in srgb, var(--_theme-focus) 60%, transparent);
    }
  }

  /* ========================================
     Mixins - Order doesn't matter!
     ======================================== */

  ${roundedVariantMixin()}
  ${colorThemeMixin()}
  ${frostVariantMixin('.field')}
  ${disabledLoadingMixin()}
`;

/** Input component properties */
export type InputProps = {
  /** Label text */
  label?: string;
  /** Label placement */
  'label-placement'?: 'inset' | 'outside';
  /** Theme color */
  color?: ThemeColor;
  /** Disable input interaction */
  disabled?: boolean;
  /** Helper text displayed below the input */
  helper?: string;
  /** Error message (marks field as invalid) */
  error?: string;
  /** Form field name */
  name?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Make the input read-only */
  readonly?: boolean;
  /** Mark the field as required */
  required?: boolean;
  /** Border radius size */
  rounded?: RoundedSize | '';
  /** Input size */
  size?: ComponentSize;
  /** HTML input type */
  type?: InputType;
  /** Current input value */
  value?: string;
  /** Visual style variant */
  variant?: Exclude<VisualVariant, 'glass'>;
};

const VALID_INPUT_TYPES = ['text', 'email', 'password', 'search', 'url', 'tel', 'number'] as const;

const validateInputType = (type: string | null): string => {
  return VALID_INPUT_TYPES.includes(type as (typeof VALID_INPUT_TYPES)[number]) ? type! : 'text';
};

/**
 * A customizable text input component with multiple variants, label placements, and form features.
 *
 * @element bit-input
 *
 * @attr {string} label - Label text
 * @attr {string} label-placement - Label placement: 'inset' | 'outside'
 * @attr {string} type - HTML input type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
 * @attr {string} value - Current input value
 * @attr {string} placeholder - Placeholder text
 * @attr {string} name - Form field name
 * @attr {string} helper - Helper text displayed below the input
 * @attr {string} error - Error message (marks field as invalid)
 * @attr {boolean} disabled - Disable input interaction
 * @attr {boolean} readonly - Make the input read-only
 * @attr {boolean} required - Mark the field as required
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'neutral'
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'frost'
 * @attr {string} size - Input size: 'sm' | 'md' | 'lg'
 * @attr {string} rounded - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
 *
 * @fires input - Emitted when input value changes (on every keystroke)
 * @fires change - Emitted when input loses focus with changed value
 *
 * @slot prefix - Content before the input (e.g., icons)
 * @slot suffix - Content after the input (e.g., clear button, validation icon)
 * @slot helper - Complex helper content below the input
 *
 * @part wrapper - The input wrapper element
 * @part label - The label element (inset or outside)
 * @part field - The field container element
 * @part input-row - The input row container element
 * @part input - The input element
 * @part helper - The helper text element
 *
 * @cssprop --input-bg - Background color
 * @cssprop --input-color - Text color
 * @cssprop --input-border-color - Border color
 * @cssprop --input-focus - Focus border color
 * @cssprop --input-placeholder-color - Placeholder text color
 * @cssprop --input-radius - Border radius
 * @cssprop --input-padding - Inner padding (vertical horizontal)
 * @cssprop --input-gap - Gap between prefix/suffix and input
 * @cssprop --input-font-size - Font size
 *
 * @example
 * ```html
 * <bit-input type="email" label="Email" placeholder="you@example.com" />
 * <bit-input label="Name" variant="bordered" color="primary" />
 * <bit-input variant="frost" helper="Must be at least 8 characters" />
 * ```
 */
class BitInput extends HTMLElement {
  static formAssociated = true;
  static observedAttributes = [
    'type',
    'value',
    'name',
    'placeholder',
    'label',
    'label-placement',
    'helper',
    'error',
    'disabled',
    'readonly',
    'required',
    'size',
    'variant',
    'color',
    'rounded',
  ] as const;

  private formField = new FormFieldController(this, {
    getInput: () => this.shadowRoot?.querySelector('input') ?? null,
  });

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  // ============================================
  // Constraint Validation API (delegated to controller)
  // ============================================

  /**
   * Sets a custom validation message
   * @param message - The validation message (empty string to clear)
   */
  setCustomValidity(message: string): void {
    this.formField.setCustomValidity(message);
    if (message) {
      this.setAttribute('error', message);
    } else {
      this.removeAttribute('error');
    }
  }

  /**
   * Checks if the input is valid
   * @returns true if valid, false otherwise
   */
  checkValidity(): boolean {
    return this.formField.checkValidity();
  }

  /**
   * Checks validity and reports issues to the user
   * @returns true if valid, false otherwise
   */
  reportValidity(): boolean {
    return this.formField.reportValidity();
  }

  /**
   * Gets the validity state
   */
  get validity(): ValidityState {
    return this.formField.validity;
  }

  /**
   * Gets the validation message
   */
  get validationMessage(): string {
    return this.formField.validationMessage;
  }

  connectedCallback() {
    this.render();
    this.formField.hostConnected();

    const input = this.shadowRoot?.querySelector('input') as HTMLInputElement | null;
    if (!input) return;

    // Helper to update value and emit event
    const handleValueChange = (e: Event, eventName: 'input' | 'change') => {
      const target = e.target as HTMLInputElement;
      this.setAttribute('value', target.value);
      this.formField.setFormValue(target.value);
      this.dispatchEvent(
        new CustomEvent(eventName, {
          bubbles: true,
          composed: true,
          detail: { originalEvent: e, value: target.value },
        }),
      );
    };

    input.addEventListener('input', (e) => handleValueChange(e, 'input'));
    input.addEventListener('change', (e) => handleValueChange(e, 'change'));
  }

  disconnectedCallback() {
    this.formField.hostDisconnected();
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null) {
    const input = this.shadowRoot?.querySelector('input') as HTMLInputElement | null;
    if (!input) return;

    switch (name) {
      case 'value':
        input.value = newValue ?? '';
        this.formField.setFormValue(newValue ?? '');
        break;
      case 'name':
        input.name = newValue ?? '';
        break;
      case 'placeholder':
        input.placeholder = newValue ?? '';
        break;
      case 'type':
        input.type = validateInputType(newValue);
        break;
      case 'disabled':
        input.disabled = newValue !== null;
        break;
      case 'readonly':
        input.readOnly = newValue !== null;
        break;
      case 'required':
        input.required = newValue !== null;
        break;
    }
  }

  render() {
    const type = validateInputType(this.getAttribute('type'));
    const labelText = this.getAttribute('label');
    const labelPlacement = this.getAttribute('label-placement') || 'inset';
    const helperText = this.getAttribute('helper');
    const errorText = this.getAttribute('error');
    const name = this.getAttribute('name');

    // Generate IDs for accessibility
    const inputId = name ? `input-${name}` : generateId('input');
    const labelId = labelText ? `label-${inputId}` : '';
    const helperId = helperText ? `helper-${inputId}` : '';
    const errorId = errorText ? `error-${inputId}` : '';

    const value = this.getAttribute('value') || '';
    const placeholder = this.getAttribute('placeholder') || '';
    const isDisabled = this.hasAttribute('disabled');
    const isReadonly = this.hasAttribute('readonly');
    const isRequired = this.hasAttribute('required');
    const hasError = !!errorText;

    this.shadowRoot!.innerHTML = /* html */ `
      <style>${styles}</style>
      <div class="input-wrapper" part="wrapper">
        ${
          labelText && labelPlacement === 'outside'
            ? `<label class="label-outside" for="${inputId}" id="${labelId}" part="label">${labelText}</label>`
            : ''
        }
        <div class="field" part="field">
          ${
            labelText && labelPlacement === 'inset'
              ? `<label class="label-inset" for="${inputId}" id="${labelId}" part="label">${labelText}</label>`
              : ''
          }
          <div class="input-row" part="input-row">
            <slot name="prefix"></slot>
            <input
              part="input"
              id="${inputId}"
              type="${type}"
              name="${name || ''}"
              value="${value}"
              placeholder="${placeholder}"
              aria-labelledby="${labelId}"
              aria-describedby="${hasError ? errorId : helperId}"
              aria-invalid="${hasError ? 'true' : 'false'}"
              ${hasError ? `aria-errormessage="${errorId}"` : ''}
              ${isDisabled ? 'disabled' : ''}
              ${isReadonly ? 'readonly' : ''}
              ${isRequired ? 'required aria-required="true"' : ''} />
            <slot name="suffix"></slot>
          </div>
        </div>
        ${
          errorText
            ? `<div class="helper-text" id="${errorId}" role="alert" style="color: var(--color-error);" part="helper">
                ${errorText}
              </div>`
            : helperText
              ? `<div class="helper-text" id="${helperId}" part="helper">
                  <slot name="helper">${helperText}</slot>
                </div>`
              : ''
        }
      </div>
    `;
    this.formField.setFormValue(this.getAttribute('value') || '');
  }
}

if (!customElements.get('bit-input')) {
  customElements.define('bit-input', BitInput);
}

export default {};
