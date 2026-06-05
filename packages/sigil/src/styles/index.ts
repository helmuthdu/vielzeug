/**
 * Shared Mixins & Effects
 *
 * Reusable CSS mixins for common component patterns.
 */

import { coarsePointerMixin, reducedMotionMixin } from './mixins/accessibility.css';
import { paddingMixin, roundedVariantMixin } from './mixins/shape.css';
import { disabledLoadingMixin } from './mixins/states.css';
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
// Table Base Mixin
export { tableBaseMixin } from './mixins/table-base.css';

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

/**
 * Base mixins shared by every text input component (input, textarea, file-input).
 * Covers theming, coarse-pointer targets, reduced-motion, border radius, and
 * disabled/loading states.
 *
 * Pass `sizeVariantMixin(YOUR_PRESET)` and `forcedColorsFocusMixin(selector)`
 * separately, as they accept component-specific arguments.
 *
 * @example
 * ```ts
 * styles: [...fieldMixins, sizeVariantMixin(FIELD_SIZE_PRESET), forcedColorsFocusMixin('input'), componentStyles]
 * ```
 */
export const fieldMixins = [
  colorThemeMixin,
  coarsePointerMixin,
  reducedMotionMixin,
  roundedVariantMixin,
  disabledLoadingMixin,
] as const;
