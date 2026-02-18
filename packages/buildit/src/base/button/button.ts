import { css, defineElement, html } from '@vielzeug/craftit';

/**
 * bit-button - A customizable button component
 *
 * @element bit-button
 *
 * @attr {string} variant - Button style variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text'
 * @attr {string} color - Button color theme: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
 * @attr {string} size - Button size: 'sm' | 'md' | 'lg'
 * @attr {boolean} disabled - Disable the button
 * @attr {boolean} loading - Show loading state
 * @attr {boolean} icon-only - Button with only an icon (no text padding)
 * @attr {boolean} rounded - Fully rounded button (pill shape)
 * @attr {string} type - Button type: 'button' | 'submit' | 'reset'
 *
 * @slot - Default slot for button content
 * @slot prefix - Content before the button text (e.g., icons)
 * @slot suffix - Content after the button text (e.g., icons, badges)
 *
 * @cssprop --btn-bg - Background color
 * @cssprop --btn-color - Text color
 * @cssprop --btn-hover-bg - Hover background
 * @cssprop --btn-active-bg - Active/pressed background
 * @cssprop --btn-border - Border (width, style, color)
 * @cssprop --btn-radius - Border radius
 * @cssprop --btn-padding - Inner padding
 * @cssprop --btn-gap - Gap between icon and text
 * @cssprop --btn-font-size - Font size
 * @cssprop --btn-font-weight - Font weight
 *
 * @fires click - Emitted when button is clicked (unless disabled/loading)
 */

