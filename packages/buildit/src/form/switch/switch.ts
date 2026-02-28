import { colorThemeMixin, disabledStateMixin, sizeVariantMixin } from '../../styles';
import type { ComponentSize, ThemeColor } from '../../types';

const styles = /* css */ `
  @layer buildit.base {
    :host {
      --_width: var(--switch-width, var(--size-10));
      --_height: var(--switch-height, var(--size-5));
      --_padding: var(--size-0-5);
      --_thumb-size: calc(var(--_height) - var(--_padding) * 2);
      --_track-bg: var(--switch-track, var(--color-contrast-300));
      --_thumb-bg: var(--switch-thumb, white);
      --_font-size: var(--switch-font-size, var(--text-sm));

      display: inline-flex;
      align-items: center;
      gap: var(--_gap, var(--size-2-5));
      min-height: var(--size-11);
      cursor: pointer;
      user-select: none;
      touch-action: manipulation;
    }

    /* ========================================
       Track & Thumb
       ======================================== */

    .switch-wrapper {
      display: flex;
      flex-shrink: 0;
    }

    input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .switch-track {
      position: relative;
      width: var(--_width);
      height: var(--_height);
      background: var(--_track-bg);
      border-radius: var(--rounded-full);
      transition:
        background var(--transition-slower),
        box-shadow var(--transition-normal);
      will-change: background;
    }

    .switch-thumb {
      position: absolute;
      top: var(--_padding);
      left: var(--_padding);
      width: var(--_thumb-size);
      height: var(--_thumb-size);
      background: var(--_thumb-bg);
      border-radius: var(--rounded-full);
      box-shadow: var(--shadow-sm);
      transition:
        transform var(--transition-spring),
        box-shadow var(--transition-normal);
      will-change: transform;
    }

    /* ========================================
       Focus State
       ======================================== */

    input:focus-visible ~ .switch-track {
      box-shadow: var(--_focus-shadow);
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
    /* Map theme variables to switch-specific variables */
    :host {
      --_active-bg: var(--switch-bg, var(--_theme-base));
      --_focus-shadow: var(--_theme-shadow);
    }

    /* ========================================
       Checked State
       ======================================== */

    :host([checked]) .switch-track {
      background: var(--_active-bg);
    }

    :host([checked]) .switch-thumb {
      transform: translateX(calc(var(--_width) - var(--_height)));
    }

    /* ========================================
       Hover & Active States
       ======================================== */

    :host(:hover:not([disabled]):not([checked])) .switch-track {
      background: var(--color-contrast-400);
    }

    :host(:hover:not([disabled])[checked]) .switch-track {
      filter: brightness(1.1);
    }
  }

  ${sizeVariantMixin({
    lg: {
      fontSize: 'var(--text-base)',
      gap: 'var(--size-3)',
      height: 'var(--size-7)',
      thumbSize: 'var(--size-6)',
      width: 'var(--size-14)',
    },
    sm: {
      fontSize: 'var(--text-xs)',
      gap: 'var(--size-2)',
      height: 'var(--size-5)',
      thumbSize: 'var(--size-4)',
      width: 'var(--size-9)',
    },
  })}
`;

/**
 * Switch Component Properties
 *
 * A toggle switch for binary on/off states with smooth animations.
 *
 * ## Slots
 * - **default**: Switch label text
 *
 * ## Events
 * - **change**: Emitted when switch is toggled
 *
 * ## CSS Custom Properties
 * - `--switch-width`: Track width
 * - `--switch-height`: Track height
 * - `--switch-bg`: Background color (checked state)
 * - `--switch-track`: Track background color (unchecked)
 * - `--switch-thumb`: Thumb background color
 * - `--switch-font-size`: Label font size
 *
 * ## Keyboard Support
 * - `Space/Enter`: Toggle switch
 *
 * @example
 * ```html
 * <!-- Basic usage -->
 * <bit-switch checked>Enable feature</bit-switch>
 *
 * <!-- With color -->
 * <bit-switch color="primary">
 *   Dark mode
 * </bit-switch>
 *
 * <!-- Different sizes -->
 * <bit-switch size="sm">Small</bit-switch>
 * <bit-switch size="lg">Large</bit-switch>
 *
 * <!-- Disabled -->
 * <bit-switch checked disabled>
 *   Cannot toggle
 * </bit-switch>
 * ```
 */
