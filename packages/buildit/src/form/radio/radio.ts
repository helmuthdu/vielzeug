import { colorThemeMixin, disabledStateMixin, sizeVariantMixin } from '../../styles';
import type { ComponentSize, ThemeColor } from '../../types';

const styles = /* css */ `
  @layer buildit.base {
    /* ========================================
       Base Styles & Defaults
       ======================================== */

    :host {
      --_size: var(--radio-size, var(--size-5));
      --_font-size: var(--radio-font-size, var(--text-sm));
      --_bg: var(--radio-bg, var(--color-contrast-200));
      --_border: var(--radio-border-color, var(--color-contrast-300));

      display: inline-flex;
      align-items: center;
      gap: var(--_gap, var(--size-2));
      cursor: pointer;
      user-select: none;
    }

    .radio-wrapper {
      position: relative;
      display: block;
      width: var(--_size);
      height: var(--_size);
      flex-shrink: 0;
    }

    input {
      display: none;
    }

    .circle {
      width: var(--_size);
      height: var(--_size);
      border: var(--border-2) solid var(--_border);
      border-radius: 50%;
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

    input:focus-visible + .circle {
      box-shadow: var(--_focus-shadow);
    }

    /* ========================================
       Inner Dot
       ======================================== */

    .dot {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 50%;
      height: 50%;
      border-radius: 50%;
      background: var(--_dot-color);
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.5);
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
    /* Map theme variables to radio-specific variables */
    :host {
      --_active-bg: var(--radio-checked-bg, var(--_theme-base));
      --_dot-color: var(--radio-color, var(--_theme-contrast));
      --_focus-shadow: var(--_theme-shadow);
    }

    /* ========================================
       Checked State
       ======================================== */

    :host([checked]) .circle {
      background: var(--_active-bg);
      border-color: var(--_active-bg);
    }

    :host([checked]) .dot {
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
 * Radio Component Properties
 *
 * A customizable radio button for mutually exclusive selections within a group.
 *
 * ## Slots
 * - **default**: Radio button label text
 *
 * ## Events
 * - **change**: Emitted when radio is selected
 *
 * ## CSS Custom Properties
 * - `--radio-size`: Radio button dimensions
 * - `--radio-bg`: Background color (unchecked)
 * - `--radio-checked-bg`: Background color (checked)
 * - `--radio-border-color`: Border color
 * - `--radio-color`: Inner dot color
 * - `--radio-font-size`: Label font size
 *
 * ## Keyboard Navigation
 * - `Space/Enter`: Select radio
 * - `Arrow Up/Left`: Select previous radio in group
 * - `Arrow Down/Right`: Select next radio in group
 *
 * @example
 * ```html
 * <!-- Radio group -->
 * <bit-radio name="size" value="small">Small</bit-radio>
 * <bit-radio name="size" value="medium" checked>Medium</bit-radio>
 * <bit-radio name="size" value="large">Large</bit-radio>
 *
 * <!-- With color and size -->
 * <bit-radio name="plan" value="pro" color="primary" size="lg">
 *   Pro Plan
 * </bit-radio>
 *
 * <!-- Disabled -->
 * <bit-radio name="option" value="disabled" disabled>
 *   Not available
 * </bit-radio>
 * ```
 */
export interface RadioProps {
  /** Checked state */
  checked?: boolean;
  /** Disable radio interaction */
  disabled?: boolean;
  /** Field value */
  value?: string;
  /** Form field name (required for radio groups) */
  name?: string;
  /** Theme color */
  color?: ThemeColor;
  /** Radio size */
  size?: ComponentSize;
}

/**
 * A customizable radio button component for mutually exclusive selections.
 *
 * @element bit-radio
 *
 * @attr {boolean} checked - Checked state
 * @attr {boolean} disabled - Disable radio interaction
 * @attr {string} value - Field value
 * @attr {string} name - Form field name (required for radio groups)
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'neutral'
 * @attr {string} size - Radio size: 'sm' | 'md' | 'lg'
 *
 * @fires change - Emitted when radio is selected
 *
 * @slot - Radio button label text
 *
 * @part radio - The radio wrapper element
 * @part circle - The visual radio circle
 * @part label - The label text element
 *
 * @cssprop --radio-size - Radio button dimensions
 * @cssprop --radio-bg - Background color (unchecked)
 * @cssprop --radio-checked-bg - Background color (checked)
 * @cssprop --radio-border-color - Border color
 * @cssprop --radio-color - Inner dot color
 * @cssprop --radio-font-size - Label font size
 */
class BitRadio extends HTMLElement {
  static formAssociated = true;
  static observedAttributes = ['checked', 'disabled', 'value', 'name', 'color', 'size'] as const;

  #internals: ElementInternals;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.#internals = this.attachInternals();
  }

  formResetCallback(): void {
    this.removeAttribute('checked');
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
    const value = this.getAttribute('value') || '';
    this.#internals.setFormValue(isChecked ? value : null, isChecked ? 'checked' : undefined);
  }

  connectedCallback() {
    this.render();

    const input = this.shadowRoot?.querySelector('input') as HTMLInputElement | null;
    const label = this.shadowRoot?.querySelector('.label') as HTMLElement | null;

    const isChecked = this.hasAttribute('checked');
    const isDisabled = this.hasAttribute('disabled');

    if (input) {
      input.checked = isChecked;
    }

    this.setAttribute('role', 'radio');
    this.setAttribute('aria-checked', isChecked ? 'true' : 'false');
    this.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');

    // Generate unique ID for label association
    const labelId = `radio-label-${Math.random().toString(36).substr(2, 9)}`;
    if (label && label.textContent?.trim()) {
      label.id = labelId;
      this.setAttribute('aria-labelledby', labelId);
    }

    if (!isDisabled && !this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }

    // Helper to get all enabled radios in the same group
    const getRadioGroup = (): HTMLElement[] => {
      const radioName = this.getAttribute('name');
      if (!radioName) return [];
      return Array.from(document.querySelectorAll<HTMLElement>(`bit-radio[name="${radioName}"]`)).filter(
        (r) => !r.hasAttribute('disabled'),
      );
    };

    const selectRadio = (target: HTMLElement, originalEvent: Event | KeyboardEvent) => {
      const radios = getRadioGroup();
      if (radios.length === 0) return;

      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Radio group management requires coordination
      radios.forEach((radio) => {
        const radioInput = (radio.shadowRoot?.querySelector('input') as HTMLInputElement | null) || null;
        const isTarget = radio === target;

        if (isTarget) {
          radio.setAttribute('checked', '');
          radio.setAttribute('aria-checked', 'true');
          if (radioInput) radioInput.checked = true;

          // Update form value for form association
          if (radio instanceof BitRadio) {
            (radio as any).#updateFormValue?.();
          }

          // Emit change event
          radio.dispatchEvent(
            new CustomEvent('change', {
              bubbles: true,
              composed: true,
              detail: {
                checked: true,
                originalEvent,
                value: radio.getAttribute('value'),
              },
            }),
          );
        } else {
          if (radio.hasAttribute('checked')) {
            radio.removeAttribute('checked');
            radio.setAttribute('aria-checked', 'false');
            if (radioInput) radioInput.checked = false;
          }
        }
      });
    };

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Keyboard navigation requires handling multiple arrow keys and radio group coordination
    this.addEventListener('keydown', (keyEvent) => {
      const kbEvent = keyEvent as KeyboardEvent;
      if (this.hasAttribute('disabled')) return;

      const radios = getRadioGroup();
      if (radios.length === 0) return;

      const currentIndex = radios.indexOf(this);
      if (currentIndex === -1) return;

      if (kbEvent.key === ' ' || kbEvent.key === 'Enter') {
        kbEvent.preventDefault();
        if (!this.hasAttribute('checked')) {
          selectRadio(this, keyEvent);
        }
      } else if (kbEvent.key === 'ArrowDown' || kbEvent.key === 'ArrowRight') {
        kbEvent.preventDefault();
        const nextIndex = (currentIndex + 1) % radios.length;
        const nextRadio = radios[nextIndex];
        nextRadio.focus();
        selectRadio(nextRadio, keyEvent);
      } else if (kbEvent.key === 'ArrowUp' || kbEvent.key === 'ArrowLeft') {
        kbEvent.preventDefault();
        const prevIndex = currentIndex === 0 ? radios.length - 1 : currentIndex - 1;
        const prevRadio = radios[prevIndex];
        prevRadio.focus();
        selectRadio(prevRadio, keyEvent);
      }
    });

    // Click interaction
    this.addEventListener('click', (e) => {
      if (this.hasAttribute('disabled')) return;
      if (this.hasAttribute('checked')) return; // Already checked

      selectRadio(this, e);
    });
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null) {
    const input = this.shadowRoot?.querySelector('input') as HTMLInputElement | null;
    if (!input) return;

    if (name === 'checked') {
      const isChecked = newValue !== null;
      input.checked = isChecked;

      // Update aria-checked
      this.setAttribute('aria-checked', isChecked ? 'true' : 'false');
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
    } else if (name === 'name') {
      input.name = newValue || '';
    } else if (name === 'value') {
      input.value = newValue || '';
    }
  }

  render() {
    const isChecked = this.hasAttribute('checked');
    const isDisabled = this.hasAttribute('disabled');
    const name = this.getAttribute('name') || '';
    const value = this.getAttribute('value') || '';

    this.shadowRoot!.innerHTML = /* html */ `
      <style>${styles}</style>
      <div class="radio-wrapper" part="radio">
        <input
          type="radio"
          ${isChecked ? 'checked' : ''}
          ${isDisabled ? 'disabled' : ''}
          name="${name}"
          value="${value}"
          style="display: none;"
          aria-hidden="true"
          tabindex="-1" />
        <div class="circle" part="circle">
          <div class="dot"></div>
        </div>
      </div>
      <span class="label" part="label"><slot></slot></span>
    `;

    this.#updateFormValue();
  }
}

if (!customElements.get('bit-radio')) {
  customElements.define('bit-radio', BitRadio);
}

export default {};
