import { css, define, html } from '@vielzeug/craftit';

import type { ElevationLevel, PaddingSize, RoundedSize, ThemeColor } from '../../types';

import { frostVariantMixin, rainbowEffectMixin, surfaceMixins } from '../../styles';

const componentStyles = /* css */ css`
  @layer buildit.base {
    :host {
      --_bg: var(--box-bg, var(--color-canvas));
      --_color: var(--box-color, var(--color-contrast-900));
      --_border-width: var(--box-border, var(--border));
      --_border-color: var(--box-border-color, var(--color-contrast-300));
      --_radius: var(--box-radius, var(--rounded-md));
      --_padding: var(--box-padding, var(--size-4));
      --_shadow: var(--box-shadow, var(--shadow-sm));

      display: block;
      position: relative;
    }

    .box {
      background: var(--_bg);
      color: var(--_color);
      border-radius: var(--_radius);
      border: var(--_border-width) solid var(--_border-color);
      padding: var(--_padding);
      box-shadow: var(--_shadow);
      transition:
        backdrop-filter var(--transition-slow),
        box-shadow var(--transition-normal),
        background var(--transition-normal),
        border-color var(--transition-normal);
      will-change: box-shadow;
      position: relative;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
    }
  }

  @layer buildit.variants {
    /* Color theme integration — custom props still take priority */
    :host([color]) {
      --_bg: var(--box-bg, var(--_theme-backdrop));
      --_border-color: var(--box-border-color, var(--_theme-border));
    }

    /* Flat - border only, no shadow */
    :host([variant='flat']) {
      --_shadow: none;
    }

    /* Glass */
    :host([variant='glass']:not([color])) {
      --_bg: color-mix(in srgb, var(--color-secondary) 20%, transparent);
      --_border-color: color-mix(in srgb, var(--color-secondary-contrast) 15%, transparent);
    }

    :host([variant='glass'][color]) {
      --_bg: color-mix(in srgb, var(--_theme-base) 20%, transparent);
      --_border-color: color-mix(in srgb, var(--_theme-contrast) 15%, transparent);
      --_color: var(--_theme-base);
    }

    :host([variant='glass']) .box {
      backdrop-filter: blur(var(--blur-lg)) saturate(180%) brightness(1.05);
      -webkit-backdrop-filter: blur(var(--blur-lg)) saturate(180%) brightness(1.05);
      box-shadow: var(--shadow-md), var(--inset-shadow-xs);
    }

    /* Subtle hover for solid/default + color (glass & frost manage their own hover) */
    :host([color]:not([variant='glass']):not([variant='frost']):hover) {
      --_bg: color-mix(in srgb, var(--_theme-base) 16%, var(--color-contrast-50));
      --_border-color: var(--_theme-focus);
    }
  }

  @layer buildit.utilities {
    :host([fullwidth]) {
      width: 100%;
    }
  }
`;

/** Box component properties */
export interface BoxProps {
  /** Visual style variant */
  variant?: 'solid' | 'flat' | 'glass' | 'frost';
  /** Theme color */
  color?: ThemeColor;
  /** Internal padding size */
  padding?: PaddingSize;
  /** Shadow elevation level (0–5) */
  elevation?: `${ElevationLevel}`;
  /** Border radius size */
  rounded?: RoundedSize;
  /** Enable animated rainbow border effect */
  rainbow?: boolean;
  /** Full width mode (100% of container) */
  fullwidth?: boolean;
}

/**
 * bit-box — A foundational layout primitive with theming support.
 *
 * @element bit-box
 *
 * @attr {string} variant - Style variant: 'solid' | 'flat' | 'glass' | 'frost'
 * @attr {string} color - Color theme: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} padding - Padding size: 'none' | 'sm' | 'md' | 'lg' | 'xl'
 * @attr {string} elevation - Shadow elevation: '0' | '1' | '2' | '3' | '4' | '5'
 * @attr {string} rounded - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
 * @attr {boolean} rainbow - Enable animated rainbow border effect
 * @attr {boolean} fullwidth - Expand to full width
 *
 * @slot - Default slot for content
 *
 * @part box - The inner box element
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
 * ```html
 * <bit-box padding="lg" elevation="2">Simple content</bit-box>
 * <bit-box variant="glass" color="primary">Glass effect</bit-box>
 * <bit-box variant="frost" rainbow>Frosted glass</bit-box>
 * ```
 */
export const TAG = define('bit-box', () => ({
  styles: [...surfaceMixins, rainbowEffectMixin('.box'), frostVariantMixin('.box'), componentStyles],
  template: html`<div class="box" part="box"><slot></slot></div>`,
}));

declare global {
  interface HTMLElementTagNameMap {
    'bit-box': HTMLElement & BoxProps;
  }
}
