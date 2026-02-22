import { css, defineElement, html } from '@vielzeug/craftit';

/**
 * bit-switch - A toggle switch component
 *
 * @element bit-switch
 *
 * @attr {boolean} checked - Switch checked state
 * @attr {boolean} disabled - Disable the switch
 * @attr {string} value - Switch value
 * @attr {string} name - Form field name
 * @attr {string} color - Color theme: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
 * @attr {string} size - Switch size: 'sm' | 'md' | 'lg'
 *
 * @slot - Default slot for switch label
 *
 * @cssprop --switch-width - Width of the switch track
 * @cssprop --switch-height - Height of the switch track
 * @cssprop --switch-bg - Background color when checked
 * @cssprop --switch-track-bg - Background color of the track (default: --color-contrast-300)
 * @cssprop --switch-thumb-bg - Background color of the thumb (default: white)
 * @cssprop --switch-font-size - Font size of the label
 *
 * @fires change - Emitted when checked state changes
 *   detail: { checked: boolean; value: string | null; originalEvent: Event }
 */

const styles = css`
  /* ========================================
     Base Styles & Defaults
     ======================================== */

  :host {
    --switch-width: var(--size-10);
    --switch-height: var(--size-5);
    --switch-font-size: var(--text-sm);
    --switch-thumb-padding: var(--size-0-5);
    --switch-thumb-expansion: var(--size-1);
    display: inline-flex;
    align-items: center;
    gap: var(--size-2-5);
    cursor: pointer;
    user-select: none;
    min-height: var(--size-11);
    touch-action: manipulation;
    transition: opacity var(--transition-fast);
  }

  :host([disabled]) {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .switch-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .switch-track {
    position: relative;
    width: var(--switch-width);
    height: var(--switch-height);
    border-radius: var(--rounded-full);
    background: var(--color-contrast-300);
    transition: background var(--transition-normal), box-shadow var(--transition-normal);
    box-sizing: border-box;
  }

  :host([checked]) .switch-track {
    background: var(--switch-background, var(--switch-base));
  }

  :host(:hover:not([checked]):not([disabled])) .switch-track {
    background: var(--color-contrast-400);
  }

  :host([checked]:hover:not([disabled])) .switch-track {
    filter: brightness(1.1);
  }

  .switch-thumb {
    position: absolute;
    top: 50%;
    left: var(--switch-thumb-padding);
    width: calc(var(--switch-height) - (var(--switch-thumb-padding) * 2));
    height: calc(var(--switch-height) - (var(--switch-thumb-padding) * 2));
    border-radius: var(--rounded-full);
    background: var(--switch-thumb-bg, white);
    transition: transform var(--transition-spring), width var(--transition-fast);
    box-shadow: var(--shadow-sm);
    transform: translateY(-50%);
  }

  :host(:active:not([disabled])) .switch-thumb {
    width: calc(var(--switch-height) - (var(--switch-thumb-padding) * 2) + var(--switch-thumb-expansion));
  }

  /* ========================================
     Color Themes
     ======================================== */

  :host(:not([color])) .switch-track,
  :host([color='primary']) .switch-track {
    --switch-base: var(--color-primary);
    --switch-contrast: var(--color-primary-contrast);
    --switch-focus: var(--color-primary-focus);
  }

  :host([color='secondary']) .switch-track {
    --switch-base: var(--color-secondary);
    --switch-contrast: var(--color-secondary-contrast);
    --switch-focus: var(--color-secondary-focus);
  }

  :host([color='success']) .switch-track {
    --switch-base: var(--color-success);
    --switch-contrast: var(--color-success-contrast);
    --switch-focus: var(--color-success-focus);
  }

  :host([color='warning']) .switch-track {
    --switch-base: var(--color-warning);
    --switch-contrast: var(--color-warning-contrast);
    --switch-focus: var(--color-warning-focus);
  }

  :host([color='error']) .switch-track {
    --switch-base: var(--color-error);
    --switch-contrast: var(--color-error-contrast);
    --switch-focus: var(--color-error-focus);
  }

  /* ========================================
     States
     ======================================== */

  :host([checked]) .switch-thumb {
    transform: translate(calc(var(--switch-width) - var(--switch-height)), -50%);
  }

  :host([checked]:active:not([disabled])) .switch-thumb {
    transform: translate(calc(var(--switch-width) - var(--switch-height) - var(--switch-thumb-expansion)), -50%);
  }

  input:focus-visible ~ .switch-track {
    outline: none;
    box-shadow: var(--switch-shadow, var(--color-primary-shadow));
  }

  /* ========================================
     Size Variants
     ======================================== */

  :host([size='sm']) {
    --switch-width: var(--size-8);
    --switch-height: var(--size-4);
    --switch-font-size: var(--text-xs);
  }

  :host([size='lg']) {
    --switch-width: var(--size-12);
    --switch-height: var(--size-6);
    --switch-font-size: var(--text-md);
  }

  /* ========================================
     Label
     ======================================== */

  .label {
    font-size: var(--switch-font-size);
    color: var(--color-contrast);
  }
`;

export type SwitchProps = {
  checked?: boolean;
  disabled?: boolean;
  value?: string;
  name?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
};

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

    // Keyboard interaction
    host.addEventListener('keydown', (e: KeyboardEvent) => {
      if (host.hasAttribute('disabled')) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        const nextChecked = !host.hasAttribute('checked');

        if (nextChecked) host.setAttribute('checked', '');
        else host.removeAttribute('checked');

        if (input) {
          input.checked = nextChecked;
        }

        host.setAttribute('aria-checked', nextChecked ? 'true' : 'false');
        el.emit('change', {
          checked: nextChecked,
          originalEvent: e,
          value: host.getAttribute('value'),
        });
      }
    });

    // Mouse / pointer interaction
    host.addEventListener('click', (e) => {
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
        originalEvent: e,
        value: host.getAttribute('value'),
      });
    });
  },

  styles: [styles],

  template: (el) => html`
    <div class="switch-wrapper">
      <input
        type="checkbox"
        ?checked="${el.hasAttribute('checked')}"
        ?disabled="${el.hasAttribute('disabled')}"
        name="${el.getAttribute('name') || ''}"
        value="${el.getAttribute('value') || ''}"
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
