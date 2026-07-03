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
export { coarsePointerMixin, reducedMotionMixin, SR_ONLY_INLINE_STYLE, srOnlyMixin } from './mixins/accessibility.css';
// Effects
export {
  rainbowEffectMixin,
  registerRainbowProperty,
  registerShineProperty,
  shineEffectMixin,
} from './mixins/animation.css';
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
 * **Required additions** (component-specific arguments, so not included here):
 * - `sizeVariantMixin(YOUR_PRESET)` — supply the component's size config.
 * - `forcedColorsFocusMixin(selector)` — **mandatory** for WCAG forced-colors
 *   compliance. Pass the CSS selector for the component's focusable inner
 *   element (e.g. `'input'`, `'textarea'`, `'.dropzone'`). Omitting this
 *   removes the focus ring in Windows High Contrast mode.
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