export interface SwitchProps {
  /** Checked/on state */
  checked?: boolean;
  /** Disable switch interaction */
  disabled?: boolean;
  /** Field value */
  value?: string;
  /** Form field name */
  name?: string;
  /** Theme color */
  color?: ThemeColor;
  /** Switch size */
  size?: ComponentSize;
}

/**
 * A toggle switch component for binary on/off states.
 *
 * @element bit-switch
 *
 * @attr {boolean} checked - Checked/on state
 * @attr {boolean} disabled - Disable switch interaction
 * @attr {string} value - Field value
 * @attr {string} name - Form field name
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'neutral'
 * @attr {string} size - Switch size: 'sm' | 'md' | 'lg'
 *
 * @fires change - Emitted when switch is toggled
 *
 * @slot - Switch label text
 *
 * @part switch - The switch wrapper element
 * @part track - The switch track element
 * @part thumb - The switch thumb element
 * @part label - The label element
 *
 * @cssprop --switch-width - Track width
 * @cssprop --switch-height - Track height
 * @cssprop --switch-bg - Background color (checked state)
 * @cssprop --switch-track - Track background color (unchecked)
 * @cssprop --switch-thumb - Thumb background color
 * @cssprop --switch-font-size - Label font size
 */
class BitSwitch extends HTMLElement {
  static formAssociated = true;
  static observedAttributes = ['checked', 'disabled', 'value', 'name', 'color', 'size'] as const;

  #internals: ElementInternals;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.#internals = this.attachInternals();
  }

  formResetCallback() {
    this.removeAttribute('checked');
    const input = this.shadowRoot?.querySelector('input') as HTMLInputElement | null;
    if (input) input.checked = false;
    this.setAttribute('aria-checked', 'false');
    this.#updateFormValue();
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (state === 'on') {
      this.setAttribute('checked', '');
      const input = this.shadowRoot?.querySelector('input') as HTMLInputElement | null;
      if (input) input.checked = true;
      this.setAttribute('aria-checked', 'true');
    } else {
      this.removeAttribute('checked');
      const input = this.shadowRoot?.querySelector('input') as HTMLInputElement | null;
      if (input) input.checked = false;
      this.setAttribute('aria-checked', 'false');
    }
    this.#updateFormValue();
  }

  #updateFormValue() {
    if (!this.#internals?.setFormValue) return;
    const isChecked = this.hasAttribute('checked');
    const value = this.getAttribute('value') || 'on';
    this.#internals.setFormValue(isChecked ? value : null, isChecked ? 'on' : 'off');
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

    this.setAttribute('role', 'switch');
    this.setAttribute('aria-checked', isChecked ? 'true' : 'false');
    this.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');

    // Generate unique ID for label association
    const labelId = `switch-label-${Math.random().toString(36).substr(2, 9)}`;
    if (label && label.textContent?.trim()) {
      label.id = labelId;
      this.setAttribute('aria-labelledby', labelId);
    }

    if (!isDisabled && !this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }

    // Helper to toggle switch state
    const toggleSwitch = (originalEvent: Event) => {
      if (this.hasAttribute('disabled')) return;

      const nextChecked = !this.hasAttribute('checked');

      if (nextChecked) this.setAttribute('checked', '');
      else this.removeAttribute('checked');

      if (input) {
        input.checked = nextChecked;
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
        toggleSwitch(keyEvent);
      }
    });

    this.addEventListener('click', (e) => {
      toggleSwitch(e);
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
      this.#updateFormValue();
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
    const name = this.getAttribute('name') || '';
    const value = this.getAttribute('value') || '';

    this.shadowRoot!.innerHTML = /* html */ `
      <style>${styles}</style>
      <div class="switch-wrapper" part="switch">
        <input
          type="checkbox"
          ${isChecked ? 'checked' : ''}
          ${isDisabled ? 'disabled' : ''}
          name="${name}"
          value="${value}"
          aria-hidden="true"
          tabindex="-1" />
        <div class="switch-track" part="track">
          <div class="switch-thumb" part="thumb"></div>
        </div>
      </div>
      <span class="label" part="label"><slot></slot></span>
    `;
    this.#updateFormValue();
  }
}

if (!customElements.get('bit-switch')) {
  customElements.define('bit-switch', BitSwitch);
}

export default {};
