import {
  colorThemeMixin,
  disabledLoadingMixin,
  frostVariantMixin,
  rainbowEffectMixin,
  roundedVariantMixin,
  sizeVariantMixin,
} from '../../styles';
import type { ButtonType, ComponentSize, RoundedSize, ThemeColor, VisualVariant } from '../../types';

const styles = /* css */ `
  @layer buildit.base {
    :host {
      --_bg: var(--button-bg, var(--color-contrast-50));
      --_color: var(--button-color, var(--color-contrast-900));
      --_border: var(--button-border, var(--border));
      --_border-color: var(--button-border-color, var(--color-contrast-200));
      --_radius: var(--button-radius, var(--rounded-md));
      --_shadow: var(--button-shadow, var(--shadow-2xs));

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
      box-sizing: border-box;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: var(--_height, var(--size-10));
      padding: var(--_padding, var(--size-2) var(--size-4));
      gap: var(--_gap, var(--size-2));

      background: var(--_bg);
      color: var(--_color);
      border: var(--_border) solid var(--_border-color);
      border-radius: var(--_radius);
      box-shadow: var(--_shadow);

      font-size: var(--_font-size, var(--text-sm));
      font-weight: var(--font-medium);
      line-height: var(--_line-height, var(--leading-normal));
      white-space: nowrap;
      user-select: none;
      cursor: pointer;

      transition:
        background var(--transition-normal),
        border-color var(--transition-normal),
        box-shadow var(--transition-normal),
        color var(--transition-normal),
        opacity var(--transition-normal),
        transform var(--transition-fast);
    }

    button:focus-visible {
      outline: var(--border-2) solid currentColor;
      outline-offset: var(--border-2);
    }

    ::slotted([slot='prefix']),
    ::slotted([slot='suffix']) {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    ::slotted(svg) {
      width: var(--_icon-size, var(--size-5));
      height: var(--_icon-size, var(--size-5));
      flex-shrink: 0;
    }
  }

  @layer buildit.variants {

    :host([icon-only]) button {
      padding: 0;
      aspect-ratio: 1;
    }
  }

  @layer buildit.overrides {
    :host([fullwidth]) {
      display: flex;
      width: 100%;
    }
  }

  ${colorThemeMixin()}

  @layer buildit.variants {
    /* Solid (Default) - Full theme color background */
    :host(:not([variant])) button,
    :host([variant='solid']) button {
      background: var(--_theme-base);
      color: var(--_theme-contrast);
      border-color: var(--_theme-base);
      box-shadow: var(--shadow-2xs);
    }

    :host(:not([variant])) button:hover,
    :host([variant='solid']) button:hover {
      background: var(--_theme-focus);
      box-shadow: var(--shadow-xs);
    }

    :host(:not([variant])) button:active,
    :host([variant='solid']) button:active {
      background: var(--_theme-content);
      box-shadow: var(--inset-shadow-2xs);
    }

    /* Flat - Subtle background with theme color text */
    :host([variant='flat']) button {
      background: color-mix(in srgb, var(--_theme-backdrop) 8%, var(--color-contrast-100));
      color: var(--_theme-base);
      border-color: color-mix(in srgb, var(--_theme-focus) 20%, transparent);
      box-shadow: var(--inset-shadow-2xs);
    }

    :host([variant='flat']) button:hover {
      background: var(--_theme-focus);
      color: var(--_theme-contrast);
      box-shadow: var(--inset-shadow-xs), var(--shadow-xs);
    }

    :host([variant='flat']) button:active {
      background: var(--_theme-content);
      color: var(--_theme-contrast);
      box-shadow: var(--inset-shadow-sm);
    }

    /* Bordered - Outlined with filled background */
    :host([variant='bordered']) button {
      background: var(--_theme-backdrop);
      color: var(--_theme-base);
      border-color: var(--_theme-border);
      box-shadow: var(--inset-shadow-xs), var(--shadow-xs);
    }

    :host([variant='bordered']) button:hover {
      background: var(--_theme-focus);
      color: var(--_theme-contrast);
      border-color: var(--_theme-focus);
      box-shadow: var(--inset-shadow-xs), var(--shadow-sm);
    }

    :host([variant='bordered']) button:active {
      background: var(--_theme-content);
      color: var(--_theme-contrast);
      box-shadow: var(--inset-shadow-sm);
    }

    /* Outline - Transparent with colored border */
    :host([variant='outline']) button {
      background: transparent;
      color: var(--_theme-base);
      border-color: var(--_theme-base);
      box-shadow: var(--shadow-none);
    }

    :host([variant='outline']) button:hover {
      background: var(--_theme-backdrop);
      border-color: var(--_theme-focus);
      box-shadow: var(--shadow-xs);
    }

    :host([variant='outline']) button:active {
      background: var(--_theme-base);
      color: var(--_theme-contrast);
      box-shadow: var(--inset-shadow-2xs);
    }

    /* Ghost - Transparent until interaction */
    :host([variant='ghost']) button {
      background: transparent;
      color: var(--_theme-base);
      border-color: transparent;
      border-width: 0;
      box-shadow: var(--shadow-none);
    }

    :host([variant='ghost']) button:hover {
      background: var(--_theme-backdrop);
      box-shadow: var(--shadow-xs);
    }

    :host([variant='ghost']) button:active {
      background: var(--_theme-base);
      color: var(--_theme-contrast);
      box-shadow: var(--inset-shadow-2xs);
    }

    /* Text - Minimal styling, color on hover */
    :host([variant='text']) button {
      background: transparent;
      color: var(--_theme-base);
      border-color: transparent;
      border-width: 0;
      box-shadow: var(--shadow-none);
    }

    :host([variant='text']) button:hover {
      color: var(--_theme-focus);
    }

    :host([variant='text']) button:active {
      color: var(--_theme-content);
    }

    /* Additional button-specific frost active states */
    :host([variant='frost']:not([color])) button:active {
      background: color-mix(in srgb, var(--color-canvas) 70%, transparent);
      border-color: color-mix(in srgb, var(--color-contrast-500) 40%, transparent);
    }

    :host([variant='frost'][color]) button:active {
      background: color-mix(in srgb, var(--_theme-backdrop) 50%, var(--_theme-base) 50%);
      border-color: color-mix(in srgb, var(--_theme-focus) 65%, transparent);
    }
  }

  /* ========================================
     Other Variants & States
     ======================================== */


  ${sizeVariantMixin({
    lg: {
      fontSize: 'var(--text-base)',
      gap: 'var(--size-2-5)',
      height: 'var(--size-12)',
      iconSize: 'var(--size-6)',
      lineHeight: 'var(--leading-relaxed)',
      padding: 'var(--size-2-5) var(--size-5)',
    },
    sm: {
      fontSize: 'var(--text-sm)',
      gap: 'var(--size-1-5)',
      height: 'var(--size-8)',
      iconSize: 'var(--size-4)',
      lineHeight: 'var(--leading-tight)',
      padding: 'var(--size-1-5) var(--size-3)',
    },
  })}
  ${roundedVariantMixin()}
  ${frostVariantMixin('button')}
  ${rainbowEffectMixin('button')}
  ${disabledLoadingMixin('button')}

  @layer buildit.overrides {
    /* Icon-only always uses perfect circle */
    :host([rounded][icon-only]) button {
      border-radius: 50%;
    }

    :host([loading]) .content {
      visibility: hidden;
    }
  }

  /* ========================================
     Loading Spinner (unlayered for easy override)
     ======================================== */

  .content {
    display: contents;
  }

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

/** Button component properties */
export type ButtonProps = {
  /** Visual style variant */
  variant?: Exclude<VisualVariant, 'glass'>;
  /** Theme color */
  color?: ThemeColor;
  /** Button size */
  size?: ComponentSize;
  /** Disable button interaction */
  disabled?: boolean;
  /** Show loading state with spinner */
  loading?: boolean;
  /** Enable animated rainbow border effect */
  rainbow?: boolean;
  /** HTML button type attribute */
  type?: ButtonType;
  /** Icon-only mode (square aspect ratio, no padding) */
  'icon-only'?: boolean;
  /** Full width button (100% of container) */
  fullwidth?: boolean;
  /** Border radius size */
  rounded?: RoundedSize;
};

const isDisabledOrLoading = (el: HTMLElement): boolean => {
  return el.hasAttribute('disabled') || el.hasAttribute('loading');
};

/**
 * A customizable button component with multiple variants, sizes, and states.
 * Supports icons, loading states, and special effects like frost and rainbow.
 *
 * @element bit-button
 *
 * @attr {string} type - HTML button type: 'button' | 'submit' | 'reset'
 * @attr {boolean} disabled - Disable button interaction
 * @attr {boolean} loading - Show loading state with spinner
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'neutral'
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'frost'
 * @attr {string} size - Button size: 'sm' | 'md' | 'lg'
 * @attr {string} rounded - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
 * @attr {boolean} rainbow - Enable animated rainbow border effect
 * @attr {boolean} icon-only - Icon-only mode (square aspect ratio, no padding)
 * @attr {boolean} fullwidth - Full width button (100% of container)
 *
 * @fires click - Emitted when button is clicked (unless disabled/loading)
 *
 * @slot - Button content (text, icons, etc.)
 * @slot prefix - Content before the button text (e.g., icons)
 * @slot suffix - Content after the button text (e.g., icons, badges)
 *
 * @part button - The button element
 * @part loader - The loading spinner element
 * @part content - The button content wrapper
 *
 * @cssprop --button-bg - Background color
 * @cssprop --button-color - Text color
 * @cssprop --button-hover-bg - Hover background
 * @cssprop --button-active-bg - Active/pressed background
 * @cssprop --button-border - Border width
 * @cssprop --button-border-color - Border color
 * @cssprop --button-radius - Border radius
 * @cssprop --button-padding - Inner padding
 * @cssprop --button-gap - Gap between icon and text
 * @cssprop --button-font-size - Font size
 * @cssprop --button-shadow - Box shadow
 *
 * @example
 * ```html
 * <bit-button variant="solid" color="primary">Click me</bit-button>
 * <bit-button loading color="success">Processing...</bit-button>
 * <bit-button variant="frost" rainbow>Special Button</bit-button>
 * ```
 */
class BitButton extends HTMLElement {
  static observedAttributes = [
    'variant',
    'color',
    'size',
    'disabled',
    'loading',
    'rainbow',
    'type',
    'icon-only',
    'fullwidth',
    'rounded',
  ] as const;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();

    const button = this.shadowRoot?.querySelector('button') as HTMLButtonElement | null;
    if (button) {
      button.addEventListener('click', (e) => {
        if (isDisabledOrLoading(this)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        this.dispatchEvent(
          new CustomEvent('click', {
            bubbles: true,
            composed: true,
            detail: { originalEvent: e },
          }),
        );
        e.stopPropagation();
      });
    }
  }

  attributeChangedCallback(name: string, _oldValue: string | null, _newValue: string | null) {
    const innerButton = this.shadowRoot?.querySelector('button') as HTMLButtonElement | null;
    if (!innerButton) return;

    if (name === 'disabled' || name === 'loading') {
      const disabled = isDisabledOrLoading(this);
      const loading = this.hasAttribute('loading');

      innerButton.disabled = disabled;
      innerButton.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      innerButton.setAttribute('aria-busy', loading ? 'true' : 'false');

      this.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      this.setAttribute('aria-busy', loading ? 'true' : 'false');

      // Handle loader visibility
      const existingLoader = this.shadowRoot?.querySelector('.loader');
      if (loading && !existingLoader) {
        const loader = document.createElement('span');
        loader.className = 'loader';
        loader.setAttribute('aria-label', 'Loading');
        innerButton.insertBefore(loader, innerButton.firstChild);
      } else if (!loading && existingLoader) {
        existingLoader.remove();
      }
    } else if (name === 'type') {
      innerButton.type = (_newValue || 'button') as 'button' | 'submit' | 'reset';
    }
  }

  render() {
    const disabled = isDisabledOrLoading(this);
    const loading = this.hasAttribute('loading');
    const type = this.getAttribute('type') || 'button';

    this.shadowRoot!.innerHTML = /* html */ `
      <style>${styles}</style>
      <button
        part="button"
        type="${type}"
        ${disabled ? 'disabled' : ''}
        aria-disabled="${disabled ? 'true' : 'false'}"
        aria-busy="${loading ? 'true' : 'false'}">
        ${loading ? '<span class="loader" part="loader" aria-label="Loading"></span>' : ''}
        <slot name="prefix"></slot>
        <span class="content" part="content"><slot></slot></span>
        <slot name="suffix"></slot>
      </button>
    `;
  }
}

if (!customElements.get('bit-button')) {
  customElements.define('bit-button', BitButton);
}

export default {};
