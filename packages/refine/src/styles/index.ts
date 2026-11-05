/**
 * Shared Mixins & Effects
 *
 * Reusable CSS mixins for common component patterns.
 */

// Accessibility Mixins
export { SR_ONLY_INLINE_STYLE, srOnlyMixin, touchTargetMixin } from './mixins/accessibility.css';
// Effects
export {
  rainbowEffectMixin,
  registerRainbowProperty,
  registerShineProperty,
  shineEffectMixin,
} from './mixins/animation.css';
// Field Variant Mixin (solid/flat/bordered/outline/ghost, shared by text-entry fields)
export { type FieldVariantMixinOptions, fieldVariantMixin } from './mixins/field-variants.css';
// Overlay present/dismiss motion vocabulary (shared by every floating surface)
export { type OverlayMotionTier, overlayMotionMixin } from './mixins/overlay.css';
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
