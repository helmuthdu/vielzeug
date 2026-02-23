import { css, defineElement, html } from '@vielzeug/craftit';

/**
 * bit-radio - A customizable radio button component
 *
 * @element bit-radio
 *
 * @attr {boolean} checked - Radio button checked state
 * @attr {boolean} disabled - Disable the radio button
 * @attr {string} value - Radio button value
 * @attr {string} name - Form field name (required for grouping)
 * @attr {string} color - Radio button color theme: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
 * @attr {string} size - Radio button size: 'sm' | 'md' | 'lg'
 *
 * @slot - Default slot for radio button label
 *
 * @cssprop --radio-size - Size of the radio circle
 * @cssprop --radio-bg - Background color
 * @cssprop --radio-border - Border style
 * @cssprop --radio-checked-bg - Background color when checked
 * @cssprop --radio-color - Dot color
 *
 * @fires change - Emitted when checked state changes.
 *   detail: { checked: true; value: string | null; originalEvent: Event }
 */

const styles = css`
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
    gap: var(--size-2);
    cursor: pointer;
    user-select: none;
  }

  :host([disabled]) {
    cursor: not-allowed;
    opacity: 0.5;
    pointer-events: none;
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
     Color Themes
     ======================================== */

  :host(:not([color])),
  :host([color='primary']) {
    --_active-bg: var(--radio-checked-bg, var(--color-primary));
    --_dot-color: var(--radio-color, var(--color-primary-contrast));
    --_focus-shadow: var(--color-primary-shadow);
  }

  :host([color='secondary']) {
    --_active-bg: var(--radio-checked-bg, var(--color-secondary));
    --_dot-color: var(--radio-color, var(--color-secondary-contrast));
    --_focus-shadow: var(--color-secondary-shadow);
  }

  :host([color='success']) {
    --_active-bg: var(--radio-checked-bg, var(--color-success));
    --_dot-color: var(--radio-color, var(--color-success-contrast));
    --_focus-shadow: var(--color-success-shadow);
  }

  :host([color='warning']) {
    --_active-bg: var(--radio-checked-bg, var(--color-warning));
    --_dot-color: var(--radio-color, var(--color-warning-contrast));
    --_focus-shadow: var(--color-warning-shadow);
  }

  :host([color='error']) {
    --_active-bg: var(--radio-checked-bg, var(--color-error));
    --_dot-color: var(--radio-color, var(--color-error-contrast));
    --_focus-shadow: var(--color-error-shadow);
  }

  /* ========================================
     Checked State
     ======================================== */

  :host([checked]) .circle {
    background: var(--_active-bg);
    border-color: var(--_active-bg);
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

  :host([checked]) .dot {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }

  /* ========================================
     Size Variants
     ======================================== */

  :host([size='sm']) {
    --_size: var(--size-4);
    --_font-size: var(--text-xs);
  }

  :host([size='lg']) {
    --_size: var(--size-6);
    --_font-size: var(--text-base);
  }

  /* ========================================
     Label
     ======================================== */

  .label {
    font-size: var(--_font-size);
    color: var(--color-contrast);
  }
`;

export type RadioProps = {
  checked?: boolean;
  disabled?: boolean;
  value?: string;
  name?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
};

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

    const selectRadio = (target: HTMLElement, originalEvent: Event | KeyboardEvent) => {
      const radioName = target.getAttribute('name');
      if (!radioName) return;

      const radios = Array.from(document.querySelectorAll<HTMLElement>(`bit-radio[name="${radioName}"]`)).filter(
        (r) => !r.hasAttribute('disabled'),
      );

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

      const radioName = host.getAttribute('name');
      if (!radioName) return;

      const radios = Array.from(document.querySelectorAll<HTMLElement>(`bit-radio[name="${radioName}"]`)).filter(
        (r) => !r.hasAttribute('disabled'),
      );

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
        name="${el.getAttribute('name') || ''}"
        value="${el.getAttribute('value') || ''}"
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
