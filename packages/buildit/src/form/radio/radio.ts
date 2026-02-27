import { css, defineElement, html } from '@vielzeug/craftit';
import { colorThemeMixin, disabledStateMixin, sizeVariantMixin } from '../../styles';
import type { CheckableChangeEventDetail, ComponentSize, ThemeColor } from '../../types';

/**
 * # bit-radio
 *
 * A customizable radio button component for mutually exclusive selections.
 *
 * @element bit-radio
 */

const styles = css`
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
 * Radio Change Event Detail
 */
export interface RadioChangeEvent extends CheckableChangeEventDetail {}

defineElement<HTMLInputElement, RadioProps>('bit-radio', {
  observedAttributes: ['checked', 'disabled', 'value', 'name', 'color', 'size'] as const,

  onAttributeChanged(el, name, _oldValue, newValue) {
    const host = el as unknown as HTMLElement;

    if (name === 'checked') {
      const input = host.shadowRoot?.querySelector('input') as HTMLInputElement | null;
      const isChecked = newValue !== null;

      if (input) {
        input.checked = isChecked;
      }

      host.setAttribute('aria-checked', isChecked ? 'true' : 'false');
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

    host.setAttribute('role', 'radio');
    host.setAttribute('aria-checked', isChecked ? 'true' : 'false');
    host.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');

    if (!isDisabled && !host.hasAttribute('tabindex')) {
      host.setAttribute('tabindex', '0');
    }

    // Helper to get all enabled radios in the same group
    const getRadioGroup = (): HTMLElement[] => {
      const radioName = host.getAttribute('name');
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

          // Emit change event - radio is a WebComponent with an emit method
          // biome-ignore lint/suspicious/noExplicitAny: -
          const webComponent = radio as HTMLElement & { emit?: (event: string, detail: any) => void };
          webComponent.emit?.('change', {
            checked: true,
            originalEvent,
            value: radio.getAttribute('value'),
          });
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
    el.on('keydown', (keyEvent) => {
      if (host.hasAttribute('disabled')) return;

      const radios = getRadioGroup();
      if (radios.length === 0) return;

      const currentIndex = radios.indexOf(host);
      if (currentIndex === -1) return;

      if (keyEvent.key === ' ' || keyEvent.key === 'Enter') {
        keyEvent.preventDefault();
        if (!host.hasAttribute('checked')) {
          selectRadio(host, keyEvent);
        }
      } else if (keyEvent.key === 'ArrowDown' || keyEvent.key === 'ArrowRight') {
        keyEvent.preventDefault();
        const nextIndex = (currentIndex + 1) % radios.length;
        const nextRadio = radios[nextIndex];
        nextRadio.focus();
        selectRadio(nextRadio, keyEvent);
      } else if (keyEvent.key === 'ArrowUp' || keyEvent.key === 'ArrowLeft') {
        keyEvent.preventDefault();
        const prevIndex = currentIndex === 0 ? radios.length - 1 : currentIndex - 1;
        const prevRadio = radios[prevIndex];
        prevRadio.focus();
        selectRadio(prevRadio, keyEvent);
      }
    });

    // Click interaction (2 params = host element)
    el.on('click', (e) => {
      if (host.hasAttribute('disabled')) return;
      if (host.hasAttribute('checked')) return; // Already checked

      selectRadio(host, e);
    });
  },

  styles: [styles],

  template: (el) => html`
    <div class="radio-wrapper">
      <input
        type="radio"
        ?checked="${el.hasAttribute('checked')}"
        ?disabled="${el.hasAttribute('disabled')}"
        name="${el.getAttribute('name')}"
        value="${el.getAttribute('value')}"
        style="display: none;"
        aria-hidden="true"
        tabindex="-1" />
      <div class="circle">
        <div class="dot"></div>
      </div>
    </div>
    <span class="label"><slot></slot></span>
  `,
});

export default {};