const styles = css`
  :host {
    display: inline-block;
    --btn-radius: var(--rounded-md);
    --btn-font-weight: var(--font-weight-medium);
    --btn-gap: var(--size-2);
  }

  button {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--btn-gap);
    padding: var(--btn-padding);
    font-family: inherit;
    font-size: var(--btn-font-size);
    font-weight: var(--btn-font-weight);
    white-space: nowrap;
    user-select: none;
    cursor: pointer;
    transition: all 150ms ease-in-out;
    border-radius: var(--btn-radius);
    position: relative;
  }

  button:focus-visible {
    outline: var(--border-2) solid currentColor;
    outline-offset: var(--border-2);
  }

  /* Sizes */
  :host([size='sm']) button {
    --btn-padding: var(--size-1-5) var(--size-3);
    --btn-font-size: var(--text-sm);
    line-height: var(--line-spacing-sm);
    height: var(--size-8);
  }

  :host(:not([size])) button,
  :host([size='md']) button {
    --btn-padding: var(--size-2) var(--size-4);
    --btn-font-size: var(--text-sm);
    line-height: var(--line-spacing-md);
    height: var(--size-10);
  }

  :host([size='lg']) button {
    --btn-padding: var(--size-2-5) var(--size-5);
    --btn-font-size: var(--text-md);
    line-height: var(--line-spacing-lg);
    height: var(--size-12);
  }

  :host([icon-only]) button {
    padding: 0;
    aspect-ratio: 1;
  }

  :host([rounded]:not([icon-only])) button {
    --btn-radius: 9999px;
  }

  :host([rounded][icon-only]) button {
    border-radius: 50%;
  }

  :host([icon-only]) .content {
    justify-content: center;
    align-items: center;
    display: flex;
  }

  /* Colors - Set CSS variables for each color */
  :host(:not([color])) button,
  :host([color='primary']) button {
    --btn-base: var(--color-primary);
    --btn-contrast: var(--color-primary-contrast);
    --btn-focus: var(--color-primary-focus);
    --btn-content: var(--color-primary-content);
    --btn-backdrop: var(--color-primary-backdrop);
  }

  :host([color='secondary']) button {
    --btn-base: var(--color-secondary-base);
    --btn-contrast: var(--color-secondary-contrast);
    --btn-focus: var(--color-secondary-focus);
    --btn-content: var(--color-secondary-content);
    --btn-backdrop: var(--color-secondary-backdrop);
  }

  :host([color='success']) button {
    --btn-base: var(--color-success);
    --btn-contrast: var(--color-success-contrast);
    --btn-focus: var(--color-success-focus);
    --btn-content: var(--color-success-content);
    --btn-backdrop: var(--color-success-backdrop);
  }

  :host([color='warning']) button {
    --btn-base: var(--color-warning);
    --btn-contrast: var(--color-warning-contrast);
    --btn-focus: var(--color-warning-focus);
    --btn-content: var(--color-warning-content);
    --btn-backdrop: var(--color-warning-backdrop);
  }

  :host([color='error']) button {
    --btn-base: var(--color-error);
    --btn-contrast: var(--color-error-contrast);
    --btn-focus: var(--color-error-focus);
    --btn-content: var(--color-error-content);
    --btn-backdrop: var(--color-error-backdrop);
  }

  /* Variants */
  :host(:not([variant])) button,
  :host([variant='solid']) button {
    background: var(--btn-bg, var(--btn-base));
    color: var(--btn-color, var(--btn-contrast));
    border: var(--btn-border, var(--border, 1px) solid transparent);
  }

  :host(:not([variant])) button:hover,
  :host([variant='solid']) button:hover {
    background: var(--btn-hover-bg, var(--btn-focus));
  }

  :host(:not([variant])) button:active,
  :host([variant='solid']) button:active {
    background: var(--btn-active-bg, var(--btn-content));
  }

  :host([variant='flat']) button {
    background: var(--btn-bg, var(--btn-backdrop));
    color: var(--btn-color, var(--btn-base));
    border: var(--btn-border, var(--border, 1px) solid transparent);
  }

  :host([variant='flat']) button:hover {
    background: var(--btn-hover-bg, var(--btn-focus));
    color: var(--btn-contrast);
  }

  :host([variant='flat']) button:active {
    background: var(--btn-active-bg, var(--btn-content));
    color: var(--btn-contrast);
  }

  :host([variant='bordered']) button {
    background: var(--btn-bg, var(--btn-backdrop));
    color: var(--btn-color, var(--btn-base));
    border: var(--btn-border, var(--border, 1px) solid var(--btn-base));
  }

  :host([variant='bordered']) button:hover {
    background: var(--btn-hover-bg, var(--btn-focus));
    color: var(--btn-contrast);
    border-color: var(--btn-focus);
  }

  :host([variant='bordered']) button:active {
    background: var(--btn-active-bg, var(--btn-content));
    color: var(--btn-contrast);
  }

  :host([variant='outline']) button {
    background: var(--btn-bg, transparent);
    color: var(--btn-color, var(--btn-base));
    border: var(--btn-border, var(--border, 1px) solid var(--btn-base));
  }

  :host([variant='outline']) button:hover {
    background: var(--btn-hover-bg, var(--btn-backdrop));
    border-color: var(--btn-focus);
  }

  :host([variant='outline']) button:active {
    background: var(--btn-active-bg, var(--btn-base));
    color: var(--btn-contrast);
  }

  :host([variant='ghost']) button {
    background: var(--btn-bg, transparent);
    color: var(--btn-color, var(--btn-base));
    border: var(--btn-border, var(--border, 1px) solid transparent);
  }

  :host([variant='ghost']) button:hover {
    background: var(--btn-hover-bg, var(--btn-backdrop));
  }

  :host([variant='ghost']) button:active {
    background: var(--btn-active-bg, var(--btn-base));
    color: var(--btn-contrast);
  }

  :host([variant='text']) button {
    background: var(--btn-bg, transparent);
    color: var(--btn-color, var(--btn-base));
    border: var(--btn-border, var(--border, 1px) solid transparent);
  }

  :host([variant='text']) button:hover {
    background: var(--btn-hover-bg, transparent);
    color: var(--btn-focus);
  }

  :host([variant='text']) button:active {
    background: var(--btn-active-bg, transparent);
    opacity: 0.7;
  }

  /* States */
  :host([disabled]) button,
  :host([loading]) button {
    opacity: 0.5;
    cursor: not-allowed;
  }

  :host([loading]) .content {
    visibility: hidden;
  }

  /* Loading spinner */
  .loader {
    position: absolute;
    width: 1em;
    height: 1em;
    border: 2px solid currentColor;
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

defineElement('bit-button', {
  observedAttributes: ['variant', 'color', 'size', 'disabled', 'loading', 'type', 'icon-only', 'rounded'] as const,

  onConnected(el) {
    el.on('button', 'click', (e) => {
      if (el.hasAttribute('disabled') || el.hasAttribute('loading')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      el.emit('click', { originalEvent: e });
    });
  },

  styles: [styles],
  template: (el) => html`
    <button
      type="${el.getAttribute('type') || 'button'}"
      ?disabled="${el.hasAttribute('disabled') || el.hasAttribute('loading')}"
      aria-disabled="${el.hasAttribute('disabled') || el.hasAttribute('loading')}"
      aria-busy="${el.hasAttribute('loading')}">
      ${el.hasAttribute('loading') ? html`<span class="loader" aria-label="Loading"></span>` : ''}
      <slot name="prefix"></slot>
      <span class="content"><slot></slot></span>
      <slot name="suffix"></slot>
    </button>
  `,
});

// Export for module usage
export default {};

