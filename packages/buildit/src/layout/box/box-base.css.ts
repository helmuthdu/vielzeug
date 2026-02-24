import { css } from '@vielzeug/craftit';

/**
 * Shared Box Theming Styles
 *
 * This CSS module provides the foundational theming system used by Box
 * and other components that build on top of it (like Card).
 *
 * Includes:
 * - Color themes (primary, secondary, info, success, warning, error)
 * - Default fallback uses neutral color
 * - Variants (solid, flat, glass, frost)
 * - Elevation levels (0-5)
 */

export const boxBaseCss = css`
  /* ========================================
     Color Themes (Default: Neutral)
     ======================================== */

  :host {
    /* Default to neutral when no color is specified */
    --_theme-base: var(--color-neutral);
    --_theme-content: var(--color-neutral-content);
    --_theme-contrast: var(--color-neutral-contrast);
    --_theme-focus: var(--color-neutral-focus);
    --_theme-backdrop: var(--color-neutral-backdrop);
    --_theme-border: var(--color-neutral-border);
    --_theme-shadow: var(--color-neutral-focus-shadow);
    --_theme-halo: var(--halo-shadow-neutral);
  }

  :host([color='primary']) {
    --_theme-base: var(--color-primary);
    --_theme-content: var(--color-primary-content);
    --_theme-contrast: var(--color-primary-contrast);
    --_theme-focus: var(--color-primary-focus);
    --_theme-backdrop: var(--color-primary-backdrop);
    --_theme-border: var(--color-primary-border);
    --_theme-shadow: var(--color-primary-focus-shadow);
    --_theme-halo: var(--halo-shadow-primary);
  }

  :host([color='secondary']) {
    --_theme-base: var(--color-secondary);
    --_theme-content: var(--color-secondary-content);
    --_theme-contrast: var(--color-secondary-contrast);
    --_theme-focus: var(--color-secondary-focus);
    --_theme-backdrop: var(--color-secondary-backdrop);
    --_theme-border: var(--color-secondary-border);
    --_theme-shadow: var(--color-secondary-focus-shadow);
    --_theme-halo: var(--halo-shadow-secondary);
  }

  :host([color='info']) {
    --_theme-base: var(--color-info);
    --_theme-content: var(--color-info-content);
    --_theme-contrast: var(--color-info-contrast);
    --_theme-focus: var(--color-info-focus);
    --_theme-backdrop: var(--color-info-backdrop);
    --_theme-border: var(--color-info-border);
    --_theme-shadow: var(--color-info-focus-shadow);
    --_theme-halo: var(--halo-shadow-info);
  }

  :host([color='success']) {
    --_theme-base: var(--color-success);
    --_theme-content: var(--color-success-content);
    --_theme-contrast: var(--color-success-contrast);
    --_theme-focus: var(--color-success-focus);
    --_theme-backdrop: var(--color-success-backdrop);
    --_theme-border: var(--color-success-border);
    --_theme-shadow: var(--color-success-focus-shadow);
    --_theme-halo: var(--halo-shadow-success);
  }

  :host([color='warning']) {
    --_theme-base: var(--color-warning);
    --_theme-content: var(--color-warning-content);
    --_theme-contrast: var(--color-warning-contrast);
    --_theme-focus: var(--color-warning-focus);
    --_theme-backdrop: var(--color-warning-backdrop);
    --_theme-border: var(--color-warning-border);
    --_theme-shadow: var(--color-warning-focus-shadow);
    --_theme-halo: var(--halo-shadow-warning);
  }

  :host([color='error']) {
    --_theme-base: var(--color-error);
    --_theme-content: var(--color-error-content);
    --_theme-contrast: var(--color-error-contrast);
    --_theme-focus: var(--color-error-focus);
    --_theme-backdrop: var(--color-error-backdrop);
    --_theme-border: var(--color-error-border);
    --_theme-shadow: var(--color-error-focus-shadow);
    --_theme-halo: var(--halo-shadow-error);
  }

  /* ========================================
     Elevation Levels
     ======================================== */

  :host([elevation='0']) {
    --_shadow: none;
  }

  :host([elevation='1']) {
    --_shadow: var(--shadow-sm);
  }

  :host([elevation='2']) {
    --_shadow: var(--shadow-md);
  }

  :host([elevation='3']) {
    --_shadow: var(--shadow-lg);
  }

  :host([elevation='4']) {
    --_shadow: var(--shadow-xl);
  }

  :host([elevation='5']) {
    --_shadow: var(--shadow-2xl);
  }

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

  /* ========================================
     Padding Variants
     ======================================== */

  :host([padding='none']) {
    --_padding: var(--size-0);
  }

  :host([padding='sm']) {
    --_padding: var(--size-3);
  }

  :host([padding='md']) {
    --_padding: var(--size-4);
  }

  :host([padding='lg']) {
    --_padding: var(--size-6);
  }

  :host([padding='xl']) {
    --_padding: var(--size-8);
  }

  /* ========================================
     Rounded Variants
     ======================================== */

  :host([rounded='none']) {
    --_radius: var(--rounded-none);
  }

  :host([rounded='sm']) {
    --_radius: var(--rounded-sm);
  }

  :host([rounded='md']) {
    --_radius: var(--rounded-md);
  }

  :host([rounded='lg']) {
    --_radius: var(--rounded-lg);
  }

  :host([rounded='xl']) {
    --_radius: var(--rounded-xl);
  }

  :host([rounded='2xl']) {
    --_radius: var(--rounded-2xl);
  }

  :host([rounded='3xl']) {
    --_radius: var(--rounded-3xl);
  }

  :host([rounded='full']) {
    --_radius: var(--rounded-full);
  }
`;

