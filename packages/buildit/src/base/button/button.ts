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
 * @attr {boolean} rounded - Fully rounded button (pill shape)
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
  :host {
    display: inline-flex;
    --button-radius: var(--rounded-md);
    --button-font-weight: var(--font-weight-medium);
    --button-gap: var(--size-2);
  }

  button {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--button-gap);
    padding: var(--button-padding);
    width: 100%;
    height: 100%;
    font-family: inherit;
    font-size: var(--button-font-size);
    font-weight: var(--button-font-weight);
    white-space: nowrap;
    user-select: none;
    cursor: pointer;
    transition: all 150ms ease-in-out;
    border-radius: var(--button-radius);
    position: relative;
  }

  button:focus-visible {
    outline: var(--border-2) solid currentColor;
    outline-offset: var(--border-2);
  }

  /* Sizes */
  :host([size='sm']) button {
    --button-padding: var(--size-1-5) var(--size-3);
    --button-font-size: var(--text-sm);
    line-height: var(--leading-sm);
    height: var(--size-8);
  }

  :host(:not([size])) button,
  :host([size='md']) button {
    --button-padding: var(--size-2) var(--size-4);
    --button-font-size: var(--text-sm);
    line-height: var(--leading-md);
    height: var(--size-10);
  }

  :host([size='lg']) button {
    --button-padding: var(--size-2-5) var(--size-5);
    --button-font-size: var(--text-md);
    line-height: var(--leading-lg);
    height: var(--size-12);
  }

  :host([icon-only]) button {
    padding: 0;
    aspect-ratio: 1;
  }

  :host([rounded]:not([icon-only])) button {
    --button-radius: var(--rounded-full);
  }

  :host([rounded][icon-only]) button {
    border-radius: 50%;
  }

  :host([icon-only]) .content {
    justify-content: center;
    align-items: center;
    display: flex;
  }

  /* Colors */
  :host(:not([color])) button,
  :host([color='primary']) button {
    --button-base: var(--color-primary);
    --button-contrast: var(--color-primary-contrast);
    --button-focus: var(--color-primary-focus);
    --button-content: var(--color-primary-content);
    --button-backdrop: var(--color-primary-backdrop);
    --button-shadow: var(--color-primary-shadow);
  }

  :host([color='secondary']) button {
    --button-base: var(--color-secondary);
    --button-contrast: var(--color-secondary-contrast);
    --button-focus: var(--color-secondary-focus);
    --button-content: var(--color-secondary-content);
    --button-backdrop: var(--color-secondary-backdrop);
    --button-shadow: var(--color-secondary-shadow);
  }

  :host([color='success']) button {
    --button-base: var(--color-success);
    --button-contrast: var(--color-success-contrast);
    --button-focus: var(--color-success-focus);
    --button-content: var(--color-success-content);
    --button-backdrop: var(--color-success-backdrop);
    --button-shadow: var(--color-success-shadow);
  }

  :host([color='warning']) button {
    --button-base: var(--color-warning);
    --button-contrast: var(--color-warning-contrast);
    --button-focus: var(--color-warning-focus);
    --button-content: var(--color-warning-content);
    --button-backdrop: var(--color-warning-backdrop);
    --button-shadow: var(--color-warning-shadow);
  }

  :host([color='error']) button {
    --button-base: var(--color-error);
    --button-contrast: var(--color-error-contrast);
    --button-focus: var(--color-error-focus);
    --button-content: var(--color-error-content);
    --button-backdrop: var(--color-error-backdrop);
    --button-shadow: var(--color-error-shadow);
  }

  /* Variants */
  :host(:not([variant])) button,
  :host([variant='solid']) button {
    background: var(--button-bg, var(--button-base));
    color: var(--button-color, var(--button-contrast));
    border: var(--button-border, var(--border, 1px) solid transparent);
  }

  :host(:not([variant])) button:hover,
  :host([variant='solid']) button:hover {
    background: var(--button-hover-bg, var(--button-focus));
  }

  :host(:not([variant])) button:active,
  :host([variant='solid']) button:active {
    background: var(--button-active-bg, var(--button-content));
  }

  :host([variant='flat']) button {
    background: var(--button-bg, var(--button-backdrop));
    color: var(--button-color, var(--button-base));
    border: var(--button-border, var(--border, 1px) solid transparent);
  }

  :host([variant='flat']) button:hover {
    background: var(--button-hover-bg, var(--button-focus));
    color: var(--button-contrast);
  }

  :host([variant='flat']) button:active {
    background: var(--button-active-bg, var(--button-content));
    color: var(--button-contrast);
  }

  :host([variant='bordered']) button {
    background: var(--button-bg, var(--button-backdrop));
    color: var(--button-color, var(--button-base));
    border: var(--button-border, var(--border, 1px) solid var(--button-base));
  }

  :host([variant='bordered']) button:hover {
    background: var(--button-hover-bg, var(--button-focus));
    color: var(--button-contrast);
    border-color: var(--button-focus);
  }

  :host([variant='bordered']) button:active {
    background: var(--button-active-bg, var(--button-content));
    color: var(--button-contrast);
  }

  :host([variant='outline']) button {
    background: var(--button-bg, transparent);
    color: var(--button-color, var(--button-base));
    border: var(--button-border, var(--border, 1px) solid var(--button-base));
  }

  :host([variant='outline']) button:hover {
    background: var(--button-hover-bg, var(--button-backdrop));
    border-color: var(--button-focus);
  }

  :host([variant='outline']) button:active {
    background: var(--button-active-bg, var(--button-base));
    color: var(--button-contrast);
  }

  :host([variant='ghost']) button {
    background: var(--button-bg, transparent);
    color: var(--button-color, var(--button-base));
    border: var(--button-border, var(--border, 1px) solid transparent);
  }

  :host([variant='ghost']) button:hover {
    background: var(--button-hover-bg, var(--button-backdrop));
  }

  :host([variant='ghost']) button:active {
    background: var(--button-active-bg, var(--button-base));
    color: var(--button-contrast);
  }

  :host([variant='text']) button {
    background: var(--button-bg, transparent);
    color: var(--button-color, var(--button-base));
    border: var(--button-border, var(--border, 1px) solid transparent);
  }

  :host([variant='text']) button:hover {
    background: var(--button-hover-bg, transparent);
    color: var(--button-focus);
  }

  :host([variant='text']) button:active {
    background: var(--button-active-bg, transparent);
    opacity: 0.7;
  }

  :host([variant='glass']) button {
    background: color-mix(in srgb, var(--button-base) 30%, var(--color-contrast) 10%);
    border: var(--button-border, var(--border) solid color-mix(in srgb, var(--button-focus) 40%, transparent));
    backdrop-filter: blur(var(--blur-lg)) saturate(180%) brightness(1.05);
    box-shadow: var(--shadow-md), var(--inset-shadow-xs);
    color: var(--button-color, color-mix(in srgb, var(--button-contrast) 90%, transparent));
    text-shadow: var(--text-shadow-xs);
  }

  :host([variant='glass']) button:hover {
    background: color-mix(in srgb, var(--button-backdrop) 60%, var(--button-base) 40%);
    border-color: color-mix(in srgb, var(--button-focus) 55%, transparent);
  }

  :host([variant='glass']) button:active {
    background: color-mix(in srgb, var(--button-backdrop) 50%, var(--button-base) 50%);
    border-color: color-mix(in srgb, var(--button-focus) 65%, transparent);
  }

  :host([variant='frost']) button {
    background: color-mix(in srgb, var(--color-canvas) 55%, transparent);
    border: var(--button-border, var(--border) solid color-mix(in srgb, var(--color-contrast-400) 40%, transparent));
    backdrop-filter: blur(var(--blur-lg)) saturate(180%);
    box-shadow: var(--shadow-md), var(--inset-shadow-xs);
    color: var(--button-color, var(--button-content));
    text-shadow: var(--text-shadow-2xs);
  }
  
  :host([variant='frost']) button:hover {
    background: color-mix(in srgb, var(--color-canvas) 65%, transparent);
    border-color: color-mix(in srgb, var(--button-focus) 30%, transparent);
  }
  
  :host([variant='frost']) button:active {
    background: color-mix(in srgb, var(--color-canvas) 70%, transparent);
    border-color: color-mix(in srgb, var(--button-focus) 40%, transparent);
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
  rounded?: boolean;
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
