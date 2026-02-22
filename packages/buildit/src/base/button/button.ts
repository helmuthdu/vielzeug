import { css, defineElement, html } from '@vielzeug/craftit';

/**
 * bit-button - A customizable button component
 *
 * @element bit-button
 *
 * @attr {string} variant - Button style variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text' | 'glass' | 'frost'
 * @attr {string} color - Button color theme: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
 * @attr {string} size - Button size: 'sm' | 'md' | 'lg'
 * @attr {boolean} disabled - Disable the button
 * @attr {boolean} loading - Show loading state
 * @attr {boolean} icon-only - Button with only an icon (no text padding)
 * @attr {string} rounded - Border radius: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full' | '' (empty = 'full')
 * @attr {string} type - Button type: 'button' | 'submit' | 'reset'
 *
 * @slot - Default slot for button content
 * @slot prefix - Content before the button text (e.g., icons)
 * @slot suffix - Content after the button text (e.g., icons, badges)
 *
 * @cssprop --button-bg - Background color
 * @cssprop --button-color - Text color
 * @cssprop --button-hover-bg - Hover background
 * @cssprop --button-active-bg - Active/pressed background
 * @cssprop --button-border - Border (width, style, color)
 * @cssprop --button-radius - Border radius
 * @cssprop --button-padding - Inner padding
 * @cssprop --button-gap - Gap between icon and text
 * @cssprop --button-font-size - Font size
 * @cssprop --button-font-weight - Font weight
 *
 * @fires click - Emitted when button is clicked (unless disabled/loading)
 */

