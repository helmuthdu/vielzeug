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
 * @attr {boolean} fullwidth - Button takes full width of its container
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
    --_font-size: var(--button-font-size, var(--text-sm));
    --_font-weight: var(--button-font-weight, var(--font-medium));
    --_padding: var(--button-padding, var(--size-2) var(--size-4));
    --_gap: var(--button-gap, var(--size-2));
    --_height: var(--button-height, var(--size-10));
    --_shadow: var(--button-shadow, var(--shadow-2xs));
    --_border-width: var(--button-border-width, var(--border));
    --_border-color: var(--button-border-color, var(--color-contrast-200));

    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  :host([disabled]) {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  button {
    align-items: center;
    all: unset;
    background: var(--button-bg);
    border-radius: var(--_radius);
    border: var(--_border-width) solid var(--_border-color);
    box-shadow: var(--_shadow);
    box-sizing: border-box;
    color: var(--button-color);
    cursor: pointer;
    display: flex;
    font-size: var(--_font-size);
    font-weight: var(--_font-weight);
    gap: var(--_gap);
    height: var(--_height);
    justify-content: center;
    line-height: var(--leading-normal);
    padding: var(--_padding);
    position: relative;
    user-select: none;
    white-space: nowrap;
    width: 100%;
    transition:
      background var(--transition-normal),
      border-color var(--transition-normal),
      box-shadow var(--transition-normal),
      color var(--transition-normal),
      opacity var(--transition-normal),
      transform var(--transition-fast);
  }

  button:hover {
    background: var(--button-hover-bg);
    border-color: var(--button-hover-border-color, var(--_border-color));
    box-shadow: var(--button-hover-shadow);
  }

  button:active {
    background: var(--button-active-bg);
    box-shadow: var(--button-active-shadow);
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
    --_gap: var(--size-1-5);
  }

  :host([size='sm']) button {
    line-height: var(--leading-tight);
  }

  :host([size='lg']) {
    --_padding: var(--size-2-5) var(--size-5);
    --_font-size: var(--text-base);
    --_height: var(--size-12);
    --_gap: var(--size-2-5);
  }

  :host([size='lg']) button {
    line-height: var(--leading-relaxed);
  }

  :host([icon-only]) button {
    padding: 0;
    aspect-ratio: 1;
  }

  /* ========================================
     Full Width
     ======================================== */

  :host([fullwidth]) {
    display: flex;
    width: 100%;
  }

  :host([fullwidth]) button {
    width: 100%;
  }

  /* ========================================
     Rounded Variant
     ======================================== */

  /* Default rounded for non-icon-only (no value or empty = full pill) */
  :host(
    [rounded]:not([icon-only]):not([rounded='sm']):not([rounded='md']):not([rounded='lg']):not([rounded='xl']):not(
        [rounded='2xl']
      ):not([rounded='3xl'])
  ) {
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
    --_backdrop: var(--color-primary-backdrop);
    --_content: var(--color-primary-content);
    --_contrast: var(--color-primary-contrast);
    --_focus: var(--color-primary-focus);
    --_shadow: var(--color-primary-shadow);
  }

  :host([color='secondary']) {
    --_base: var(--color-secondary);
    --_backdrop: var(--color-secondary-backdrop);
    --_content: var(--color-secondary-content);
    --_contrast: var(--color-secondary-contrast);
    --_focus: var(--color-secondary-focus);
    --_shadow: var(--color-secondary-shadow);
  }

  :host([color='success']) {
    --_base: var(--color-success);
    --_backdrop: var(--color-success-backdrop);
    --_content: var(--color-success-content);
    --_contrast: var(--color-success-contrast);
    --_focus: var(--color-success-focus);
    --_shadow: var(--color-success-shadow);
  }

  :host([color='warning']) {
    --_base: var(--color-warning);
    --_backdrop: var(--color-warning-backdrop);
    --_content: var(--color-warning-content);
    --_contrast: var(--color-warning-contrast);
    --_focus: var(--color-warning-focus);
    --_shadow: var(--color-warning-shadow);
  }

  :host([color='error']) {
    --_base: var(--color-error);
    --_backdrop: var(--color-error-backdrop);
    --_content: var(--color-error-content);
    --_contrast: var(--color-error-contrast);
    --_focus: var(--color-error-focus);
    --_shadow: var(--color-error-shadow);
  }

  /* ========================================
     Visual Variants
     ======================================== */

  /* Solid (Default) */
  :host(:not([variant])),
  :host([variant='solid']) {
    --_border-color: var(--color-contrast-200);
    --_shadow: var(--shadow-2xs);
    --button-active-bg: var(--_content);
    --button-active-shadow: var(--inset-shadow-2xs);
    --button-bg: var(--_base);
    --button-color: var(--_contrast);
    --button-hover-bg: var(--_focus);
    --button-hover-shadow: var(--shadow-xs);
  }

  /* Flat */
  :host([variant='flat']) {
    --_border-color: color-mix(in srgb, var(--_focus) 20%, transparent);
    --_shadow: var(--inset-shadow-2xs);
    --button-active-bg: var(--_content);
    --button-active-shadow: var(--inset-shadow-sm);
    --button-bg: color-mix(in srgb, var(--_backdrop) 8%, var(--color-contrast-100));
    --button-color: var(--_base);
    --button-hover-bg: var(--_focus);
    --button-hover-shadow: var(--inset-shadow-xs), var(--shadow-xs);
  }

  :host([variant='flat']) button:hover,
  :host([variant='flat']) button:active {
    color: var(--_contrast);
  }

  /* Bordered */
  :host([variant='bordered']) {
    --_border-color: color-mix(in srgb, var(--_focus) 70%, transparent);
    --_shadow: var(--inset-shadow-xs), var(--shadow-xs);
    --button-active-bg: var(--_content);
    --button-active-shadow: var(--inset-shadow-sm);
    --button-bg: var(--_backdrop);
    --button-color: var(--_base);
    --button-hover-bg: var(--_focus);
    --button-hover-border-color: var(--_focus);
    --button-hover-shadow: var(--inset-shadow-xs), var(--shadow-sm);
  }

  :host([variant='bordered']) button:hover,
  :host([variant='bordered']) button:active {
    color: var(--_contrast);
  }

  /* Outline */
  :host([variant='outline']) {
    --_border-color: var(--_base);
    --_shadow: var(--shadow-none);
    --button-active-bg: var(--_base);
    --button-active-shadow: var(--inset-shadow-2xs);
    --button-bg: transparent;
    --button-color: var(--_base);
    --button-hover-bg: var(--_backdrop);
    --button-hover-border-color: var(--_focus);
    --button-hover-shadow: var(--shadow-xs);
  }

  :host([variant='outline']) button:active {
    color: var(--_contrast);
  }

  /* Ghost */
  :host([variant='ghost']) {
    --_border-color: transparent;
    --_border-width: var(--border-0);
    --_shadow: var(--shadow-none);
    --button-active-bg: var(--_base);
    --button-active-shadow: var(--inset-shadow-2xs);
    --button-bg: transparent;
    --button-color: var(--_base);
    --button-hover-bg: var(--_backdrop);
    --button-hover-shadow: var(--shadow-xs);
  }

  :host([variant='ghost']) button:active {
    color: var(--_contrast);
  }

  /* Text */
  :host([variant='text']) {
    --_border-color: transparent;
    --_border-width: var(--border-0);
    --_shadow: var(--shadow-none);
    --button-bg: transparent;
    --button-color: var(--_base);
    --button-hover-bg: transparent;
  }

  :host([variant='text']) button:hover {
    color: var(--_focus);
  }

  :host([variant='text']) button:active {
    color: var(--_content);
  }

  /* Glass & Frost */
  :host([variant='glass']) button,
  :host([variant='frost']) button {
    backdrop-filter: blur(var(--blur-lg)) saturate(180%);
    box-shadow: var(--shadow-md), var(--inset-shadow-xs);
  }

  :host([variant='glass']) {
    --_border-color: color-mix(in srgb, var(--_focus) 40%, transparent);
    --button-bg: color-mix(in srgb, var(--_base) 30%, var(--color-contrast) 10%);
    --button-color: color-mix(in srgb, var(--_contrast) 90%, transparent);
  }

  :host([variant='glass']) button {
    text-shadow: var(--text-shadow-xs);
    filter: brightness(1.05);
  }

  :host([variant='glass']) button:hover {
    backdrop-filter: blur(var(--blur-xl)) saturate(200%);
    background: color-mix(in srgb, var(--_backdrop) 60%, var(--_base) 40%);
    border-color: color-mix(in srgb, var(--_focus) 55%, transparent);
  }

  :host([variant='glass']) button:active {
    background: color-mix(in srgb, var(--_backdrop) 50%, var(--_base) 50%);
    border-color: color-mix(in srgb, var(--_focus) 65%, transparent);
  }

  :host([variant='frost']) {
    --_border-color: color-mix(in srgb, var(--color-contrast-400) 40%, transparent);
    --button-bg: color-mix(in srgb, var(--color-canvas) 55%, transparent);
    --button-color: var(--_content);
  }

  :host([variant='frost']) button {
    text-shadow: var(--text-shadow-2xs);
  }

  :host([variant='frost']) button:hover {
    backdrop-filter: blur(var(--blur-xl)) saturate(200%);
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
  'fullwidth'?: boolean;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full' | '';
};

defineElement<HTMLButtonElement, ButtonProps>('bit-button', {
  observedAttributes: ['variant', 'color', 'size', 'disabled', 'loading', 'type', 'icon-only', 'fullwidth', 'rounded'] as const,

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
