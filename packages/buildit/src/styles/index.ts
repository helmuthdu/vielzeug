/**
 * Shared Mixins & Effects
 *
 * Reusable CSS mixins for common component patterns.
 */

import { paddingMixin, roundedVariantMixin } from './mixins/shape.css';
import { colorThemeMixin, elevationMixin } from './mixins/theme.css';

// Accessibility Mixins
export { coarsePointerMixin, reducedMotionMixin } from './mixins/accessibility.css';
// Effects
export { rainbowEffectMixin, registerRainbowProperty } from './mixins/animation.css';
// Shape Mixins (padding, rounded, size)
export { paddingMixin, roundedVariantMixin, sizeVariantMixin } from './mixins/shape.css';
// State Mixins
export { disabledLoadingMixin, disabledStateMixin, loadingStateMixin } from './mixins/states.css';
// Theme Mixins (color, elevation, forced-colors)
export {
  colorThemeMixin,
  elevationMixin,
  forcedColorsFocusMixin,
  forcedColorsFormControlMixin,
  forcedColorsMixin,
} from './mixins/theme.css';
// Frost Mixin
export { frostVariantMixin } from './mixins/variants.css';

// ── Preset Arrays ─────────────────────────────────────────────────────────────

/**
 * Base mixins for elevated surface components (box, card).
 * Covers theming, elevation shadows, padding, and border radius.
 *
 * @example
 * ```ts
 * styles: [...surfaceMixins, frostVariantMixin('.box'), componentStyles]
 * ```
 */
export const surfaceMixins = [colorThemeMixin, elevationMixin, paddingMixin, roundedVariantMixin] as const;
