import { define, html, prop } from '@vielzeug/ore';
import {
  colorThemeMixin,
  elevationMixin,
  frostVariantMixin,
  paddingMixin,
  rainbowEffectMixin,
  roundedVariantMixin,
} from '../../styles';
import {
  ELEVATION_LEVELS,
  type ElevationLevel,
  PADDING_SIZES,
  type PaddingSize,
  ROUNDED_SIZES,
  type RoundedSize,
  THEME_COLORS,
  type ThemeColor,
} from '../../types';
import componentStyles from './box.css?inline';

const BOX_EFFECTS = ['rainbow'] as const;
const BOX_VARIANTS = ['flat', 'solid', 'frost'] as const;

/** Box component properties */
export type OreBoxProps = {
  /** Theme color */
  color?: ThemeColor;
  /** Animated border effect */
  effect?: (typeof BOX_EFFECTS)[number];
  /** Shadow elevation level (0–5) */
  elevation?: ElevationLevel;
  /** Full width mode (100% of container) */
  fullwidth?: boolean;
  /** Internal padding size */
  padding?: PaddingSize;
  /** Border radius size */
  rounded?: RoundedSize;
  /** Visual style variant */
  variant?: (typeof BOX_VARIANTS)[number];
};

/**
 * ore-box: A foundational layout primitive with theming support.
 *
 * @element ore-box
 *
 * @attr {string} variant - Style variant: 'solid' | 'flat' | 'frost'
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
 * <ore-box variant="solid" color="primary">Solid color</ore-box>
 * <ore-box variant="frost" effect="rainbow">Frosted glass</ore-box>
 * ```
 */
export const BOX_TAG = 'ore-box' as const;
define<OreBoxProps>(BOX_TAG, {
  props: {
    color: prop.oneOf(THEME_COLORS),
    effect: prop.oneOf(BOX_EFFECTS),
    elevation: prop.oneOf(ELEVATION_LEVELS),
    fullwidth: prop.bool(),
    padding: prop.oneOf(PADDING_SIZES),
    rounded: prop.oneOf(ROUNDED_SIZES),
    variant: prop.oneOf(BOX_VARIANTS),
  },
  setup() {
    return html`
      <div class="box" part="box"><slot></slot></div>
    `;
  },

  styles: [
    colorThemeMixin,
    elevationMixin,
    paddingMixin,
    roundedVariantMixin,
    frostVariantMixin('.box'),
    rainbowEffectMixin('.box'),
    componentStyles,
  ],
});
