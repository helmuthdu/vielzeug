import { css, defineElement, html } from '@vielzeug/craftit';

/**
 * bit-checkbox - A customizable checkbox component
 *
 * @element bit-checkbox
 *
 * @attr {boolean} checked - Checkbox checked state
 * @attr {boolean} disabled - Disable the checkbox
 * @attr {boolean} indeterminate - Indeterminate state
 * @attr {string} value - Checkbox value
 * @attr {string} name - Form field name
 * @attr {string} color - Checkbox color theme: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
 * @attr {string} size - Checkbox size: 'sm' | 'md' | 'lg'
 *
 * @slot - Default slot for checkbox label
 *
 * @cssprop --checkbox-size - Size of the checkbox square
 * @cssprop --checkbox-bg - Background color
 * @cssprop --checkbox-border - Border style
 * @cssprop --checkbox-radius - Border radius
 * @cssprop --checkbox-checked-bg - Background color when checked
 * @cssprop --checkbox-color - Checkmark color
 *
 * @fires change - Emitted when checked state changes
 *   detail: { checked: boolean; value: string | null; originalEvent: Event }
 */

const styles = css`
  /* ========================================
     Base Styles & Defaults
     ======================================== */

  :host {
    --checkbox-size: var(--size-5);
    --checkbox-radius: var(--rounded-md);
    --checkbox-font-size: var(--text-sm);
    display: inline-flex;
    align-items: center;
    gap: var(--size-2);
    cursor: pointer;
    user-select: none;
  }

  :host([disabled]) {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .checkbox-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--checkbox-size);
    height: var(--checkbox-size);
    flex-shrink: 0;
  }

  input {
    display: none;
  }

  .box {
    width: 100%;
    height: 100%;
    border: var(--border-2) solid var(--checkbox-border-color, var(--color-contrast-low));
    border-radius: var(--checkbox-radius);
    background: var(--checkbox-bg, var(--color-contrast-200));
    transition: all 150ms ease-in-out;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    position: relative;
  }

  /* ========================================
     Color Themes
     ======================================== */
  :host(:not([color])) .box,
  :host([color='primary']) .box {
    --checkbox-base: var(--color-primary);
    --checkbox-contrast: var(--color-primary-contrast);
    --checkbox-focus: var(--color-primary-focus);
  }

  :host([color='secondary']) .box {
    --checkbox-base: var(--color-secondary);
    --checkbox-contrast: var(--color-secondary-contrast);
    --checkbox-focus: var(--color-secondary-focus);
  }

  :host([color='success']) .box {
    --checkbox-base: var(--color-success);
    --checkbox-contrast: var(--color-success-contrast);
    --checkbox-focus: var(--color-success-focus);
  }

  :host([color='warning']) .box {
    --checkbox-base: var(--color-warning);
    --checkbox-contrast: var(--color-warning-contrast);
    --checkbox-focus: var(--color-warning-focus);
  }

  :host([color='error']) .box {
    --checkbox-base: var(--color-error);
    --checkbox-contrast: var(--color-error-contrast);
    --checkbox-focus: var(--color-error-focus);
  }

  /* ========================================
     States
     ======================================== */

  :host([checked]) .box,
  :host([indeterminate]) .box {
    background: var(--checkbox-checked-bg, var(--checkbox-base));
    border-color: var(--checkbox-checked-bg, var(--checkbox-base));
  }

  input:focus-visible + .box {
    outline: var(--border-2) solid var(--checkbox-focus);
    outline-offset: var(--border-2);
  }

  /* ========================================
     Checkmark & Dash Icons
     ======================================== */

  .dash,
  .checkmark {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 80%;
    height: 80%;
    margin: -40% 0 0 -40%;
    color: var(--checkbox-color, var(--checkbox-contrast));
    stroke: currentColor;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
    opacity: 0;
    transform: scale(0.5);
    transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  :host([checked]) .checkmark {
    opacity: 1;
    transform: scale(1);
  }

  :host([indeterminate]:not([checked])) .dash {
    opacity: 1;
    transform: scale(1);
  }

  /* ========================================
     Size Variants
     ======================================== */

  :host([size='sm']) {
    --checkbox-size: var(--size-4);
    --checkbox-font-size: var(--text-xs);
  }

  :host([size='lg']) {
    --checkbox-size: var(--size-6);
    --checkbox-font-size: var(--text-md);
  }

  /* ========================================
     Label
     ======================================== */

  .label {
    font-size: var(--checkbox-font-size);
    color: var(--color-contrast);
  }
`;

export type CheckboxProps = {
  checked?: boolean;
  disabled?: boolean;
  indeterminate?: boolean;
  value?: string;
  name?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
};

defineElement<HTMLInputElement, CheckboxProps>('bit-checkbox', {
  observedAttributes: ['checked', 'disabled', 'indeterminate', 'value', 'name', 'color', 'size'] as const,

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Attribute synchronization requires handling multiple states (checked, indeterminate, disabled) and their interactions
  onAttributeChanged(el, name, _oldValue, newValue) {
    const host = el as unknown as HTMLElement;

    if (name === 'indeterminate') {
      const input = host.shadowRoot?.querySelector('input') as HTMLInputElement | null;
      if (input) {
        input.indeterminate = newValue !== null;
      }
      host.setAttribute('aria-checked', newValue !== null ? 'mixed' : host.hasAttribute('checked') ? 'true' : 'false');
    } else if (name === 'checked') {
      const input = host.shadowRoot?.querySelector('input') as HTMLInputElement | null;
      if (input) {
        input.checked = newValue !== null;
      }
      if (!host.hasAttribute('indeterminate')) {
        host.setAttribute('aria-checked', newValue !== null ? 'true' : 'false');
      }
    } else if (name === 'disabled') {
      const isDisabled = newValue !== null;
      host.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');

      // Optional: adjust tabindex when disabled/enabled
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

    const isIndeterminate = host.hasAttribute('indeterminate');
    const isChecked = host.hasAttribute('checked');
    const isDisabled = host.hasAttribute('disabled');

    if (input) {
      input.indeterminate = isIndeterminate;
      input.checked = isChecked;
    }

    // Host is the interactive element
    host.setAttribute('role', 'checkbox');
    host.setAttribute('aria-checked', isIndeterminate ? 'mixed' : isChecked ? 'true' : 'false');
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

        if (host.hasAttribute('indeterminate')) host.removeAttribute('indeterminate');

        if (input) {
          input.checked = nextChecked;
          input.indeterminate = false;
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

      if (host.hasAttribute('indeterminate')) host.removeAttribute('indeterminate');

      if (input) {
        input.checked = nextChecked;
        input.indeterminate = false;
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
    <div class="checkbox-wrapper">
      <input
        type="checkbox"
        ?checked="${el.hasAttribute('checked')}"
        ?disabled="${el.hasAttribute('disabled')}"
        .indeterminate="${el.hasAttribute('indeterminate')}"
        name="${el.getAttribute('name') || ''}"
        value="${el.getAttribute('value') || ''}"
        style="display: none;"
        aria-hidden="true"
        tabindex="-1" />
      <div class="box">
        <svg
          height="24px"
          width="24px"
          class="checkmark"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          xmlns="http://www.w3.org/2000/svg">
          <path d="M 20,6 9,17 4,12" />
        </svg>
        <svg
          height="24px"
          width="24px"
          class="dash"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          xmlns="http://www.w3.org/2000/svg">
          <path d="M 5,12 H 19" />
        </svg>
      </div>
    </div>
    <span class="label"><slot></slot></span>
  `,
});

export default {};
