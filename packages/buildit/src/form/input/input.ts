import { css, defineElement, html } from '@vielzeug/craftit';

/**
 * bit-input - A customizable text input component
 *
 * @element bit-input
 *
 * @attr {string} type - Input type: 'text' | 'email' | 'password' | 'search' | 'url' | 'tel' | 'number'
 * @attr {string} value - Current input value
 * @attr {string} name - Form field name
 * @attr {string} placeholder - Placeholder text
 * @attr {boolean} disabled - Disable the input
 * @attr {boolean} readonly - Make the input read-only
 * @attr {boolean} required - Mark the field as required
 * @attr {string} size - Input size: 'sm' | 'md' | 'lg'
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text'
 * @attr {string} color - Color theme: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
 *
 * @slot prefix - Content before the input (e.g. icon)
 * @slot suffix - Content after the input (e.g. clear button, icon)
 *
 * @cssprop --input-bg - Background color
 * @cssprop --input-color - Text color
 * @cssprop --input-border-color - Border color
 * @cssprop --input-focus-border-color - Focus border color
 * @cssprop --input-placeholder-color - Placeholder color
 * @cssprop --input-radius - Border radius
 * @cssprop --input-padding-x - Horizontal padding
 * @cssprop --input-padding-y - Vertical padding
 * @cssprop --input-font-size - Font size
 *
 * @fires input - Emitted when the value changes (user input)
 * @fires change - Emitted when the value is committed (blur or Enter)
 */

const styles = css`
  :host {
    display: inline-flex;
    align-items: stretch;
    --input-radius: var(--rounded-md);
    --input-font-size: var(--text-sm);
    --input-padding-x: var(--size-3);
    --input-padding-y: var(--size-2);
    --input-placeholder-color: var(--color-contrast-500);
  }

  :host([disabled]) {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .input-wrapper {
    display: inline-flex;
    align-items: center;
    gap: var(--size-2);
    width: 100%;
  }

  .field {
    display: inline-flex;
    align-items: center;
    flex: 1;
    border-radius: var(--input-radius);
    border: var(--border) solid var(--input-border-color);
    background: var(--input-bg);
    padding-inline: var(--input-padding-x);
    padding-block: var(--input-padding-y);
    box-sizing: border-box;
    transition:
      background 120ms ease,
      border-color 120ms ease,
      box-shadow 120ms ease;
  }

  ::slotted([slot='prefix']),
  ::slotted([slot='suffix']) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--color-contrast-600);
  }

  input {
    all: unset;
    flex: 1;
    font: inherit;
    font-size: var(--input-font-size);
    color: var(--input-color);
    min-width: 0;
  }

  input::placeholder {
    color: var(--input-placeholder-color);
  }

  input:focus-visible {
    outline: none;
  }

  :host(:not([disabled])) .field:focus-within {
    border-color: var(--input-focus-border-color);
    box-shadow: var(--ring);
  }

  /* Size variants */
  :host([size='sm']) {
    --input-font-size: var(--text-xs);
    --input-padding-y: var(--size-1-5);
    --input-padding-x: var(--size-2-5);
  }

  :host([size='lg']) {
    --input-font-size: var(--text-md);
    --input-padding-y: var(--size-2-5);
    --input-padding-x: var(--size-4);
  }

  /* Color themes */
  :host(:not([color])),
  :host([color='primary']) {
    --input-border-color: var(--color-contrast-300);
    --input-focus-border-color: var(--color-primary-focus);
    --input-bg: var(--color-contrast-50);
    --input-color: var(--color-contrast-900);
  }

  :host([color='success']) {
    --input-border-color: var(--color-contrast-300);
    --input-focus-border-color: var(--color-success-focus);
    --input-bg: var(--color-contrast-50);
    --input-color: var(--color-contrast-900);
  }

  :host([color='warning']) {
    --input-border-color: var(--color-contrast-300);
    --input-focus-border-color: var(--color-warning-focus);
    --input-bg: var(--color-contrast-50);
    --input-color: var(--color-contrast-900);
  }

  :host([color='error']) {
    --input-border-color: var(--color-contrast-300);
    --input-focus-border-color: var(--color-error-focus);
    --input-bg: var(--color-contrast-50);
    --input-color: var(--color-contrast-900);
  }

  /* Variants */
  :host([variant='solid']) .field,
  :host(:not([variant])) .field {
    background: var(--input-bg);
  }

  :host([variant='flat']) .field {
    background: var(--color-contrast-100);
  }

  :host([variant='bordered']) .field {
    background: var(--color-contrast-50);
  }

  :host([variant='outline']) .field {
    background: transparent;
  }

  :host([variant='ghost']) .field {
    background: transparent;
    border-color: transparent;
  }

  :host([variant='text']) .field {
    background: transparent;
    border-color: transparent;
    padding-inline: 0;
  }
`;

export type InputProps = {
  type?: 'text' | 'email' | 'password' | 'search' | 'url' | 'tel' | 'number';
  value?: string;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
};

defineElement<HTMLInputElement, InputProps>('bit-input', {
  observedAttributes: [
    'type',
    'value',
    'name',
    'placeholder',
    'disabled',
    'readonly',
    'required',
    'size',
    'variant',
    'color',
  ] as const,

  onAttributeChanged(name, _oldValue, newValue, el) {
    const host = el as unknown as HTMLElement;
    const input = host.shadowRoot?.querySelector('input') as HTMLInputElement | null;
    if (!input) return;

    // Update input properties based on attribute changes
    switch (name) {
      case 'value':
        input.value = newValue ?? '';
        break;
      case 'name':
        input.name = newValue ?? '';
        break;
      case 'placeholder':
        input.placeholder = newValue ?? '';
        break;
      case 'type': {
        const safeType = ['text', 'email', 'password', 'search', 'url', 'tel', 'number'].includes(newValue || '')
          ? newValue
          : 'text';
        input.type = safeType || 'text';
        break;
      }
      case 'disabled':
        input.disabled = newValue !== null;
        break;
      case 'readonly':
        input.readOnly = newValue !== null;
        break;
      case 'required':
        input.required = newValue !== null;
        break;
    }
  },

  onConnected(el) {
    const host = el as unknown as HTMLElement;
    const input = host.shadowRoot?.querySelector('input') as HTMLInputElement | null;
    if (!input) return;

    // Sync initial state
    if (host.hasAttribute('disabled')) {
      input.disabled = true;
    }

    // Handle input event
    input.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      host.setAttribute('value', target.value);

      el.emit('input', {
        originalEvent: e,
        value: target.value,
      });
    });

    // Handle change event
    input.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLInputElement;
      host.setAttribute('value', target.value);

      el.emit('change', {
        originalEvent: e,
        value: target.value,
      });
    });
  },

  styles: [styles],

  template: (el) => {
    const type = el.getAttribute('type') || 'text';
    const safeType = ['text', 'email', 'password', 'search', 'url', 'tel', 'number'].includes(type) ? type : 'text';

    return html`
      <div class="input-wrapper">
        <slot name="prefix"></slot>
        <div class="field">
          <input
            type="${safeType}"
            name="${el.getAttribute('name') || ''}"
            value="${el.getAttribute('value') || ''}"
            placeholder="${el.getAttribute('placeholder') || ''}"
            ?disabled="${el.hasAttribute('disabled')}"
            ?readonly="${el.hasAttribute('readonly')}"
            ?required="${el.hasAttribute('required')}" />
        </div>
        <slot name="suffix"></slot>
      </div>
    `;
  },
});

export default {};
