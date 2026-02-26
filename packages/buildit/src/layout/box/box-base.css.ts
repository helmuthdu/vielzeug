import { css } from '@vielzeug/craftit';
import {
  colorThemeMixin,
  elevationMixin,
  paddingMixin,
  roundedVariantMixin
} from '../../styles';

/**
 * Shared Box Theming Styles
 *
 * This CSS module provides the foundational theming system used by Box
 * and other components that build on top of it (like Card).
 *
 * Now uses shared mixins for better code reuse and consistency.
 *
 * Includes:
 * - Color themes (primary, secondary, info, success, warning, error) - via colorThemeMixin
 * - Elevation levels (0-5) - via elevationMixin
 * - Padding variants (none, sm, md, lg, xl) - via paddingMixin
 * - Rounded variants (none, sm, md, lg, xl, 2xl, 3xl, full) - via roundedVariantMixin
 * - Variant styles (default, frost)
 */

export const boxBaseCss = css`
  ${colorThemeMixin()}
  ${elevationMixin()}
  ${paddingMixin()}
  ${roundedVariantMixin()}

  /* ========================================
     Variant Styles
     ======================================== */

  /* Default: Subtle background with gentle border */
  :host(:not([variant])) {
    --_bg: var(--_theme-backdrop);
    --_border-color: var(--_theme-border);
  }

  /* Frost - Translucent effect with backdrop blur */
  /* Neutral: canvas-based frost effect */
  :host([variant='frost']:not([color])) {
    --_bg: color-mix(in srgb, var(--color-canvas) 55%, transparent);
    --_border-color: color-mix(in srgb, var(--color-canvas) 55%, transparent);
  }

  /* Frost with color: frosted glass effect */
  :host([variant='frost'][color]) {
    --_bg: color-mix(in srgb, var(--_theme-base) 70%, var(--color-contrast) 10%);
    --_border-color: color-mix(in srgb, var(--_theme-focus) 60%, transparent);
    --_color: color-mix(in srgb, var(--color-contrast) 90%, transparent);
  }
`;

