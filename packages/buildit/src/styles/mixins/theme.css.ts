import { css } from '@vielzeug/craftit/core';

// ── Color Theme ───────────────────────────────────────────────────────────────

/**
 * Color Theme Mixin
 *
 * Provides theme color CSS custom properties for components.
 * Sets up --_theme-* variables that map to semantic color tokens.
 *
 * @example
 * ```ts
 * import { colorThemeMixin } from '../../styles';
 *
 * return {
 *   styles: [colorThemeMixin, componentStyles],
 *   template: html`...`
 * };
 * ```
 */
export const colorThemeMixin = css`
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

// ── Elevation ─────────────────────────────────────────────────────────────────

/**
 * Elevation Mixin
 *
 * Provides elevation shadow levels (0-5) via CSS custom properties.
 * Sets the --_shadow variable based on elevation attribute.
 *
 * @example
 * ```ts
 * import { elevationMixin } from '../../styles';
 *
 * return {
 *   styles: [elevationMixin, componentStyles],
 *   template: html`...`
 * };
 * ```
 */
export const elevationMixin = css`
  /* ========================================
     Elevation Levels (0-5)
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
`;

// ── Forced Colors ─────────────────────────────────────────────────────────────

/**
 * Forced Colors Mixin
 *
 * Ensures components are visually distinct in Windows High Contrast / forced-colors mode.
 * The browser already overrides `color`, `background-color`, and `border-color` to system
 * color keywords, but components that rely solely on `background` for visual identity
 * (no border) or that use `box-shadow` for focus rings need explicit fallbacks.
 *
 * Usage: apply to any component that has a background but no natural border.
 *
 * @example
 * ```ts
 * import { forcedColorsMixin } from '../../styles';
 *
 * return {
 *   styles: [forcedColorsMixin, componentStyles],
 *   template: html`...`
 * };
 * ```
 */
export const forcedColorsMixin = css`
  @media (forced-colors: active) {
    :host {
      border: 1px solid ButtonText;
    }
  }
`;

/**
 * Forced Colors Focus Ring Mixin
 *
 * Replaces box-shadow focus rings (which are removed in forced-colors mode)
 * with a proper system-color outline.
 *
 * @param selector - CSS selector for the focusable element inside the host
 *
 * @example
 * ```ts
 * import { forcedColorsFocusMixin } from '../../styles';
 *
 * return {
 *   styles: [forcedColorsFocusMixin('button'), componentStyles],
 *   template: html`...`
 * };
 * ```
 */
export const forcedColorsFocusMixin = (selector: string) => css`
  @media (forced-colors: active) {
    ${selector}:focus-visible {
      outline: 2px solid Highlight;
      outline-offset: 2px;
      box-shadow: none;
    }
  }
`;

/**
 * Forced Colors Form Control Mixin
 *
 * For custom form controls (checkbox, radio, switch, slider) that paint their
 * own visual state. Maps checked/active state to system colors so they remain
 * distinguishable in forced-colors mode.
 *
 * @example
 * ```ts
 * import { forcedColorsFormControlMixin } from '../../styles';
 *
 * return {
 *   styles: [forcedColorsFormControlMixin, componentStyles],
 *   template: html`...`
 * };
 * ```
 */
export const forcedColorsFormControlMixin = css`
  @media (forced-colors: active) {
    :host {
      forced-color-adjust: none;
      color: ButtonText;
      background: ButtonFace;
      border: 1px solid ButtonText;
    }

    :host([checked]) {
      background: Highlight;
      color: HighlightText;
      border-color: Highlight;
    }

    :host([disabled]) {
      color: GrayText;
      border-color: GrayText;
    }
  }
`;