const styles = css`
  /* ========================================
     Base Styles & Defaults
     ======================================== */

  :host {
    --_radius: var(--button-radius, var(--rounded-md));
    --_font-weight: var(--button-font-weight, var(--font-weight-medium));
    --_gap: var(--button-gap, var(--size-2));
    --_padding: var(--button-padding, var(--size-2) var(--size-4));
    --_font-size: var(--button-font-size, var(--text-sm));
    --_height: var(--size-10);
    
    display: inline-flex;
  }

  button {
    all: unset;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--_gap);
    padding: var(--_padding);
    height: var(--_height);
    width: 100%;
    border-radius: var(--_radius);
    font-size: var(--_font-size);
    font-weight: var(--_font-weight);
    line-height: var(--leading-md);
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    position: relative;
    box-sizing: border-box;
    transition:
      background var(--transition-normal),
      border-color var(--transition-normal),
      color var(--transition-normal),
      opacity var(--transition-normal),
      transform var(--transition-fast);
  }

  button:focus-visible {
    outline: var(--border-2) solid currentColor;
    outline-offset: var(--border-2);
  }

  /* ========================================
     Slotted Icons (Prefix/Suffix)
     ======================================== */

  ::slotted([slot='prefix']),
  ::slotted([slot='suffix']) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  ::slotted(svg) {
    width: 1em;
    height: 1em;
    flex-shrink: 0;
  }

  /* ========================================
     Size Variants
     ======================================== */

  :host([size='sm']) {
    --_padding: var(--size-1-5) var(--size-3);
    --_font-size: var(--text-sm);
    --_height: var(--size-8);
  }

  :host([size='sm']) button {
    line-height: var(--leading-sm);
  }

  :host([size='lg']) {
    --_padding: var(--size-2-5) var(--size-5);
    --_font-size: var(--text-md);
    --_height: var(--size-12);
  }

  :host([size='lg']) button {
    line-height: var(--leading-lg);
  }

  :host([icon-only]) button {
    padding: 0;
    aspect-ratio: 1;
  }

  /* ========================================
     Rounded Variant
     ======================================== */

  /* Default rounded for non-icon-only (no value or empty = full pill) */
  :host([rounded]:not([icon-only]):not([rounded='sm']):not([rounded='md']):not([rounded='lg']):not([rounded='xl']):not([rounded='2xl']):not([rounded='3xl'])) {
    --_radius: var(--rounded-full);
  }

  /* Icon-only always uses perfect circle */
  :host([rounded][icon-only]) button {
    border-radius: 50%;
  }

  /* Specific radius values from theme */
  :host([rounded='sm']:not([icon-only])) {
    --_radius: var(--rounded-sm);
  }

  :host([rounded='md']:not([icon-only])) {
    --_radius: var(--rounded-md);
  }

  :host([rounded='lg']:not([icon-only])) {
    --_radius: var(--rounded-lg);
  }

  :host([rounded='xl']:not([icon-only])) {
    --_radius: var(--rounded-xl);
  }

  :host([rounded='2xl']:not([icon-only])) {
    --_radius: var(--rounded-2xl);
  }

  :host([rounded='3xl']:not([icon-only])) {
    --_radius: var(--rounded-3xl);
  }

  :host([rounded='full']:not([icon-only])) {
    --_radius: var(--rounded-full);
  }

  :host([icon-only]) .content {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  /* ========================================
     Color Themes
     ======================================== */

  :host(:not([color])),
  :host([color='primary']) {
    --_base: var(--color-primary);
    --_contrast: var(--color-primary-contrast);
    --_focus: var(--color-primary-focus);
    --_content: var(--color-primary-content);
    --_backdrop: var(--color-primary-backdrop);
  }

  :host([color='secondary']) {
    --_base: var(--color-secondary);
    --_contrast: var(--color-secondary-contrast);
    --_focus: var(--color-secondary-focus);
    --_content: var(--color-secondary-content);
    --_backdrop: var(--color-secondary-backdrop);
  }

  :host([color='success']) {
    --_base: var(--color-success);
    --_contrast: var(--color-success-contrast);
    --_focus: var(--color-success-focus);
    --_content: var(--color-success-content);
    --_backdrop: var(--color-success-backdrop);
  }

  :host([color='warning']) {
    --_base: var(--color-warning);
    --_contrast: var(--color-warning-contrast);
    --_focus: var(--color-warning-focus);
    --_content: var(--color-warning-content);
    --_backdrop: var(--color-warning-backdrop);
  }

  :host([color='error']) {
    --_base: var(--color-error);
    --_contrast: var(--color-error-contrast);
    --_focus: var(--color-error-focus);
    --_content: var(--color-error-content);
    --_backdrop: var(--color-error-backdrop);
  }

  /* ========================================
     Visual Variants - Solid (Default)
     ======================================== */

  button {
    background: var(--button-bg, var(--_base));
    color: var(--button-color, var(--_contrast));
    border: var(--button-border, var(--border) solid transparent);
  }

  button:hover {
    background: var(--button-hover-bg, var(--_focus));
  }

  button:active {
    background: var(--button-active-bg, var(--_content));
  }

  /* ========================================
     Visual Variants - Flat
     ======================================== */

  :host([variant='flat']) button {
    background: var(--button-bg, var(--_backdrop));
    color: var(--button-color, var(--_base));
  }

  :host([variant='flat']) button:hover {
    background: var(--button-hover-bg, var(--_focus));
    color: var(--_contrast);
  }

  :host([variant='flat']) button:active {
    background: var(--button-active-bg, var(--_content));
    color: var(--_contrast);
  }

  /* ========================================
     Visual Variants - Bordered
     ======================================== */

  :host([variant='bordered']) button {
    background: var(--button-bg, var(--_backdrop));
    color: var(--button-color, var(--_base));
    border-color: var(--_base);
  }

  :host([variant='bordered']) button:hover {
    background: var(--button-hover-bg, var(--_focus));
    border-color: var(--_focus);
    color: var(--_contrast);
  }

  :host([variant='bordered']) button:active {
    background: var(--button-active-bg, var(--_content));
    color: var(--_contrast);
  }

  /* ========================================
     Visual Variants - Outline
     ======================================== */

  :host([variant='outline']) button {
    background: transparent;
    color: var(--button-color, var(--_base));
    border-color: var(--_base);
  }

  :host([variant='outline']) button:hover {
    background: var(--button-hover-bg, var(--_backdrop));
    border-color: var(--_focus);
  }

  :host([variant='outline']) button:active {
    background: var(--button-active-bg, var(--_base));
    color: var(--_contrast);
  }

  /* ========================================
     Visual Variants - Ghost
     ======================================== */

  :host([variant='ghost']) button {
    background: transparent;
    color: var(--button-color, var(--_base));
  }

  :host([variant='ghost']) button:hover {
    background: var(--button-hover-bg, var(--_backdrop));
  }

  :host([variant='ghost']) button:active {
    background: var(--button-active-bg, var(--_base));
    color: var(--_contrast);
  }

  /* ========================================
     Visual Variants - Text
     ======================================== */

  :host([variant='text']) button {
    background: transparent;
    color: var(--button-color, var(--_base));
  }

  :host([variant='text']) button:hover {
    color: var(--_focus);
  }

  :host([variant='text']) button:active {
    opacity: 0.7;
  }

  /* ========================================
     Visual Variants - Glass & Frost
     ======================================== */

  :host([variant='glass']) button,
  :host([variant='frost']) button {
    backdrop-filter: blur(var(--blur-lg)) saturate(180%);
    box-shadow: var(--shadow-md), var(--inset-shadow-xs);
  }

  :host([variant='glass']) button {
    background: color-mix(in srgb, var(--_base) 30%, var(--color-contrast) 10%);
    border-color: color-mix(in srgb, var(--_focus) 40%, transparent);
    color: var(--button-color, color-mix(in srgb, var(--_contrast) 90%, transparent));
    text-shadow: var(--text-shadow-xs);
    filter: brightness(1.05);
  }

  :host([variant='glass']) button:hover {
    background: color-mix(in srgb, var(--_backdrop) 60%, var(--_base) 40%);
    border-color: color-mix(in srgb, var(--_focus) 55%, transparent);
  }

  :host([variant='glass']) button:active {
    background: color-mix(in srgb, var(--_backdrop) 50%, var(--_base) 50%);
    border-color: color-mix(in srgb, var(--_focus) 65%, transparent);
  }

  :host([variant='frost']) button {
    background: color-mix(in srgb, var(--color-canvas) 55%, transparent);
    border-color: color-mix(in srgb, var(--color-contrast-400) 40%, transparent);
    color: var(--button-color, var(--_content));
    text-shadow: var(--text-shadow-2xs);
  }

  :host([variant='frost']) button:hover {
    background: color-mix(in srgb, var(--color-canvas) 65%, transparent);
    border-color: color-mix(in srgb, var(--_focus) 30%, transparent);
  }

  :host([variant='frost']) button:active {
    background: color-mix(in srgb, var(--color-canvas) 70%, transparent);
    border-color: color-mix(in srgb, var(--_focus) 40%, transparent);
  }

  /* ========================================
     States
     ======================================== */

  :host([disabled]) button,
  :host([loading]) button {
    opacity: 0.5;
    cursor: not-allowed;
  }

  :host([loading]) .content {
    visibility: hidden;
  }

  /* ========================================
     Loading Spinner
     ======================================== */

  .loader {
    position: absolute;
    width: 1em;
    height: 1em;
    border: var(--border-2) solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export type ButtonProps = {
  variant?: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text' | 'glass' | 'frost';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  'icon-only'?: boolean;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full' | '';
};

defineElement<HTMLButtonElement, ButtonProps>('bit-button', {
  observedAttributes: ['variant', 'color', 'size', 'disabled', 'loading', 'type', 'icon-only', 'rounded'] as const,

  onAttributeChanged(name, _oldValue, _newValue, el) {
    const host = el as unknown as HTMLElement;

    if (name === 'disabled' || name === 'loading') {
      const isDisabled = host.hasAttribute('disabled') || host.hasAttribute('loading');
      host.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');

      const isBusy = host.hasAttribute('loading');
      host.setAttribute('aria-busy', isBusy ? 'true' : 'false');
    }
  },

  onConnected(el) {
    el.on('button', 'click', (e) => {
      if (el.hasAttribute('disabled') || el.hasAttribute('loading')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      el.emit('click', { originalEvent: e });
      e.stopPropagation();
    });
  },

  styles: [styles],

  template: (el) => {
    return html`
      <button
        type="${el.getAttribute('type') || 'button'}"
        ?disabled="${el.hasAttribute('disabled') || el.hasAttribute('loading')}"
        aria-disabled="${el.hasAttribute('disabled') || el.hasAttribute('loading') ? 'true' : 'false'}"
        aria-busy="${el.hasAttribute('loading') ? 'true' : 'false'}">
        ${el.hasAttribute('loading') ? html`<span class="loader" aria-label="Loading"></span>` : ''}
        <slot name="prefix"></slot>
        <span class="content"><slot></slot></span>
        <slot name="suffix"></slot>
      </button>
    `;
  },
});

export default {};
