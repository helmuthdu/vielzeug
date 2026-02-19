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
 * @fires change - Emitted when checked state changes
 */

const styles = css`
  :host {
    display: inline-flex;
    align-items: center;
    gap: var(--size-2);
    cursor: pointer;
    user-select: none;
    --radio-size: var(--size-5);
    --radio-font-size: var(--text-sm);
  }

  :host([disabled]) {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .radio-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--radio-size);
    height: var(--radio-size);
    flex-shrink: 0;
  }

  input {
    display: none;
  }

  .circle {
    width: 100%;
    height: 100%;
    border: var(--border-2) solid var(--radio-border-color, var(--color-contrast-low));
    border-radius: 50%;
    background: var(--radio-bg, var(--color-contrast-200));
    transition: all 150ms ease-in-out;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    position: relative;
  }

  /* Colors */
  :host(:not([color])) .circle,
  :host([color='primary']) .circle {
    --radio-base: var(--color-primary);
    --radio-contrast: var(--color-primary-contrast);
    --radio-focus: var(--color-primary-focus);
  }

  :host([color='secondary']) .circle {
    --radio-base: var(--color-secondary-base);
    --radio-contrast: var(--color-secondary-contrast);
    --radio-focus: var(--color-secondary-focus);
  }

  :host([color='success']) .circle {
    --radio-base: var(--color-success);
    --radio-contrast: var(--color-success-contrast);
    --radio-focus: var(--color-success-focus);
  }

  :host([color='warning']) .circle {
    --radio-base: var(--color-warning);
    --radio-contrast: var(--color-warning-contrast);
    --radio-focus: var(--color-warning-focus);
  }

  :host([color='error']) .circle {
    --radio-base: var(--color-error);
    --radio-contrast: var(--color-error-contrast);
    --radio-focus: var(--color-error-focus);
  }

  /* States */
  :host([checked]) .circle {
    background: var(--radio-checked-bg, var(--radio-base));
    border-color: var(--radio-checked-bg, var(--radio-base));
  }

  input:focus-visible + .circle {
    outline: var(--border-2) solid var(--radio-focus);
    outline-offset: var(--border-2);
  }

  /* Inner dot */
  .dot {
    width: 50%;
    height: 50%;
    border-radius: 50%;
    background: var(--radio-color, var(--radio-contrast));
    opacity: 0;
    transform: scale(0.5);
    transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  :host([checked]) .dot {
    opacity: 1;
    transform: scale(1);
  }

  /* Sizes */
  :host([size='sm']) {
    --radio-size: var(--size-4);
    --radio-font-size: var(--text-xs);
  }

  :host([size='lg']) {
    --radio-size: var(--size-6);
    --radio-font-size: var(--text-md);
  }

  .label {
    font-size: var(--radio-font-size);
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
      const input = host.shadowRoot?.querySelector('input');
      if (input) {
        input.checked = newValue !== null;
      }
      host.setAttribute('aria-checked', newValue !== null ? 'true' : 'false');
    }
  },

  onConnected(el) {
    const host = el as unknown as HTMLElement;
    const input = host.shadowRoot?.querySelector('input');

    // Set initial state
    const isChecked = host.hasAttribute('checked');
    const isDisabled = host.hasAttribute('disabled');

    if (input) {
      input.checked = isChecked;
    }

    // Host is the interactive element
    host.setAttribute('role', 'radio');
    host.setAttribute('aria-checked', isChecked ? 'true' : 'false');
    host.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
    if (!isDisabled && !host.hasAttribute('tabindex')) {
      host.setAttribute('tabindex', '0');
    }

    // Handle keydown for accessibility
    host.addEventListener('keydown', (e: KeyboardEvent) => {
      if (host.hasAttribute('disabled')) return;

      const radioName = host.getAttribute('name');
      if (!radioName) return;

      const radios = Array.from(document.querySelectorAll(`bit-radio[name="${radioName}"]`)).filter(
        (r) => !r.hasAttribute('disabled'),
      );
      const currentIndex = radios.indexOf(host);

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!host.hasAttribute('checked')) {
          host.setAttribute('checked', '');
          if (input) input.checked = true;
          host.setAttribute('aria-checked', 'true');
          el.emit('change', { checked: true, originalEvent: e, value: host.getAttribute('value') });
        }
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % radios.length;
        const nextRadio = radios[nextIndex] as HTMLElement;
        nextRadio.focus();
        nextRadio.setAttribute('checked', '');
        nextRadio.dispatchEvent(new CustomEvent('change', {
          detail: { checked: true, value: nextRadio.getAttribute('value') },
          bubbles: true,
          composed: true,
        }));
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIndex = currentIndex === 0 ? radios.length - 1 : currentIndex - 1;
        const prevRadio = radios[prevIndex] as HTMLElement;
        prevRadio.focus();
        prevRadio.setAttribute('checked', '');
        prevRadio.dispatchEvent(new CustomEvent('change', {
          detail: { checked: true, value: prevRadio.getAttribute('value') },
          bubbles: true,
          composed: true,
        }));
      }
    });

    // Handle host click to select
    host.addEventListener('click', (e) => {
      if (host.hasAttribute('disabled')) return;
      if (host.hasAttribute('checked')) return; // Already checked, do nothing

      // Uncheck other radios in the same group
      const radioName = host.getAttribute('name');
      if (radioName) {
        const radios = document.querySelectorAll(`bit-radio[name="${radioName}"]`);
        radios.forEach((radio) => {
          if (radio !== host) {
            radio.removeAttribute('checked');
          }
        });
      }

      host.setAttribute('checked', '');

      if (input) {
        input.checked = true;
      }

      host.setAttribute('aria-checked', 'true');
      el.emit('change', { checked: true, originalEvent: e, value: host.getAttribute('value') });
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



