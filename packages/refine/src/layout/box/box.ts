import { define, html, prop } from '@vielzeug/ore';

import type { ElevationLevel, PaddingSize, RoundedSize, ThemeColor } from '../../types';

import { frostVariantMixin, rainbowEffectMixin, surfaceMixins } from '../../styles';
import componentStyles from './box.css?inline';

/** Box component properties */
export type OreBoxProps = {
  /** Theme color */
  color?: ThemeColor;
  /** Animated border effect */
  effect?: 'rainbow';
  /** Shadow elevation level (0–5) */
  elevation?: ElevationLevel;
  /** Full width mode (100% of container) */
  fullwidth?: boolean;
  /** Internal padding size */
  padding?: PaddingSize;
  /** Border radius size */
  rounded?: RoundedSize;
  /** Visual style variant */
  variant?: 'solid' | 'flat' | 'glass' | 'frost';
};

/**
 * ore-box — A foundational layout primitive with theming support.
 *
 * @element ore-box
 *
 * @attr {string} variant - Style variant: 'solid' | 'flat' | 'glass' | 'frost'
 * @attr {string} color - Color theme: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} padding - Padding size: 'none' | 'sm' | 'md' | 'lg' | 'xl'
 * @attr {string} elevation - Shadow elevation: '0' | '1' | '2' | '3' | '4' | '5'
 * @attr {string} rounded - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
 * @attr {string} effect - Animated border effect: 'rainbow'
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
 * <ore-box padding="lg" elevation="2">Simple content</ore-box>
 * <ore-box variant="glass" color="primary">Glass effect</ore-box>
 * <ore-box variant="frost" effect="rainbow">Frosted glass</ore-box>
 * ```
 */
export const BOX_TAG = 'ore-box' as const;
define<OreBoxProps>(BOX_TAG, {
  props: {
    color: prop.string<ThemeColor>(),
    effect: prop.string<'rainbow'>(),
    elevation: prop.number<ElevationLevel>(),
    fullwidth: prop.bool(),
    padding: prop.string<PaddingSize>(),
    rounded: prop.string<RoundedSize>(),
    variant: prop.string<'flat' | 'solid' | 'frost' | 'glass'>(),
  },
  setup() {
    return html`<div class="box" part="box"><slot></slot></div>`;
  },

  styles: [...surfaceMixins, frostVariantMixin('.box'), rainbowEffectMixin('.box'), componentStyles],
});
