import { css, defineElement, html } from '@vielzeug/craftit';
import { boxBaseCss } from './box-base.css';

// Register CSS property for rainbow animation (must be done in JS for Shadow DOM)
if (typeof CSS !== 'undefined' && CSS.registerProperty) {
  try {
    CSS.registerProperty({
      name: '--rainbow-angle',
      syntax: '<angle>',
      initialValue: '0deg',
      inherits: false,
    });
  } catch (e) {
    // Property might already be registered, ignore error
  }
}

/**
 * bit-box - A foundational layout primitive with theming support
 *
 * A simple, semantic container with color, elevation, and padding support.
 * The perfect building block for layouts and compositions.
 *
 * @element bit-box
 *
 * @attr {string} variant - Style variant: 'frost'
 * @attr {string} color - Color theme: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} padding - Padding size: 'none' | 'sm' | 'md' | 'lg' | 'xl'
 * @attr {string} elevation - Shadow elevation: '0' | '1' | '2' | '3' | '4' | '5'
 * @attr {string} rounded - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
 * @attr {boolean} rainbow - Enable animated rainbow border effect
 * @attr {string} as - Semantic HTML element to render as (div by default)
 *
 * @slot - Default slot for content
 *
 * @part box - The inner box element (for styling with ::part)
 *
 * @cssprop --box-bg - Background color
 * @cssprop --box-color - Text color
 * @cssprop --box-border - Border width
 * @cssprop --box-border-color - Border color
 * @cssprop --box-radius - Border radius
 * @cssprop --box-padding - Inner padding
 * @cssprop --box-shadow - Box shadow
 *
 * @example
 * <!-- Simple box with primary color -->
 * <bit-box color="primary">Content</bit-box>
 *
 * @example
 * <!-- Frost effect with elevation -->
 * <bit-box variant="frost" elevation="2">
 *   Navigation content
 * </bit-box>
 *
 * @example
 * <!-- Frost with color for frosted glass effect -->
 * <bit-box variant="frost" color="primary" padding="lg">
 *   Article content
 * </bit-box>
 *
 * @example
 * <!-- Rounded corners -->
 * <bit-box rounded="xl" color="primary">
 *   Extra large rounded corners
 * </bit-box>
 *
 * @example
 * <!-- Custom styles via ::part -->
 * <bit-box style="width: 100%;">Content</bit-box>
 * <style>
 *   bit-box::part(box) {
 *     border-left: 4px solid var(--color-primary);
 *   }
 * </style>
 */

