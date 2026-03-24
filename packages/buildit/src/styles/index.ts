/**
 * Shared Mixins & Effects
 *
 * Reusable CSS mixins for common component patterns.
 */

import { coarsePointerMixin, reducedMotionMixin } from './mixins/accessibility.css';
import { paddingMixin, roundedVariantMixin } from './mixins/shape.css';
import { disabledStateMixin } from './mixins/states.css';
import { colorThemeMixin, elevationMixin, forcedColorsFormControlMixin } from './mixins/theme.css';

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
 * Base mixins for text-field-style form inputs (input, select, combobox).
 * Covers theming, coarse pointer, reduced motion, and border radius.
 * Still add `sizeVariantMixin({...})`, `disabledLoadingMixin()`, and
 * `forcedColorsFocusMixin(selector)` separately.
 *
 * @example
 * ```ts
 * styles: [...formFieldMixins, sizeVariantMixin({...}), disabledLoadingMixin(), forcedColorsFocusMixin('input'), componentStyles]
 * ```
 */
export const formFieldMixins = [colorThemeMixin, coarsePointerMixin, reducedMotionMixin, roundedVariantMixin] as const;

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
 * Base mixins for custom form controls (checkbox, radio, switch).
 * Covers theming, forced-colors visibility, and disabled state.
 * Still add `coarsePointerMixin` (for touch targets) and `sizeVariantMixin({...})` separately.
 *
 * @example
 * ```ts
 * // checkbox / radio (with touch target):
 * styles: [...formControlMixins, coarsePointerMixin, sizeVariantMixin({...}), componentStyles]
 * // switch (no touch target override needed):
 * styles: [...formControlMixins, sizeVariantMixin({...}), componentStyles]
 * ```
 */
export const formControlMixins = [colorThemeMixin, forcedColorsFormControlMixin, disabledStateMixin()] as const;
