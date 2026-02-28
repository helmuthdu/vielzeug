import { colorThemeMixin, disabledStateMixin, sizeVariantMixin } from '../../styles';
import type { ComponentSize, ThemeColor } from '../../types';
import { setupLabelAssociation } from '../../utils/common';
import { FormFieldController } from '../../utils/controllers';

const styles = /* css */ `
  @layer buildit.base {
    /* ========================================
       Base Styles & Defaults
       ======================================== */

    :host {
      --_size: var(--slider-size, var(--size-5));
      --_height: var(--slider-height, calc(var(--size-5) / 3));
      --_track: var(--slider-track, var(--color-contrast-300));
      --_fill: var(--slider-fill, var(--color-neutral));
      --_thumb: var(--slider-thumb, var(--color-contrast-100));
      --_font-size: var(--text-sm);
      --_shadow: var(--color-neutral-focus-shadow);

      align-items: center;
      cursor: pointer;
      display: inline-flex;
      gap: var(--_gap, var(--size-3));
      min-height: var(--size-11);
      position: relative;
      touch-action: none;
      user-select: none;
      width: 100%;
    }
  }

  /* ========================================
     States (Shared Mixin)
     ======================================== */

  ${disabledStateMixin()}

  /* ========================================
     Track, Fill & Thumb
     ======================================== */

  .slider-container {
    align-items: center;
    display: flex;
    flex: 1;
    height: var(--_size);
    position: relative;
    width: 100%;
  }

  .slider-track {
    background: var(--_track);
    border-radius: var(--rounded-full);
    height: var(--_height);
    position: relative;
    width: 100%;
  }

  .slider-fill {
    background: var(--_fill);
    border-radius: var(--rounded-full);
    height: 100%;
    left: 0;
    position: absolute;
    top: 0;
    width: var(--_progress, 0%);
    transition: width var(--transition-normal);
  }

  /* Disable transitions during dragging for responsive feel */
  :host([data-dragging]) .slider-fill {
    transition: none;
  }

  .slider-thumb {
    background: var(--_thumb);
    border: 2px solid var(--_fill);
    border-radius: var(--rounded-full);
    box-shadow: var(--shadow-sm);
    height: var(--_size);
    left: var(--_progress, 0%);
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    transition:
      box-shadow var(--transition-normal),
      transform var(--transition-fast),
      left var(--transition-normal);
    width: var(--_size);
    z-index: 1;
  }

  /* Disable transitions during dragging for responsive feel */
  :host([data-dragging]) .slider-thumb {
    transition: box-shadow var(--transition-normal), transform var(--transition-fast);
  }

  :host(:focus-visible) .slider-thumb,
  :host(:active) .slider-thumb {
    box-shadow: var(--_shadow);
    transform: translate(-50%, -50%) scale(1.1);
  }

  /* ========================================
     Color Themes (Shared Mixin)
     ======================================== */

  ${colorThemeMixin()}

  @layer buildit.overrides {
    /* Map theme variables to slider-specific variables */
    :host {
      --_fill: var(--slider-fill, var(--_theme-base));
      --_shadow: var(--_theme-shadow);
    }
  }

  ${sizeVariantMixin({
    lg: {
      fontSize: 'var(--text-base)',
      size: 'var(--size-6)',
    },
    sm: {
      fontSize: 'var(--text-xs)',
      size: 'var(--size-4)',
    },
  })}

  /* ========================================
     Label & Hidden Input
     ======================================== */

  input {
    opacity: 0;
    pointer-events: none;
    position: absolute;
  }

  .label {
    color: var(--color-contrast);
    font-size: var(--_font-size);
    white-space: nowrap;
  }
`;

/** Slider component properties */
export interface SliderProps {
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Current value */
  value?: number;
  /** Disable slider interaction */
  disabled?: boolean;
  /** Form field name */
  name?: string;
  /** Theme color */
  color?: ThemeColor;
  /** Slider size */
  size?: ComponentSize;
}

