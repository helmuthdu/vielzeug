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
 * @attr {string} rounded - Border radius: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full' | '' (empty = 'full')
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
  /* ========================================
     Base Styles & Defaults
     ======================================== */

  :host {
    --_radius: var(--input-radius, var(--rounded-md));
    --_font-size: var(--input-font-size, var(--text-sm));
    --_padding-x: var(--input-padding-x, var(--size-3));
    --_padding-y: var(--input-padding-y, var(--size-1-5));
    --_gap: var(--input-gap, var(--size-2));
    --_placeholder: var(--input-placeholder-color, var(--color-contrast-500));

    display: inline-flex;
    flex-direction: column;
    align-items: stretch;
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
    border-radius: var(--_radius);
    border: var(--border) solid var(--input-border-color);
    padding-inline: var(--_padding-x);
    padding-block: var(--_padding-y);
    box-sizing: border-box;
    box-shadow: var(--_shadown, var(--shadow-2xs));
    background: var(--input-bg, var(--color-contrast-100));
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast),
      box-shadow var(--transition-fast),
      transform var(--transition-fast);
    min-height: var(--size-10);
  }

  .input-row {
    display: flex;
    align-items: center;
    gap: var(--_gap);
    flex: 1;
  }

  /* ========================================
     Label Styles
     ======================================== */

  .label-inset,
  .label-outside,
  label.label-inset,
  label.label-outside {
    font-weight: var(--font-medium);
    color: var(--color-contrast-500);
    transition: color var(--transition-fast);
    user-select: none;
    cursor: pointer;
  }

  .label-inset,
  label.label-inset {
    font-size: var(--text-xs);
    line-height: var(--leading-tight);
    margin-bottom: 2px;
  }

  .label-outside,
  label.label-outside {
    font-size: var(--text-sm);
    line-height: var(--leading-none);
  }

  /* ========================================
     Helper Text
     ======================================== */

  .helper-text {
    font-size: var(--text-xs);
    color: var(--color-contrast-500);
    line-height: var(--leading-tight);
    padding-inline: 2px;
  }

  /* ========================================
     Slotted Prefix/Suffix Icons
     ======================================== */

  ::slotted([slot='prefix']),
  ::slotted([slot='suffix']) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--color-contrast-500);
    transition: color var(--transition-fast);
    user-select: none;
    font-size: var(--size-4);
    opacity: 0.8;
  }

  /* ========================================
     Input Element
     ======================================== */

  input {
    all: unset;
    flex: 1;
    font: inherit;
    font-size: var(--_font-size);
    color: var(--input-content);
    min-width: 0;
    line-height: var(--leading-normal);
  }

  input::placeholder {
    color: var(--_placeholder);
    transition: color var(--transition-fast);
  }

  input:focus-visible {
    outline: none;
  }

  /* ========================================
     Hover & Focus States
     ======================================== */

  :host(:not([disabled])) .field:hover {
    border-color: var(--color-contrast-400);
  }

  :host(:not([disabled]):not([variant='text'])) .field:focus-within {
    border-color: var(--input-focus);
    box-shadow: var(--input-shadow, var(--color-primary-shadow));
    background: var(--color-canvas);
    transform: translateY(-1px);
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

  /* ========================================
     Size Variants
     ======================================== */

  :host([size='sm']) {
    --_font-size: var(--text-xs);
    --_padding-y: var(--size-1);
    --_padding-x: var(--size-2);
    --_gap: var(--size-1-5);
  }

  :host([size='lg']) {
    --_font-size: var(--text-base);
    --_padding-y: var(--size-2);
    --_padding-x: var(--size-3-5);
    --_gap: var(--size-2-5);
  }

  /* ========================================
     Rounded Variant
     ======================================== */

  /* Default rounded (no value or empty string = full) */
  :host(
    [rounded]:not([rounded='sm']):not([rounded='md']):not([rounded='lg']):not([rounded='xl']):not([rounded='2xl']):not(
        [rounded='3xl']
      )
  ) {
    --_radius: var(--rounded-full);
  }

  /* Specific radius values from theme */
  :host([rounded='sm']) {
    --_radius: var(--rounded-sm);
  }

  :host([rounded='md']) {
    --_radius: var(--rounded-md);
  }

  :host([rounded='lg']) {
    --_radius: var(--rounded-lg);
  }

  :host([rounded='xl']) {
    --_radius: var(--rounded-xl);
  }

  :host([rounded='2xl']) {
    --_radius: var(--rounded-2xl);
  }

  :host([rounded='3xl']) {
    --_radius: var(--rounded-3xl);
  }

  :host([rounded='full']) {
    --_radius: var(--rounded-full);
  }

  /* ========================================
     Color Themes
     ======================================== */

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

  /* ========================================
     Visual Variants
     ======================================== */

  :host([variant='flat']) {
    --input-bg: color-mix(in srgb, var(--input-backdrop) 8%, var(--color-contrast-100));
    --input-border-color: transparent;
    --_shadown: var(--inset-shadow-2xs);
  }

  :host([variant='bordered']) {
    --input-bg: var(--input-backdrop);
    --input-border-color: var(--input-focus);
    --input-placeholder-color: color-mix(in srgb, var(--input-content) 45%, transparent);
  }

  :host([variant='outline']) {
    --input-bg: transparent;
  }

  :host([variant='ghost']) {
    --input-bg: transparent;
    --input-border-color: transparent;
  }

  :host([variant='ghost']) .field {
    box-shadow: none;
  }

  :host([variant='ghost']:not([disabled])) .field:hover {
    background: var(--color-contrast-100);
  }

  :host([variant='text']) .field {
    background: transparent;
    border: none;
    border-bottom: var(--border) solid var(--input-border-color);
    border-radius: 0;
    box-shadow: none;
  }

  :host([variant='text']:not([disabled])) .field:focus-within {
    border-bottom: var(--border-2) solid var(--input-focus);
  }

  :host([variant='glass']) {
    --input-bg: color-mix(in srgb, var(--input-base) 30%, var(--color-contrast) 10%);
    --input-border-color: color-mix(in srgb, var(--input-focus) 30%, transparent);
  }

  :host([variant='glass']) .field,
  :host([variant='frost']) .field {
    backdrop-filter: blur(var(--blur-md)) saturate(190%);
    box-shadow:
      var(--shadow-md),
      inset 0 0 0 1px rgb(255 255 255 / 0.1);
  }

  :host([variant='glass']) .field {
    filter: brightness(1.1);
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

  :host([variant='glass']) ::slotted([slot='prefix']),
  :host([variant='glass']) ::slotted([slot='suffix']) {
    color: color-mix(in srgb, var(--text-color-contrast) 75%, transparent);
  }

  :host([variant='frost']) {
    --input-bg: color-mix(in srgb, var(--color-canvas) 55%, transparent);
    --input-border-color: color-mix(in srgb, var(--color-contrast-400) 40%, transparent);
  }

  :host([variant='frost']:not([disabled])) .field:hover {
    background: color-mix(in srgb, var(--color-canvas) 65%, transparent);
    border-color: color-mix(in srgb, var(--input-focus) 30%, transparent);
  }

  :host([variant='frost']:not([disabled])) .field:focus-within {
    background: color-mix(in srgb, var(--color-canvas) 70%, transparent);
    border-color: color-mix(in srgb, var(--input-focus) 40%, transparent);
  }

  :host([variant='frost']) input {
    color: var(--input-content);
    text-shadow: var(--text-shadow-2xs);
  }
`;

export type InputProps = {
  'label-placement'?: 'inset' | 'outside';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  disabled?: boolean;
  helper?: string;
  label?: string;
  name?: string;
  placeholder?: string;
  readonly?: boolean;
  required?: boolean;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full' | '';
  size?: 'sm' | 'md' | 'lg';
  type?: 'text' | 'email' | 'password' | 'search' | 'url' | 'tel' | 'number';
  value?: string;
  variant?: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text' | 'glass' | 'frost';
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
    'rounded',
  ] as const,

  onAttributeChanged(name, _oldValue, newValue, el) {
    const host = el as unknown as HTMLElement;
    const input = host.shadowRoot?.querySelector('input') as HTMLInputElement | null;
    if (!input) return;

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
    const input = el.query('input') as HTMLInputElement | undefined;
    if (!input) return;

    if (host.hasAttribute('disabled')) {
      input.disabled = true;
    }

    // Use el.on() for direct element binding with automatic cleanup
    el.on(input, 'input', (e) => {
      const target = e.target as HTMLInputElement;
      host.setAttribute('value', target.value);

      el.emit('input', {
        originalEvent: e,
        value: target.value,
      });
    });

    el.on(input, 'change', (e) => {
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
    const name = el.getAttribute('name') || '';

    // Generate IDs for accessibility
    const inputId = name ? `input-${name}` : `input-${Math.random().toString(36).substr(2, 9)}`;
    const labelId = labelText ? `label-${inputId}` : '';
    const helperId = helperText ? `helper-${inputId}` : '';

    return html`
      <div class="input-wrapper">
        ${labelText && labelPlacement === 'outside'
        ? html`<label class="label-outside" for="${inputId}" id="${labelId}">${labelText}</label>`
        : ''}
        <div class="field">
          ${labelText && labelPlacement === 'inset'
          ? html`<label class="label-inset" for="${inputId}" id="${labelId}">${labelText}</label>`
          : ''}
          <div class="input-row">
            <slot name="prefix"></slot>
            <input
              id="${inputId}"
              type="${safeType}"
              name="${name}"
              value="${el.getAttribute('value') || ''}"
              placeholder="${el.getAttribute('placeholder') || ''}"
              aria-labelledby="${labelId || ''}"
              aria-describedby="${helperId || ''}"
              ?disabled="${el.hasAttribute('disabled')}"
              ?readonly="${el.hasAttribute('readonly')}"
              ?required="${el.hasAttribute('required')}" />
            <slot name="suffix"></slot>
          </div>
        </div>
        ${helperText || el.querySelector('[slot="helper"]')
        ? html`
              <div class="helper-text" id="${helperId}">
                <slot name="helper">${helperText}</slot>
              </div>
            `
        : ''}
      </div>
    `;
  },
});

export default {};
