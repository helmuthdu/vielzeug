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
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text' | 'frost'
 * @attr {string} color - Color theme: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
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
 * @cssprop --input-padding - Inner padding (vertical horizontal)
 * @cssprop --input-gap - Gap between prefix/suffix and input
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
    --_font-size: var(--input-font-size, var(--text-sm));
    --_gap: var(--input-gap, var(--size-2));
    --_padding: var(--input-padding, var(--size-1-5) var(--size-3));
    --_radius: var(--input-radius, var(--rounded-md));
    --_placeholder: var(--input-placeholder-color, var(--color-contrast-500));
    --_bg: var(--input-bg, var(--color-contrast-100));
    --_border-color: var(--input-border-color, var(--color-contrast-300));

    align-items: stretch;
    display: inline-flex;
    flex-direction: column;
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
    align-items: stretch;
    background: var(--_bg);
    border-radius: var(--_radius);
    border: var(--border) solid var(--_border-color);
    box-shadow: var(--_shadown, var(--shadow-2xs));
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 0;
    justify-content: center;
    min-height: var(--size-10);
    padding: var(--_padding);
    transition:
      background var(--transition-fast),
      backdrop-filter var(--transition-slow),
      border-color var(--transition-fast),
      box-shadow var(--transition-fast),
      transform var(--transition-fast);
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
    color: var(--color-contrast-500);
    cursor: pointer;
    font-weight: var(--font-medium);
    transition: color var(--transition-fast);
    user-select: none;
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
    color: var(--color-contrast-500);
    font-size: var(--text-xs);
    line-height: var(--leading-tight);
    padding-inline: 2px;
  }

  /* ========================================
     Slotted Prefix/Suffix Icons
     ======================================== */

  ::slotted([slot='prefix']),
  ::slotted([slot='suffix']) {
    align-items: center;
    color: var(--color-contrast-500);
    display: inline-flex;
    font-size: var(--size-4);
    justify-content: center;
    opacity: 0.8;
    transition: color var(--transition-fast);
    user-select: none;
  }

  /* ========================================
     Input Element
     ======================================== */

  input {
    all: unset;
    color: var(--_theme-content);
    flex: 1;
    font: inherit;
    font-size: var(--_font-size);
    line-height: var(--leading-normal);
    min-width: 0;
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

  :host(:not([disabled]):not([variant='bordered']):not([variant='flat'])) .field:hover {
    border-color: var(--color-contrast-400);
  }

  :host(:not([disabled]):not([variant='text']):not([variant='flat'])) .field:focus-within {
    background: var(--color-canvas);
    border-color: var(--_theme-focus);
    box-shadow: var(--_theme-shadow, var(--color-primary-focus-shadow));
    transform: translateY(-1px);
  }

  :host(:not([disabled]):not([variant='frost'])) .field:focus-within .label-inset,
  :host(:not([disabled])) .field:focus-within .label-outside {
    color: var(--_theme-focus);
  }

  :host(:not([disabled])) .field:focus-within ::slotted([slot='prefix']),
  :host(:not([disabled])) .field:focus-within ::slotted([slot='suffix']) {
    color: var(--_theme-focus);
  }

  /* ========================================
     Size Variants
     ======================================== */

  :host([size='sm']) {
    --_font-size: var(--text-xs);
    --_gap: var(--size-1-5);
    --_padding: var(--size-1) var(--size-2);
  }

  :host([size='lg']) {
    --_font-size: var(--text-base);
    --_gap: var(--size-2-5);
    --_padding: var(--size-2) var(--size-3-5);
  }

  /* ========================================
     Rounded Variant
     ======================================== */

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

  :host([rounded='full']),
  :host([rounded='']) {
    --_radius: var(--rounded-full);
  }

  /* ========================================
     Color Themes (Default: Neutral)
     ======================================== */

  :host(:not([color])) {
    --_theme-base: var(--color-neutral);
    --_theme-backdrop: var(--input-backdrop, var(--color-neutral-backdrop));
    --_theme-border: var(--color-neutral-border);
    --_theme-content: var(--input-color, var(--color-neutral-content));
    --_theme-contrast: var(--color-neutral-contrast);
    --_theme-focus: var(--input-focus, var(--color-neutral-focus));
    --_theme-shadow: var(--color-neutral-focus-shadow);
    --_theme-halo: var(--halo-shadow-neutral);
  }

  :host([color='primary']) {
    --_theme-base: var(--color-primary);
    --_theme-backdrop: var(--color-primary-backdrop);
    --_theme-border: var(--color-primary-border);
    --_theme-content: var(--color-primary-content);
    --_theme-contrast: var(--color-primary-contrast);
    --_theme-focus: var(--color-primary-focus);
    --_theme-shadow: var(--color-primary-focus-shadow);
    --_theme-halo: var(--halo-shadow-primary);
  }

  :host([color='secondary']) {
    --_theme-base: var(--color-secondary);
    --_theme-backdrop: var(--color-secondary-backdrop);
    --_theme-border: var(--color-secondary-border);
    --_theme-content: var(--color-secondary-content);
    --_theme-contrast: var(--color-secondary-contrast);
    --_theme-focus: var(--color-secondary-focus);
    --_theme-shadow: var(--color-secondary-focus-shadow);
    --_theme-halo: var(--halo-shadow-secondary);
  }

  :host([color='info']) {
    --_theme-base: var(--color-info);
    --_theme-backdrop: var(--color-info-backdrop);
    --_theme-border: var(--color-info-border);
    --_theme-content: var(--color-info-content);
    --_theme-contrast: var(--color-info-contrast);
    --_theme-focus: var(--color-info-focus);
    --_theme-shadow: var(--color-info-focus-shadow);
    --_theme-halo: var(--halo-shadow-info);
  }

  :host([color='success']) {
    --_theme-base: var(--color-success);
    --_theme-backdrop: var(--color-success-backdrop);
    --_theme-border: var(--color-success-border);
    --_theme-content: var(--color-success-content);
    --_theme-contrast: var(--color-success-contrast);
    --_theme-focus: var(--color-success-focus);
    --_theme-shadow: var(--color-success-focus-shadow);
    --_theme-halo: var(--halo-shadow-success);
  }

  :host([color='warning']) {
    --_theme-base: var(--color-warning);
    --_theme-backdrop: var(--color-warning-backdrop);
    --_theme-border: var(--color-warning-border);
    --_theme-content: var(--color-warning-content);
    --_theme-contrast: var(--color-warning-contrast);
    --_theme-focus: var(--color-warning-focus);
    --_theme-shadow: var(--color-warning-focus-shadow);
    --_theme-halo: var(--halo-shadow-warning);
  }

  :host([color='error']) {
    --_theme-base: var(--color-error);
    --_theme-backdrop: var(--color-error-backdrop);
    --_theme-border: var(--color-error-border);
    --_theme-content: var(--color-error-content);
    --_theme-contrast: var(--color-error-contrast);
    --_theme-focus: var(--color-error-focus);
    --_theme-shadow: var(--color-error-focus-shadow);
    --_theme-halo: var(--halo-shadow-error);
  }

  /* ========================================
     Visual Variants
     ======================================== */

  /* Solid (Default) */
  :host(:not([variant])),
  :host([variant='solid']) {
    --_shadown: var(--shadow-2xs);
    --_bg: var(--color-contrast-50);
    --_border-color: var(--color-contrast-300);
  }

  /* Flat - Minimal but visible, with subtle color hint */
  :host([variant='flat']) {
    --_shadown: var(--inset-shadow-2xs);
    --_bg: color-mix(in srgb, var(--_theme-base) 4%, var(--color-contrast-100));
    --_border-color: var(--_theme-border);
  }

  :host([variant='flat']:not([disabled])) .field:hover {
    --_bg: color-mix(in srgb, var(--_theme-base) 6%, var(--color-contrast-100));
    --_border-color: color-mix(in srgb, var(--_theme-base) 35%, var(--color-contrast-300));
  }

  :host([variant='flat']:not([disabled])) .field:focus-within {
    --_bg: color-mix(in srgb, var(--_theme-base) 8%, var(--color-canvas));
    --_border-color: color-mix(in srgb, var(--_theme-focus) 60%, transparent);
    box-shadow: var(--_theme-shadow);
  }

  /* Bordered */
  :host([variant='bordered']) {
    --_bg: var(--_theme-backdrop);
    --_border-color: color-mix(in srgb, var(--_theme-focus) 70%, transparent);
    --_placeholder: color-mix(in srgb, var(--_theme-content) 45%, transparent);
  }

  :host([variant='bordered']:not([disabled])) .field:hover {
    --_border-color: var(--_theme-focus);
  }

  /* Outline */
  :host([variant='outline']) {
    --_shadown: none;
    --_bg: transparent;
  }

  /* Ghost */
  :host([variant='ghost']) {
    --_bg: transparent;
    --_border-color: transparent;
  }

  :host([variant='ghost']) .field {
    box-shadow: none;
  }

  :host([variant='ghost']:not([disabled])) .field:hover {
    background: var(--color-contrast-100);
  }

  /* Text */
  :host([variant='text']) .field {
    background: transparent;
    border: none;
    border-bottom: var(--border) solid var(--_border-color);
    border-radius: 0;
    box-shadow: none;
  }

  :host([variant='text']:not([disabled])) .field:focus-within {
    border-bottom: var(--border-2) solid var(--_theme-focus);
  }

  /* Frost - Smart backdrop blur variant */
  :host([variant='frost']) .field {
    backdrop-filter: blur(var(--blur-lg)) saturate(190%);
    -webkit-backdrop-filter: blur(var(--blur-md)) saturate(190%);
    box-shadow: var(--_shadow);
  }

  /* Neutral: canvas-based frost */
  :host([variant='frost']:not([color])) {
    --_bg: color-mix(in srgb, var(--color-canvas) 55%, transparent);
    --_border-color: color-mix(in srgb, var(--color-canvas) 40%, transparent);
    --_placeholder: color-mix(in srgb, var(--_theme-content) 45%, transparent);
    --_shadow: var(--_theme-halo);
  }

  :host([variant='frost']:not([color]):not([disabled])) .field:hover {
    background: color-mix(in srgb, var(--color-canvas) 65%, transparent);
    border-color: color-mix(in srgb, var(--color-contrast-500) 30%, transparent);
    backdrop-filter: blur(var(--blur-lg)) saturate(200%);
    -webkit-backdrop-filter: blur(var(--blur-lg)) saturate(200%);
  }

  :host([variant='frost']:not([color]):not([disabled])) .field:focus-within {
    background: color-mix(in srgb, var(--color-canvas) 70%, transparent);
    border-color: color-mix(in srgb, var(--_theme-focus) 40%, transparent);
    backdrop-filter: blur(var(--blur-xl)) saturate(210%);
    -webkit-backdrop-filter: blur(var(--blur-xl)) saturate(210%);
  }

  :host([variant='frost']:not([color])) input {
    color: var(--_theme-content);
    box-shadow: var(--_shadow);
    text-shadow: var(--text-shadow-2xs);
  }

  /* Frost with color: frosted glass effect */
  :host([variant='frost'][color]) {
    --_bg: color-mix(in srgb, var(--_theme-base) 30%, var(--color-contrast) 10%);
    --_border-color: color-mix(in srgb, var(--_theme-border) 50%, transparent);
    --_placeholder: color-mix(in srgb, var(--_theme-contrast) 30%, transparent);
    --_shadow: var(--_theme-halo);
  }

  :host([variant='frost'][color]) .field {
    filter: brightness(1.1);
  }

  :host([variant='frost'][color]:not([disabled])) .field:hover {
    background: color-mix(in srgb, var(--_theme-base) 60%, var(--color-contrast) 40%);
    border-color: color-mix(in srgb, var(--_theme-focus) 50%, transparent);
    backdrop-filter: blur(var(--blur-lg)) saturate(200%);
    -webkit-backdrop-filter: blur(var(--blur-lg)) saturate(200%);
  }

  :host([variant='frost'][color]:not([disabled])) .field:focus-within {
    background: color-mix(in srgb, var(--_theme-base) 50%, var(--color-contrast) 50%);
    border-color: color-mix(in srgb, var(--_theme-focus) 60%, transparent);
    backdrop-filter: blur(var(--blur-xl)) saturate(210%);
    -webkit-backdrop-filter: blur(var(--blur-xl)) saturate(210%);
  }

  :host([variant='frost'][color]) input {
    color: var(--text-color-contrast);
    text-shadow: var(--text-shadow-xs);
  }

  :host([variant='frost'][color]) .label-inset {
    color: color-mix(in srgb, var(--text-color-contrast) 80%, transparent);
  }

  :host([variant='frost'][color]) ::slotted([slot='prefix']),
  :host([variant='frost'][color]) ::slotted([slot='suffix']) {
    color: color-mix(in srgb, var(--text-color-contrast) 75%, transparent);
  }
`;

export type InputProps = {
  'label-placement'?: 'inset' | 'outside';
  color?: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
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

const VALID_INPUT_TYPES = ['text', 'email', 'password', 'search', 'url', 'tel', 'number'] as const;

const validateInputType = (type: string | null): string => {
  return VALID_INPUT_TYPES.includes(type as any) ? type! : 'text';
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
      case 'type':
        input.type = validateInputType(newValue);
        break;
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

    // Helper to update value and emit event
    const handleValueChange = (e: Event, eventName: 'input' | 'change') => {
      const target = e.target as HTMLInputElement;
      host.setAttribute('value', target.value);
      el.emit(eventName, { originalEvent: e, value: target.value });
    };

    el.on(input, 'input', (e) => handleValueChange(e, 'input'));
    el.on(input, 'change', (e) => handleValueChange(e, 'change'));
  },

  styles: [styles],

  template: (el) => {
    const type = validateInputType(el.getAttribute('type'));
    const labelText = el.getAttribute('label');
    const labelPlacement = el.getAttribute('label-placement') || 'inset';
    const helperText = el.getAttribute('helper');
    const name = el.getAttribute('name');

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
              type="${type}"
              name="${name}"
              value="${el.getAttribute('value') || ''}"
              placeholder="${el.getAttribute('placeholder') || ''}"
              aria-labelledby="${labelId}"
              aria-describedby="${helperId}"
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
