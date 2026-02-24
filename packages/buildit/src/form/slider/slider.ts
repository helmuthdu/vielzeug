import { css, defineElement, html } from '@vielzeug/craftit';

/**
 * bit-slider - A range slider component
 *
 * @element bit-slider
 *
 * @attr {number} min - Minimum value (default: 0)
 * @attr {number} max - Maximum value (default: 100)
 * @attr {number} step - Step increment (default: 1)
 * @attr {number} value - Current value
 * @attr {boolean} disabled - Disable the slider
 * @attr {string} name - Form field name
 * @attr {string} color - Color theme: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} size - Slider size: 'sm' | 'md' | 'lg'
 *
 * @slot - Default slot for slider label
 *
 * @cssprop --slider-track-height - Height of the slider track
 * @cssprop --slider-thumb-size - Size of the slider thumb
 * @cssprop --slider-track-bg - Background color of the track
 * @cssprop --slider-thumb-bg - Background color of the thumb
 *
 * @fires change - Emitted when value changes
 *   detail: { value: number; originalEvent: Event }
 */

const styles = css`
  /* ========================================
     Base Styles & Defaults
     ======================================== */

  :host {
    --_track-height: var(--slider-track-height, var(--size-1-5));
    --_thumb-size: var(--slider-thumb-size, var(--size-5));
    --_track-bg: var(--slider-track-bg, var(--color-contrast-300));
    --_fill-bg: var(--slider-fill-bg, var(--color-neutral));
    --_thumb-bg: var(--slider-thumb-bg, var(--color-contrast-100));
    --_font-size: var(--text-sm);
    --_shadow: var(--color-neutral-focus-shadow);

    align-items: center;
    cursor: pointer;
    display: inline-flex;
    gap: var(--size-3);
    min-height: var(--size-11);
    position: relative;
    touch-action: none;
    user-select: none;
    width: 100%;
  }

  :host([disabled]) {
    cursor: not-allowed;
    opacity: 0.5;
    pointer-events: none;
  }

  /* ========================================
     Track, Fill & Thumb
     ======================================== */

  .slider-container {
    align-items: center;
    display: flex;
    flex: 1;
    height: var(--_thumb-size);
    position: relative;
    width: 100%;
  }

  .slider-track {
    background: var(--_track-bg);
    border-radius: var(--rounded-full);
    height: var(--_track-height);
    position: relative;
    width: 100%;
  }

  .slider-fill {
    background: var(--_fill-bg);
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
    background: var(--_thumb-bg);
    border: 2px solid var(--_fill-bg);
    border-radius: var(--rounded-full);
    box-shadow: var(--shadow-sm);
    height: var(--_thumb-size);
    left: var(--_progress, 0%);
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    transition: 
      box-shadow var(--transition-normal), 
      transform var(--transition-fast),
      left var(--transition-normal);
    width: var(--_thumb-size);
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
     Color Themes (Default: Neutral)
     ======================================== */

  :host([color='primary']) {
    --_fill-bg: var(--color-primary);
    --_shadow: var(--color-primary-focus-shadow);
  }

  :host([color='secondary']) {
    --_fill-bg: var(--color-secondary);
    --_shadow: var(--color-secondary-focus-shadow);
  }

  :host([color='info']) {
    --_fill-bg: var(--color-info);
    --_shadow: var(--color-info-focus-shadow);
  }

  :host([color='success']) {
    --_fill-bg: var(--color-success);
    --_shadow: var(--color-success-focus-shadow);
  }

  :host([color='warning']) {
    --_fill-bg: var(--color-warning);
    --_shadow: var(--color-warning-focus-shadow);
  }

  :host([color='error']) {
    --_fill-bg: var(--color-error);
    --_shadow: var(--color-error-focus-shadow);
  }

  /* ========================================
     Size Variants
     ======================================== */

  :host([size='sm']) {
    --_track-height: var(--size-1);
    --_thumb-size: var(--size-4);
    --_font-size: var(--text-xs);
  }

  :host([size='lg']) {
    --_track-height: var(--size-2);
    --_thumb-size: var(--size-6);
    --_font-size: var(--text-base);
  }

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

export type SliderProps = {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  disabled?: boolean;
  name?: string;
  color?: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
};

defineElement<HTMLElement, SliderProps>('bit-slider', {
  observedAttributes: ['min', 'max', 'step', 'value', 'disabled', 'name', 'color', 'size'] as const,

  onAttributeChanged(el, name, _oldValue, newValue) {
    const host = el as unknown as HTMLElement;

    if (name === 'value' || name === 'min' || name === 'max') {
      const min = Number(host.getAttribute('min') || 0);
      const max = Number(host.getAttribute('max') || 100);
      const val = Number(host.getAttribute('value') || 0);
      const progress = ((val - min) / (max - min)) * 100;
      host.style.setProperty('--_progress', `${progress}%`);
      host.setAttribute('aria-valuenow', val.toString());
    }

    if (name === 'disabled') {
      const isDisabled = newValue !== null;
      host.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
      isDisabled ? host.removeAttribute('tabindex') : host.setAttribute('tabindex', '0');
    }
  },

  onConnected(el) {
    const host = el as unknown as HTMLElement;

    const min = Number(host.getAttribute('min') || 0);
    const max = Number(host.getAttribute('max') || 100);
    const val = Number(host.getAttribute('value') || 0);
    const isDisabled = host.hasAttribute('disabled');

    // Helper to calculate progress percentage
    const calculateProgress = (value: number, min: number, max: number): number => {
      return ((value - min) / (max - min)) * 100;
    };

    // Helper to update UI (progress bar and ARIA)
    const updateUI = (value: number) => {
      const min = Number(host.getAttribute('min') || 0);
      const max = Number(host.getAttribute('max') || 100);
      const progress = calculateProgress(value, min, max);
      host.style.setProperty('--_progress', `${progress}%`);
      host.setAttribute('aria-valuenow', value.toString());
    };

    // Set initial progress
    updateUI(val);

    host.setAttribute('role', 'slider');
    host.setAttribute('aria-valuemin', min.toString());
    host.setAttribute('aria-valuemax', max.toString());
    host.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');

    if (!isDisabled) {
      host.setAttribute('tabindex', '0');
    }

    const updateValue = (clientX: number) => {
      if (host.hasAttribute('disabled')) return;

      const container = host.shadowRoot?.querySelector('.slider-container') as HTMLElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const min = Number(host.getAttribute('min') || 0);
      const max = Number(host.getAttribute('max') || 100);
      const step = Number(host.getAttribute('step') || 1);

      let percentage = (clientX - rect.left) / rect.width;
      percentage = Math.max(0, Math.min(1, percentage));

      let newValue = min + percentage * (max - min);
      newValue = Math.round(newValue / step) * step;
      newValue = Math.max(min, Math.min(max, newValue));

      if (Number(host.getAttribute('value')) !== newValue) {
        host.setAttribute('value', newValue.toString());
        updateUI(newValue);
        el.emit('change', { value: newValue, originalEvent: new CustomEvent('change') });
      }
    };

    let isDragging = false;

    // Use delegation on the slider container to catch events from shadow DOM elements
    el.on('.slider-container', 'pointerdown', (e) => {
      if (host.hasAttribute('disabled')) return;
      e.preventDefault();
      isDragging = true;
      updateValue(e.clientX);
      const target = e.target as Element;
      target.setPointerCapture(e.pointerId);
    });

    el.on('.slider-container', 'pointermove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      // Set the dragging state on the first move to disable transitions
      if (!host.hasAttribute('data-dragging')) {
        host.setAttribute('data-dragging', '');
      }
      updateValue(e.clientX);
    });

    el.on('.slider-container', 'pointerup', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      isDragging = false;
      host.removeAttribute('data-dragging');
      const target = e.target as Element;
      target.releasePointerCapture(e.pointerId);
    });

    el.on('keydown', (e) => {
      if (host.hasAttribute('disabled')) return;

      const min = Number(host.getAttribute('min') || 0);
      const max = Number(host.getAttribute('max') || 100);
      const step = Number(host.getAttribute('step') || 1);
      const val = Number(host.getAttribute('value') || 0);
      let newValue = val;

      switch (e.key) {
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
        host.setAttribute('value', newValue.toString());
        updateUI(newValue);
        el.emit('change', { value: newValue, originalEvent: e });
      }
    });
  },

  styles: [styles],

  template: (el) => html`
    <div class="slider-container">
      <input
        type="range"
        min="${el.getAttribute('min') || '0'}"
        max="${el.getAttribute('max') || '100'}"
        step="${el.getAttribute('step') || '1'}"
        .value="${el.getAttribute('value') || '0'}"
        ?disabled="${el.hasAttribute('disabled')}"
        name="${el.getAttribute('name')}"
        aria-hidden="true"
        tabindex="-1" />
      <div class="slider-track">
        <div class="slider-fill"></div>
        <div class="slider-thumb"></div>
      </div>
    </div>
    <span class="label"><slot></slot></span>
  `,
});

export default {};

