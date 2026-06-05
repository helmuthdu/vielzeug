import { define, html, prop } from '@vielzeug/craft';

import type { ElevationLevel, PaddingSize, RoundedSize, ThemeColor } from '../../types';

import { frostVariantMixin, rainbowEffectMixin, surfaceMixins } from '../../styles';
import componentStyles from './box.css?inline';

/** Box component properties */
export type SgBoxProps = {
  /** Theme color */
  color?: ThemeColor;
  /** Shadow elevation level (0–5) */
  elevation?: ElevationLevel;
  /** Full width mode (100% of container) */
  fullwidth?: boolean;
  /** Internal padding size */
  padding?: PaddingSize;
  /** Enable animated rainbow border effect */
  rainbow?: boolean;
  /** Border radius size */
  rounded?: RoundedSize;
  /** Visual style variant */
  variant?: 'solid' | 'flat' | 'glass' | 'frost';
};

/**
 * sg-box — A foundational layout primitive with theming support.
 *
 * @element sg-box
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
 * <sg-box padding="lg" elevation="2">Simple content</sg-box>
 * <sg-box variant="glass" color="primary">Glass effect</sg-box>
 * <sg-box variant="frost" rainbow>Frosted glass</sg-box>
 * ```
 */
export const BOX_TAG = 'sg-box' as const;
define<SgBoxProps>(BOX_TAG, {
  props: {
    color: prop.string<ThemeColor>(),
    elevation: prop.number<ElevationLevel>(),
    fullwidth: prop.bool(),
    padding: prop.string<PaddingSize>(),
    rainbow: prop.bool(),
    rounded: prop.string<RoundedSize>(),
    variant: prop.string<'flat' | 'solid' | 'frost' | 'glass'>(),
  },
  setup() {
    return html`<div class="box" part="box"><slot></slot></div>`;
  },

  styles: [...surfaceMixins, rainbowEffectMixin('.box'), frostVariantMixin('.box'), componentStyles],
});
