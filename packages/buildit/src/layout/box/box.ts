import { css, defineElement, html } from '@vielzeug/craftit';
import { colorThemeMixin, frostVariantMixin, rainbowEffectMixin, registerRainbowProperty } from '../../styles';
import type { ElevationLevel, PaddingSize, RoundedSize, ThemeColor } from '../../types';

// Register CSS property for rainbow animation
registerRainbowProperty();

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
  /* Color themes - mixin already defines @layer buildit.themes */
  ${colorThemeMixin()}

  @layer buildit.base {
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
      box-shadow: var(--_shadow);
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
  }

  @layer buildit.variants {
    /* Variant-specific element styles */
    :host(:not([variant])) {
      --_bg: var(--_theme-backdrop);
      --_border-color: var(--_theme-border);
    }

    /* Frost - Translucent effect with backdrop blur */
    :host([variant='frost']:not([color])) {
      --_bg: color-mix(in srgb, var(--color-canvas) 55%, transparent);
      --_border-color: color-mix(in srgb, var(--color-canvas) 55%, transparent);
    }

    :host([variant='frost'][color]) {
      --_bg: color-mix(in srgb, var(--_theme-base) 70%, var(--color-contrast) 10%);
      --_border-color: color-mix(in srgb, var(--_theme-focus) 60%, transparent);
      --_color: color-mix(in srgb, var(--color-contrast) 90%, transparent);
    }

    /* Default with color gets subtle hover effect */
    :host(:not([variant])[color]:hover) .box {
      --_bg: color-mix(in srgb, var(--_theme-base) 16%, var(--color-contrast-50));
      --_border-color: var(--_theme-focus);
    }
  }

  ${rainbowEffectMixin('.box')}

  ${frostVariantMixin('.box')}
  
  /* Elevation, Padding & Rounded - IN buildit.utilities layer for proper cascade */
  @layer buildit.utilities {
    :host([elevation='0']) {
      --_shadow: none;
    }
    :host([elevation='1']) {
      --_shadow: var(--shadow-sm);
    }
    :host([elevation='2']) {
      --_shadow: var(--shadow-md);
    }
    :host([elevation='3']) {
      --_shadow: var(--shadow-lg);
    }
    :host([elevation='4']) {
      --_shadow: var(--shadow-xl);
    }
    :host([elevation='5']) {
      --_shadow: var(--shadow-2xl);
    }
    
    :host([padding='none']) {
      --_padding: var(--size-0);
    }
    :host([padding='sm']) {
      --_padding: var(--size-3);
    }
    :host([padding='md']) {
      --_padding: var(--size-4);
    }
    :host([padding='lg']) {
      --_padding: var(--size-6);
    }
    :host([padding='xl']) {
      --_padding: var(--size-8);
    }
    
    :host([rounded='none']) {
      --_radius: var(--rounded-none);
    }
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
    :host([rounded='full']), :host([rounded='']) {
      --_radius: var(--rounded-full);
    }
  }
`;

/**
 * Box Component Properties
 *
 * A foundational layout primitive with theming, elevation, and special effects support.
 *
 * ## Slots
 * - **default**: Box content
 *
 * ## CSS Custom Properties
 * - `--box-bg`: Background color
 * - `--box-color`: Text color
 * - `--box-border`: Border width
 * - `--box-border-color`: Border color
 * - `--box-radius`: Border radius
 * - `--box-padding`: Internal padding
 * - `--box-shadow`: Box shadow
 *
 * ## Special Features
 * - **Frost variant**: Glassmorphism effect with backdrop blur
 * - **Rainbow effect**: Animated rainbow border (when `rainbow` attribute is set)
 * - **Elevation**: Shadow depth control (0-5)
 * - **Custom element**: Render as any HTML element via `as` attribute
 *
 * @example
 * ```html
 * <!-- Basic box -->
 * <bit-box padding="lg" elevation="2">
 *   Simple content box
 * </bit-box>
 *
 * <!-- Colored box -->
 * <bit-box color="primary" padding="md" rounded="lg">
 *   Primary colored box
 * </bit-box>
 *
 * <!-- Frost effect -->
 * <bit-box variant="frost" elevation="3" padding="xl">
 *   Glassmorphism box
 * </bit-box>
 *
 * <!-- Frost with color -->
 * <bit-box variant="frost" color="secondary" padding="lg">
 *   Colored frosted glass
 * </bit-box>
 *
 * <!-- Rainbow effect -->
 * <bit-box variant="frost" rainbow padding="md">
 *   Animated rainbow border
 * </bit-box>
 *
 * <!-- Custom element -->
 * <bit-box as="section" padding="lg" elevation="1">
 *   Rendered as section element
 * </bit-box>
 * ```
 */
export interface BoxProps {
  /** Visual style variant */
  variant?: 'frost';
  /** Theme color */
  color?: ThemeColor;
  /** Internal padding size */
  padding?: PaddingSize;
  /** Shadow elevation level (0-5) */
  elevation?: `${ElevationLevel}`;
  /** Border radius size */
  rounded?: RoundedSize;
  /** Enable animated rainbow border effect */
  rainbow?: boolean;
  /** Semantic HTML element to render as */
  as?: string;
}

// -------------------- Component --------------------
defineElement<HTMLElement, BoxProps>('bit-box', {
  observedAttributes: ['variant', 'color', 'padding', 'elevation', 'rounded', 'rainbow', 'as'] as const,

  styles: [styles],
  template: (el) => {
    const tagName = el.getAttribute('as') || 'div';
    return html`<${tagName} class="box" part="box"><slot></slot></${tagName}>`;
  },
});
