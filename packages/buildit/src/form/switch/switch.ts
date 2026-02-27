import { css, defineElement, html } from '@vielzeug/craftit';
import { colorThemeMixin, disabledStateMixin, sizeVariantMixin } from '../../styles';
import type { CheckableChangeEventDetail, ComponentSize, ThemeColor } from '../../types';

/**
 * # bit-switch
 *
 * A toggle switch component for binary on/off states.
 *
 * @element bit-switch
 */

const styles = css`
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
 * Switch Change Event Detail
 */
export interface SwitchChangeEvent extends CheckableChangeEventDetail {}

defineElement<HTMLElement, SwitchProps>('bit-switch', {
  observedAttributes: ['checked', 'disabled', 'value', 'name', 'color', 'size'] as const,

  onAttributeChanged(el, name, _oldValue, newValue) {
    const host = el as unknown as HTMLElement;

    if (name === 'checked') {
      const input = host.shadowRoot?.querySelector('input') as HTMLInputElement | null;
      if (input) {
        input.checked = newValue !== null;
      }
      host.setAttribute('aria-checked', newValue !== null ? 'true' : 'false');
    } else if (name === 'disabled') {
      const isDisabled = newValue !== null;
      host.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');

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

    const isChecked = host.hasAttribute('checked');
    const isDisabled = host.hasAttribute('disabled');

    if (input) {
      input.checked = isChecked;
    }

    // Host is the interactive element
    host.setAttribute('role', 'switch');
    host.setAttribute('aria-checked', isChecked ? 'true' : 'false');
    host.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');

    if (!isDisabled && !host.hasAttribute('tabindex')) {
      host.setAttribute('tabindex', '0');
    }

    // Helper to toggle switch state
    const toggleSwitch = (originalEvent: Event) => {
      if (host.hasAttribute('disabled')) return;

      const nextChecked = !host.hasAttribute('checked');

      if (nextChecked) host.setAttribute('checked', '');
      else host.removeAttribute('checked');

      if (input) {
        input.checked = nextChecked;
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
        toggleSwitch(keyEvent);
      }
    });

    el.on('click', (e) => {
      toggleSwitch(e);
    });
  },

  styles: [styles],

  template: (el) => html`
    <div class="switch-wrapper">
      <input
        type="checkbox"
        ?checked="${el.hasAttribute('checked')}"
        ?disabled="${el.hasAttribute('disabled')}"
        name="${el.getAttribute('name')}"
        value="${el.getAttribute('value')}"
        aria-hidden="true"
        tabindex="-1" />
      <div class="switch-track">
        <div class="switch-thumb"></div>
      </div>
    </div>
    <span class="label"><slot></slot></span>
  `,
});

export default {};
