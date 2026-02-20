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
 * @attr {string} label - Label text
 * @attr {string} label-placement - Label placement: 'inset' | 'outside' (default: 'inset')
 * @attr {string} helper - Helper text displayed below the input
 * @attr {boolean} disabled - Disable the input
 * @attr {boolean} readonly - Make the input read-only
 * @attr {boolean} required - Mark the field as required
 * @attr {string} size - Input size: 'sm' | 'md' | 'lg'
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text' | 'glass' | 'frost'
 * @attr {string} color - Color theme: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
 *
 * @slot prefix - Content before the input (e.g. icon)
 * @slot suffix - Content after the input (e.g. clear button, icon)
 * @slot helper - Complex helper content below the input
 *
 * @cssprop --input-backdrop - Backdrop color
 * @cssprop --input-color - Text color
 * @cssprop --input-border-color - Border color
 * @cssprop --input-focus - Focus border color
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
    flex-direction: column;
    align-items: stretch;
    --input-radius: var(--rounded-md);
    --input-font-size: var(--text-sm);
    --input-padding-x: var(--size-3);
    --input-padding-y: var(--size-1-5);
    --input-placeholder-color: var(--color-contrast-500);
    --input-transition: 150ms cubic-bezier(0.4, 0, 0.2, 1);
    --input-gap: var(--size-2);
  }

  :host([disabled]) {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .input-wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--size-1-5);
    width: 100%;
  }

  .field {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    gap: 0;
    border-radius: var(--input-radius);
    border: var(--border) solid var(--input-border-color);
    padding-inline: var(--input-padding-x);
    padding-block: var(--input-padding-y);
    box-sizing: border-box;
    box-shadow: var(--shadow-2xs);
    background: var(--input-bg, transparent);
    transition:
      background var(--input-transition),
      border-color var(--input-transition),
      box-shadow var(--input-transition),
      transform var(--input-transition);
    min-height: var(--size-10);
  }

  .input-row {
    display: flex;
    align-items: center;
    gap: var(--input-gap);
    flex: 1;
  }

  /* Inset Label Styles */
  :host([label]:not([label-placement='outside'])) .field {
    padding-block: var(--size-2);
    min-height: var(--size-12);
  }

  .label-inset {
    font-size: var(--text-xs);
    font-weight: var(--font-medium);
    color: var(--color-contrast-500);
    line-height: var(--leading-tight);
    transition: color var(--input-transition);
    user-select: none;
    margin-bottom: 2px;
  }

  /* Outside Label Styles */
  .label-outside {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--color-contrast-500);
    line-height: var(--leading-none);
    transition: color var(--input-transition);
    user-select: none;
  }

  /* Helper Text Styles */
  .helper-text {
    font-size: var(--text-xs);
    color: var(--color-contrast-500);
    line-height: var(--leading-tight);
    padding-inline: 2px;
  }

  ::slotted([slot='prefix']),
  ::slotted([slot='suffix']) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--color-contrast-500);
    transition: color var(--input-transition);
    user-select: none;
    font-size: var(--size-4);
    opacity: 0.8;
  }

  input {
    all: unset;
    flex: 1;
    font: inherit;
    font-size: var(--input-font-size);
    color: var(--input-content);
    min-width: 0;
    line-height: var(--leading-normal);
  }

  input::placeholder {
    color: var(--input-placeholder-color);
    transition: color var(--input-transition);
  }

  input:focus-visible {
    outline: none;
  }

  /* Interaction States */
  :host(:not([disabled])) .field:hover {
    border-color: var(--color-contrast-400);
  }

  :host(:not([disabled])) .field:focus-within {
    border-color: var(--input-focus);
    box-shadow: var(--input-shadow, var(--shadow-sm));
    background: var(--color-canvas);
  }

  :host(:not([disabled]):not([variant='glass'])) .field:focus-within .label-inset,
  :host(:not([disabled])) .field:focus-within .label-outside {
    color: var(--input-focus);
  }

  :host(:not([disabled])) .field:focus-within ::slotted([slot='prefix']),
  :host(:not([disabled])) .field:focus-within ::slotted([slot='suffix']) {
    color: var(--input-focus);
    opacity: 1;
  }

  /* Size variants */
  :host([size='sm']) {
    --input-font-size: var(--text-xs);
    --input-padding-y: var(--size-1);
    --input-padding-x: var(--size-2);
    --input-gap: var(--size-1-5);
  }

  :host([size='lg']) {
    --input-font-size: var(--text-md);
    --input-padding-y: var(--size-2);
    --input-padding-x: var(--size-3-5);
    --input-gap: var(--size-2-5);
  }

  /* Color themes */
  :host(:not([color])),
  :host([color='primary']) {
    --input-base: var(--color-primary);
    --input-content: var(--color-primary-content);
    --input-contrast: var(--color-primary-contrast);
    --input-backdrop: var(--color-primary-backdrop);
    --input-border-color: var(--color-contrast-300);
    --input-focus: var(--color-primary-focus);
    --input-shadow: var(--color-primary-shadow);
  }

  :host([color='secondary']) {
    --input-base: var(--color-secondary);
    --input-content: var(--color-secondary-content);
    --input-contrast: var(--color-secondary-contrast);
    --input-backdrop: var(--color-secondary-backdrop);
    --input-border-color: var(--color-contrast-300);
    --input-focus: var(--color-secondary-focus);
    --input-shadow: var(--color-secondary-shadow);
  }

  :host([color='success']) {
    --input-base: var(--color-success);
    --input-content: var(--color-success-content);
    --input-contrast: var(--color-success-contrast);
    --input-backdrop: var(--color-success-backdrop);
    --input-border-color: var(--color-contrast-300);
    --input-focus: var(--color-success-focus);
    --input-shadow: var(--color-success-shadow);
  }

  :host([color='warning']) {
    --input-base: var(--color-warning);
    --input-content: var(--color-warning-content);
    --input-contrast: var(--color-warning-contrast);
    --input-backdrop: var(--color-warning-backdrop);
    --input-border-color: var(--color-contrast-300);
    --input-focus: var(--color-warning-focus);
    --input-shadow: var(--color-warning-shadow);
  }

  :host([color='error']) {
    --input-base: var(--color-error);
    --input-content: var(--color-error-content);
    --input-contrast: var(--color-error-contrast);
    --input-backdrop: var(--color-error-backdrop);
    --input-border-color: var(--color-contrast-300);
    --input-focus: var(--color-error-focus);
    --input-shadow: var(--color-error-shadow);
  }

  /* Variants */
  :host([variant='solid']),
  :host(:not([variant])) {
    --input-bg: var(--color-contrast-100);
  }

  :host([variant='flat']) {
    --input-bg: color-mix(in srgb, var(--input-backdrop) 8%, var(--color-contrast-100));
    --input-border-color: transparent;
  }

  :host([variant='bordered']) {
    --input-bg: var(--input-backdrop);
    --input-border-color: var(--input-focus);
  }

  :host([variant='outline']) {
    --input-bg: transparent;
    --input-border-color: var(--color-contrast-300);
  }

  :host([variant='ghost']) {
    --input-bg: transparent;
    --input-border-color: transparent;
  }

  :host([variant='ghost']:not([disabled])) .field:hover {
    background: var(--color-contrast-100);
  }

  :host([variant='ghost']) .field {
    box-shadow: none;
  }

  :host([variant='text']) .field {
    background: transparent;
    border: none;
    border-bottom: var(--border) solid var(--input-border-color);
    border-radius: 0;
    box-shadow: none;
  }

  :host([variant='text']:not([disabled])) .field:focus-within {
    border-color: transparent;
    border-bottom: var(--border-2) solid var(--input-focus);
    background: transparent;
    box-shadow: none;
  }

  :host([variant='glass']) {
    --input-bg: color-mix(in srgb, var(--input-base) 30%, var(--color-contrast) 10%);
    --input-border-color: color-mix(in srgb, var(--input-focus) 30%, transparent);
  }

  :host([variant='glass']) .field {
    backdrop-filter: blur(var(--blur-lg)) saturate(180%) brightness(1.1);
    box-shadow: var(--shadow-md), var(--inset-shadow-xs);
  }

  :host([variant='glass']:not([disabled])) .field:hover {
    background: color-mix(in srgb, var(--input-backdrop) 60%, var(--input-base) 40%);
    border-color: color-mix(in srgb, var(--input-focus) 50%, transparent);
  }
  :host([variant='glass']:not([disabled])) .field:focus-within {
    background: color-mix(in srgb, var(--input-backdrop) 50%, var(--input-base) 50%);
    border-color: color-mix(in srgb, var(--input-focus) 60%, transparent);
  }

  :host([variant='glass']) input {
    color: var(--text-color-contrast);
    text-shadow: var(--text-shadow-xs);
  }
  :host([variant='glass']) .label-inset {
    color: color-mix(in srgb, var(--text-color-contrast) 80%, transparent);
  }

  :host([variant='frost']) input {
    color: var(--input-color, var(--input-content));
    text-shadow: var(--text-shadow-2xs);
  }

  :host([variant='frost']) {
    --input-bg: color-mix(in srgb, var(--color-contrast-50) 60%, /* or var(--color-canvas) */ transparent);
    --input-border-color: color-mix(in srgb, var(--color-contrast-400) 40%, transparent);
  }

  :host([variant='frost']) .field {
    backdrop-filter: blur(var(--blur-lg)) saturate(180%);
    box-shadow: var(--shadow-md), var(--inset-shadow-xs);
  }

  :host([variant='frost']:not([disabled])) .field:hover {
    background: color-mix(in srgb, var(--color-canvas) 65%, transparent);
  }
  :host([variant='frost']:not([disabled])) .field:focus-within {
    background: color-mix(in srgb, var(--color-canvas) 70%, transparent);
  }
