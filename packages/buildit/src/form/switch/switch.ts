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
    --_width: var(--switch-width, var(--size-10));
    --_height: var(--switch-height, var(--size-5));
    --_padding: var(--size-0-5);
    --_thumb-size: calc(var(--_height) - var(--_padding) * 2);
    --_track-bg: var(--switch-track-bg, var(--color-contrast-300));
    --_thumb-bg: var(--switch-thumb-bg, white);
    --_font-size: var(--switch-font-size, var(--text-sm));

    display: inline-flex;
    align-items: center;
    gap: var(--size-2-5);
    min-height: var(--size-11);
    cursor: pointer;
    user-select: none;
    touch-action: manipulation;
  }

  :host([disabled]) {
    cursor: not-allowed;
    opacity: 0.5;
    pointer-events: none;
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
     Color Themes
     ======================================== */

  :host(:not([color])),
  :host([color='primary']) {
    --_active-bg: var(--switch-bg, var(--color-primary));
    --_focus-shadow: var(--color-primary-shadow);
  }

  :host([color='secondary']) {
    --_active-bg: var(--switch-bg, var(--color-secondary));
    --_focus-shadow: var(--color-secondary-shadow);
  }

  :host([color='success']) {
    --_active-bg: var(--switch-bg, var(--color-success));
    --_focus-shadow: var(--color-success-shadow);
  }

  :host([color='warning']) {
    --_active-bg: var(--switch-bg, var(--color-warning));
    --_focus-shadow: var(--color-warning-shadow);
  }

  :host([color='error']) {
    --_active-bg: var(--switch-bg, var(--color-error));
    --_focus-shadow: var(--color-error-shadow);
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

  /* ========================================
     Focus State
     ======================================== */

  input:focus-visible ~ .switch-track {
    box-shadow: var(--_focus-shadow);
  }

  /* ========================================
     Size Variants
     ======================================== */

  :host([size='sm']) {
    --_width: var(--size-8);
    --_height: var(--size-4);
    --_font-size: var(--text-xs);
  }

  :host([size='lg']) {
    --_width: var(--size-12);
    --_height: var(--size-6);
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

    el.on('keydown', (keyEvent) => {
      if (host.hasAttribute('disabled')) return;
      if (keyEvent.key === ' ' || keyEvent.key === 'Enter') {
        keyEvent.preventDefault();
        const nextChecked = !host.hasAttribute('checked');

        if (nextChecked) host.setAttribute('checked', '');
        else host.removeAttribute('checked');

        if (input) {
          input.checked = nextChecked;
        }

        host.setAttribute('aria-checked', nextChecked ? 'true' : 'false');
        el.emit('change', {
          checked: nextChecked,
          originalEvent: keyEvent,
          value: host.getAttribute('value'),
        });
      }
    });

    // Mouse / pointer interaction (2 params = host element)
    el.on('click', (e) => {
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