/**
 * A range slider component for selecting numeric values.
 *
 * @element bit-slider
 *
 * @attr {number} min - Minimum value
 * @attr {number} max - Maximum value
 * @attr {number} step - Step increment
 * @attr {number} value - Current value
 * @attr {boolean} disabled - Disable slider interaction
 * @attr {string} name - Form field name
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'neutral'
 * @attr {string} size - Slider size: 'sm' | 'md' | 'lg'
 *
 * @fires change - Emitted when slider value changes (on release)
 * @fires input - Emitted continuously while slider is being draged
 *
 * @slot - Slider label text
 *
 * @part slider - The slider container element
 * @part track - The slider track element
 * @part fill - The slider fill (progress) element
 * @part thumb - The slider thumb element
 * @part label - The label element
 *
 * @cssprop --slider-height - Track height
 * @cssprop --slider-size - Thumb dimensions
 * @cssprop --slider-track - Track background color
 * @cssprop --slider-fill - Fill (progress) background color
 * @cssprop --slider-thumb - Thumb background color
 *
 * @example
 * ```html
 * <bit-slider min="0" max="100" value="50">Volume</bit-slider>
 * <bit-slider min="0" max="10" step="0.5" color="primary">Rating</bit-slider>
 * <bit-slider size="lg" value="70">Large</bit-slider>
 * ```
 */
class BitSlider extends HTMLElement {
  static formAssociated = true;
  static observedAttributes = ['min', 'max', 'step', 'value', 'disabled', 'name', 'color', 'size'] as const;

  private formField = new FormFieldController(this, {
    getInput: () => this.shadowRoot?.querySelector('input[type="range"]') ?? null,
  });

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  // ============================================
  // Constraint Validation API (delegated to controller)
  // ============================================

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

    const min = Number(this.getAttribute('min') || 0);
    const max = Number(this.getAttribute('max') || 100);
    const val = Number(this.getAttribute('value') || 0);
    const isDisabled = this.hasAttribute('disabled');

    // Helper to calculate progress percentage
    const calculateProgress = (value: number, min: number, max: number): number => {
      return ((value - min) / (max - min)) * 100;
    };

    // Helper to update UI (progress bar and ARIA)
    const updateUI = (value: number) => {
      const min = Number(this.getAttribute('min') || 0);
      const max = Number(this.getAttribute('max') || 100);
      const progress = calculateProgress(value, min, max);
      this.style.setProperty('--_progress', `${progress}%`);
      this.setAttribute('aria-valuenow', value.toString());
    };

    // Set initial progress
    updateUI(val);

    this.setAttribute('role', 'slider');
    this.setAttribute('aria-valuemin', min.toString());
    this.setAttribute('aria-valuemax', max.toString());
    this.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');

    // Setup label association
    setupLabelAssociation(this.shadowRoot, this, 'slider');

    if (!isDisabled) {
      this.setAttribute('tabindex', '0');
    }

    const updateValue = (clientX: number) => {
      if (this.hasAttribute('disabled')) return;

      const container = this.shadowRoot?.querySelector('.slider-container') as HTMLElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const min = Number(this.getAttribute('min') || 0);
      const max = Number(this.getAttribute('max') || 100);
      const step = Number(this.getAttribute('step') || 1);

      let percentage = (clientX - rect.left) / rect.width;
      percentage = Math.max(0, Math.min(1, percentage));

      let newValue = min + percentage * (max - min);
      newValue = Math.round(newValue / step) * step;
      newValue = Math.max(min, Math.min(max, newValue));

      if (Number(this.getAttribute('value')) !== newValue) {
        this.setAttribute('value', newValue.toString());
        updateUI(newValue);
        this.formField.setFormValue(newValue.toString());
        this.dispatchEvent(
          new CustomEvent('change', {
            bubbles: true,
            composed: true,
            detail: { originalEvent: new CustomEvent('change'), value: newValue },
          }),
        );
      }
    };

    let isDragging = false;

