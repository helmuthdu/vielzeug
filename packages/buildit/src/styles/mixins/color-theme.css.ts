import { css } from '@vielzeug/craftit';

/**
 * Color Theme Mixin
 *
 * Provides theme color CSS custom properties for components.
 * Sets up --_theme-* variables that map to semantic color tokens.
 *
 * This replaces the boxBaseCss approach with a reusable mixin pattern.
 *
 * @returns CSS string with color theme definitions
 *
 * @example
 * ```typescript
 * import { colorThemeMixin } from '../../styles';
 *
 * const styles = css`
 *   ${colorThemeMixin()}
 *
 *   .my-element {
 *     background: var(--_theme-base);
 *     color: var(--_theme-content);
 *   }
 * `;
 * ```
 */
export const colorThemeMixin = () => css`
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
`;

