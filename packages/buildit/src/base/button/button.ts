import { css, defineElement, html } from '@vielzeug/craftit';
import {
  colorThemeMixin,
  disabledLoadingMixin,
  frostVariantMixin,
  rainbowEffectMixin,
  registerRainbowProperty,
  roundedVariantMixin,
} from '../../styles';
import type { ButtonType, ClickEventDetail, ComponentSize, RoundedSize, ThemeColor, VisualVariant } from '../../types';

// Register CSS property for rainbow animation
registerRainbowProperty();

/**
 * # bit-button
 *
 * A customizable button component with multiple variants, sizes, and states.
 * Supports icons, loading states, and special effects like frost and rainbow.
 *
 * @element bit-button
 */

const styles = css`
  /* ========================================
     Base Styles & Defaults
     ======================================== */

  :host {
    --_bg: var(--button-bg, var(--color-contrast-50));
    --_color: var(--button-color, var(--color-contrast-900));
    --_border: var(--button-border, var(--border));
    --_border-color: var(--button-border-color, var(--color-contrast-200));
    --_radius: var(--button-radius, var(--rounded-md));
    --_padding: var(--button-padding, var(--size-2) var(--size-4));
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
    all: unset;
    box-sizing: border-box;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: var(--size-10);
    padding: var(--_padding);
    gap: var(--size-2);

    background: var(--_bg);
    color: var(--_color);
    border: var(--_border) solid var(--_border-color);
    border-radius: var(--_radius);
    box-shadow: var(--_shadow);

    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    line-height: var(--leading-normal);
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
    width: var(--size-5);
    height: var(--size-5);
    flex-shrink: 0;
  }

  /* ========================================
     Size Variants
     ======================================== */

  :host([size='sm']) button {
    height: var(--size-8);
    padding: var(--size-1-5) var(--size-3);
    gap: var(--size-1-5);
    font-size: var(--text-sm);
    line-height: var(--leading-tight);
  }

  :host([size='sm']) ::slotted(svg) {
    width: var(--size-4);
    height: var(--size-4);
  }

  :host([size='lg']) button {
    height: var(--size-12);
    padding: var(--size-2-5) var(--size-5);
    gap: var(--size-2-5);
    font-size: var(--text-base);
    line-height: var(--leading-relaxed);
  }

  :host([size='lg']) ::slotted(svg) {
    width: var(--size-6);
    height: var(--size-6);
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

  /* ========================================
     Rounded Variant (Shared Mixin)
     ======================================== */

  ${roundedVariantMixin()}

  /* Icon-only always uses perfect circle */
  :host([rounded][icon-only]) button {
    border-radius: 50%;
  }

  /* ========================================
     Color Themes (Shared Mixin)
     ======================================== */

  ${colorThemeMixin()}

  /* ========================================
     Visual Variants
     ======================================== */

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

  /* ========================================
     Frost Variant (Shared Mixin)
     ======================================== */

  ${frostVariantMixin('button')}

  /* Additional button-specific frost active states */
  :host([variant='frost']:not([color])) button:active {
    background: color-mix(in srgb, var(--color-canvas) 70%, transparent);
    border-color: color-mix(in srgb, var(--color-contrast-500) 40%, transparent);
  }

  :host([variant='frost'][color]) button:active {
    background: color-mix(in srgb, var(--_theme-backdrop) 50%, var(--_theme-base) 50%);
    border-color: color-mix(in srgb, var(--_theme-focus) 65%, transparent);
  }

  /* ========================================
     Rainbow Border Effect (Shared Mixin)
     ======================================== */

  ${rainbowEffectMixin('button')}

  /* ========================================
     States (Shared Mixin)
     ======================================== */

  ${disabledLoadingMixin('button')}

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

/**
 * Button Component Properties
 *
 * A customizable button with multiple visual variants, theme colors, and special effects.
 *
 * ## Slots
 * - **default**: Button content (text, icons, etc.)
 * - **prefix**: Content before the button text (e.g., icons)
 * - **suffix**: Content after the button text (e.g., icons, badges)
 *
 * ## Events
 * - **click**: Emitted when button is clicked (unless disabled/loading)
 *
 * ## CSS Custom Properties
 * - `--button-bg`: Background color
 * - `--button-color`: Text color
 * - `--button-hover-bg`: Hover background
 * - `--button-active-bg`: Active/pressed background
 * - `--button-border`: Border (width, style, color)
 * - `--button-radius`: Border radius
 * - `--button-padding`: Inner padding
 * - `--button-gap`: Gap between icon and text
 * - `--button-font-size`: Font size
 * - `--button-font-weight`: Font weight
 *
 * @example
 * ```html
 * <!-- Basic usage -->
 * <bit-button variant="solid" color="primary">
 *   Click me
 * </bit-button>
 *
 * <!-- With icon -->
 * <bit-button color="secondary">
 *   <svg slot="prefix">...</svg>
 *   Save
 * </bit-button>
 *
 * <!-- Loading state -->
 * <bit-button loading color="success">
 *   Processing...
 * </bit-button>
 *
 * <!-- Icon-only -->
 * <bit-button icon-only color="primary">
 *   <svg slot="prefix">...</svg>
 * </bit-button>
 *
 * <!-- Frost variant with rainbow effect -->
 * <bit-button variant="frost" rainbow color="primary">
 *   Special Button
 * </bit-button>
 * ```
 */
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

/**
 * Button Click Event Detail
 */
export type ButtonClickEvent = ClickEventDetail;

const isDisabledOrLoading = (el: HTMLElement): boolean => {
  return el.hasAttribute('disabled') || el.hasAttribute('loading');
};

defineElement<HTMLButtonElement, ButtonProps>('bit-button', {
  observedAttributes: [
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
  ] as const,

  onAttributeChanged(name, _oldValue, _newValue, el) {
    const host = el as unknown as HTMLElement;

    if (name === 'disabled' || name === 'loading') {
      const disabled = isDisabledOrLoading(host);
      host.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      host.setAttribute('aria-busy', host.hasAttribute('loading') ? 'true' : 'false');
    }
  },

  onConnected(el) {
    el.on('button', 'click', (e) => {
      if (isDisabledOrLoading(el)) {
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
    const disabled = isDisabledOrLoading(el);
    const loading = el.hasAttribute('loading');

    return html`
      <button
        type="${el.getAttribute('type') || 'button'}"
        ?disabled="${disabled}"
        aria-disabled="${disabled ? 'true' : 'false'}"
        aria-busy="${loading ? 'true' : 'false'}">
        ${loading ? html`<span class="loader" aria-label="Loading"></span>` : ''}
        <slot name="prefix"></slot>
        <span class="content"><slot></slot></span>
        <slot name="suffix"></slot>
      </button>
    `;
  },
});

export default {};