    const container = this.shadowRoot?.querySelector('.slider-container') as HTMLElement;
    if (container) {
      container.addEventListener('pointerdown', (e) => {
        if (this.hasAttribute('disabled')) return;
        e.preventDefault();
        isDragging = true;
        updateValue(e.clientX);
        const target = e.target as Element;
        target.setPointerCapture(e.pointerId);
      });

      container.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        // Set the dragging state on the first move to disable transitions
        if (!this.hasAttribute('data-dragging')) {
          this.setAttribute('data-dragging', '');
        }
        updateValue(e.clientX);
      });

      container.addEventListener('pointerup', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        isDragging = false;
        this.removeAttribute('data-dragging');
        const target = e.target as Element;
        target.releasePointerCapture(e.pointerId);
      });
    }

    this.addEventListener('keydown', (e) => {
      const kbEvent = e as KeyboardEvent;
      if (this.hasAttribute('disabled')) return;

      const min = Number(this.getAttribute('min') || 0);
      const max = Number(this.getAttribute('max') || 100);
      const step = Number(this.getAttribute('step') || 1);
      const val = Number(this.getAttribute('value') || 0);
      let newValue = val;

      switch (kbEvent.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          newValue = Math.min(max, val + step);
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          newValue = Math.max(min, val - step);
          break;
        case 'Home':
          newValue = min;
          break;
        case 'End':
          newValue = max;
          break;
        default:
          return;
      }

      e.preventDefault();
      if (newValue !== val) {
        this.setAttribute('value', newValue.toString());
        updateUI(newValue);
        this.formField.setFormValue(newValue.toString());
        this.dispatchEvent(
          new CustomEvent('change', {
            bubbles: true,
            composed: true,
            detail: { originalEvent: e, value: newValue },
          }),
        );
      }
    });
  }

  disconnectedCallback() {
    this.formField.hostDisconnected();
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null) {
    const input = this.shadowRoot?.querySelector('input[type="range"]') as HTMLInputElement | null;
    const hiddenInput = this.shadowRoot?.querySelector('input[type="hidden"]') as HTMLInputElement | null;
    if (!input) return;

    if (name === 'value') {
      const val = newValue || '0';
      input.value = val;
      if (hiddenInput) hiddenInput.value = val;

      // Update progress bar and aria-valuenow
      const min = Number(this.getAttribute('min') || 0);
      const max = Number(this.getAttribute('max') || 100);
      const numVal = Number(val);
      const progress = ((numVal - min) / (max - min)) * 100;
      this.style.setProperty('--_progress', `${progress}%`);
      this.setAttribute('aria-valuenow', val);
      this.formField.setFormValue(val);
    } else if (name === 'min' || name === 'max') {
      input.setAttribute(name, newValue || '0');

      // Update aria attributes
      if (name === 'min') {
        this.setAttribute('aria-valuemin', newValue || '0');
      } else {
        this.setAttribute('aria-valuemax', newValue || '100');
      }

      // Recalculate progress
      const min = Number(this.getAttribute('min') || 0);
      const max = Number(this.getAttribute('max') || 100);
      const val = Number(this.getAttribute('value') || 0);
      const progress = ((val - min) / (max - min)) * 100;
      this.style.setProperty('--_progress', `${progress}%`);
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
    } else if (name === 'step') {
      input.step = newValue || '1';
    } else if (name === 'name' && hiddenInput) {
      hiddenInput.name = newValue || '';
    }
  }

  render() {
    const min = this.getAttribute('min') || '0';
    const max = this.getAttribute('max') || '100';
    const step = this.getAttribute('step') || '1';
    const value = this.getAttribute('value') || '0';
    const isDisabled = this.hasAttribute('disabled');
    const name = this.getAttribute('name') || '';

    this.shadowRoot!.innerHTML = /* html */ `
      <style>${styles}</style>
      <div class="slider-container" part="slider">
        <input
          type="range"
          min="${min}"
          max="${max}"
          step="${step}"
          value="${value}"
          ${isDisabled ? 'disabled' : ''}
          name="${name}"
          aria-hidden="true"
          tabindex="-1" />
        <div class="slider-track" part="track">
          <div class="slider-fill" part="fill"></div>
          <div class="slider-thumb" part="thumb"></div>
        </div>
      </div>
      <span class="label" part="label"><slot></slot></span>
    `;
    this.formField.setFormValue(value);
  }
}

if (!customElements.get('bit-slider')) {
  customElements.define('bit-slider', BitSlider);
}

export default {};