`;

export type InputProps = {
  type?: 'text' | 'email' | 'password' | 'search' | 'url' | 'tel' | 'number';
  value?: string;
  name?: string;
  placeholder?: string;
  label?: string;
  'label-placement'?: 'inset' | 'outside';
  helper?: string;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text' | 'glass' | 'frost';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
};

defineElement<HTMLInputElement, InputProps>('bit-input', {
  observedAttributes: [
    'type',
    'value',
    'name',
    'placeholder',
    'label',
    'label-placement',
    'helper',
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
    const labelText = el.getAttribute('label');
    const labelPlacement = el.getAttribute('label-placement') || 'inset';
    const helperText = el.getAttribute('helper');

    return html`
      <div class="input-wrapper">
        ${labelText && labelPlacement === 'outside' ? html`<div class="label-outside">${labelText}</div>` : ''}
        <div class="field">
          ${labelText && labelPlacement === 'inset' ? html`<div class="label-inset">${labelText}</div>` : ''}
          <div class="input-row">
            <slot name="prefix"></slot>
            <input
              type="${safeType}"
              name="${el.getAttribute('name') || ''}"
              value="${el.getAttribute('value') || ''}"
              placeholder="${el.getAttribute('placeholder') || ''}"
              ?disabled="${el.hasAttribute('disabled')}"
              ?readonly="${el.hasAttribute('readonly')}"
              ?required="${el.hasAttribute('required')}" />
            <slot name="suffix"></slot>
          </div>
        </div>
        ${helperText || el.querySelector('[slot="helper"]')
        ? html`
              <div class="helper-text">
                <slot name="helper">${helperText}</slot>
              </div>
            `
        : ''}
      </div>
    `;
  },
});

export default {};
