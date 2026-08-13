/**
 * Shared Mixins & Effects
 *
 * Reusable CSS mixins for common component patterns.
 */

// Accessibility Mixins
export { coarsePointerMixin, reducedMotionMixin, SR_ONLY_INLINE_STYLE, srOnlyMixin } from './mixins/accessibility.css';
// Effects
export {
  rainbowEffectMixin,
  registerRainbowProperty,
  registerShineProperty,
  shineEffectMixin,
} from './mixins/animation.css';
// Field Variant Mixin (solid/flat/bordered/outline/ghost, shared by text-entry fields)
export { type FieldVariantMixinOptions, fieldVariantMixin } from './mixins/field-variants.css';
// Shape Mixins (padding, rounded, size)
export { paddingMixin, roundedVariantMixin, sizeVariantMixin } from './mixins/shape.css';
// State Mixins
export { disabledLoadingMixin, disabledStateMixin, loadingStateMixin } from './mixins/states.css';
// Table Base Mixin
export { tableBaseMixin } from './mixins/table-base.css';
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