// -------------------- Styles --------------------
const styles = css`
  /* ========================================
     Base Styles & Defaults
     ======================================== */

  :host {
    --_bg: var(--color-contrast-50);
    --_color: var(--color-contrast-900);
    --_border: var(--border);
    --_border-color: var(--color-contrast-300);
    --_radius: var(--rounded-md);
    --_padding: var(--size-4);
    --_shadow: var(--shadow-sm);

    display: block;
    position: relative;
    /* Allow host to inherit layout properties from inline styles */
    width: inherit;
    height: inherit;
  }

  /* Custom properties only work with default/neutral (no color attribute) */
  :host(:not([color])) {
    --_bg: var(--box-bg, var(--color-contrast-50));
    --_color: var(--box-color, var(--text-color-body));
    --_border: var(--box-border, var(--border));
    --_border-color: var(--box-border-color, var(--color-contrast-300));
    --_radius: var(--box-radius, var(--rounded-md));
    --_padding: var(--box-padding, var(--size-4));
    --_shadow: var(--box-shadow, var(--shadow-sm));
  }

  .box {
    background: var(--_bg);
    color: var(--_color);
    border-radius: var(--_radius);
    border: var(--_border) solid var(--_border-color);
    padding: var(--_padding);
    transition:
      backdrop-filter var(--transition-slow),
      box-shadow var(--transition-normal),
      background var(--transition-normal),
      border-color var(--transition-normal);
    will-change: box-shadow;
    position: relative;
    /* Make inner box fill host and respect its dimensions */
    width: 100%;
    height: 100%;
    box-sizing: border-box;
  }

  /* Variant-specific element styles */
  :host(:not([variant])) .box {
    --_border-color: var(--_theme-border);
  }

  /* Default with color gets subtle hover effect */
  :host(:not([variant])[color]:hover) .box {
    --_bg: color-mix(in srgb, var(--_theme-base) 16%, var(--color-contrast-50));
    --_border-color: var(--_theme-focus);
  }

  /* ========================================
     Rainbow Border Effect
     ======================================== */

  :host([rainbow]) .box {
    position: relative;
    border: var(--border-2) solid transparent;
    background: var(--_bg);
    /* Add overflow visible to ensure glow extends beyond */
    overflow: visible;
  }

  /* Rainbow border and glow layers */
  :host([rainbow]) .box::before,
  :host([rainbow]) .box::after {
    content: '';
    position: absolute;
    inset: calc(-1 * var(--border-2));
    border: inherit;
    border-radius: inherit;
    /* Reserve no-clip space for glow */
    box-shadow: 0 0 calc(3 * var(--blur-xl)) rgba(0 0 0 / 0.001);
    background: conic-gradient(
        from var(--rainbow-angle),
        #f94144,
        #f3722c,
        #f8961e,
        #f9844a,
        #f9c74f,
        #90be6d,
        #43aa8b,
        #4d908e,
        #277da1,
        #577590,
        #f94144
      )
      border-box;
    /* Make everything inside padding-box transparent
       by subtracting padding-box from no-clip box */
    -webkit-mask:
      conic-gradient(red 0 0) no-clip subtract,
      conic-gradient(red 0 0) padding-box;
    mask:
      conic-gradient(red 0 0) no-clip subtract,
      conic-gradient(red 0 0) padding-box;
    pointer-events: none;
    animation: rainbow-rotate 4s linear infinite;
  }

  /* Turn one pseudo layer into glow halo */
  :host([rainbow]) .box::after {
    filter: blur(var(--blur-xl));
  }

  @keyframes rainbow-rotate {
    to {
      --rainbow-angle: 1turn;
    }
  }

  /* Frost variant - Enhanced backdrop blur with transparency */
  /* Neutral: canvas-based frost effect */
  :host([variant='frost']:not([color])) .box {
    --_bg: color-mix(in srgb, var(--color-canvas) 55%, transparent);
    --_border-color: color-mix(in srgb, var(--_theme-border) 55%, transparent);
    --_color: color-mix(in srgb, var(--color-contrast) 90%, transparent);
    border: var(--border) solid var(--_border-color);
    backdrop-filter: blur(var(--blur-lg)) saturate(180%);
    -webkit-backdrop-filter: blur(var(--blur-lg)) saturate(180%);
    text-shadow: var(--text-shadow-xs);
    box-shadow: var(--_theme-halo);
  }

  /* Frost with color: premium frosted glass effect */
  :host([variant='frost'][color]) .box {
    --_bg: color-mix(in srgb, var(--_theme-base), transparent);
    --_border-color: color-mix(in srgb, var(--_theme-focus) 45%, transparent);
    --_color: var(--_theme-contrast);
    border: var(--border) solid var(--_border-color);
    backdrop-filter: blur(var(--blur-2xl)) saturate(220%) brightness(1.15);
    -webkit-backdrop-filter: blur(var(--blur-2xl)) saturate(220%) brightness(1.15);
    text-shadow: var(--text-shadow-xs);
    box-shadow: var(--_theme-halo);
  }
`;

// -------------------- Component --------------------
defineElement('bit-box', {
  styles: [boxBaseCss, styles],
  template: (el) => {
    const tagName = el.getAttribute('as') || 'div';
    return html`<${tagName} class="box" part="box"><slot></slot></${tagName}>`;
  },
});
