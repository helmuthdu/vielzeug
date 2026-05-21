import { css } from '@vielzeug/craftit';

// ── Color Theme ───────────────────────────────────────────────────────────────

const THEME_COLORS = ['primary', 'secondary', 'info', 'success', 'warning', 'error'] as const;

type ThemeColorName = (typeof THEME_COLORS)[number];

// Standard token suffix for each --_theme-* variable. The 'shadow' slot maps
// to --color-*-focus-shadow (not --color-*-shadow) and 'halo' maps to --halo-shadow-*.
const TOKEN_SUFFIX: Record<string, (color: ThemeColorName) => string> = {
  backdrop: (c) => `var(--color-${c}-backdrop)`,
  base: (c) => `var(--color-${c})`,
  border: (c) => `var(--color-${c}-border)`,
  content: (c) => `var(--color-${c}-content)`,
  contrast: (c) => `var(--color-${c}-contrast)`,
  focus: (c) => `var(--color-${c}-focus)`,
  halo: (c) => `var(--halo-shadow-${c})`,
  shadow: (c) => `var(--color-${c}-focus-shadow)`,
};

const colorBlock = (color: ThemeColorName): string =>
  `:host([color='${color}']) {\n${Object.entries(TOKEN_SUFFIX)
    .map(([slot, fn]) => `  --_theme-${slot}: ${fn(color)};`)
    .join('\n')}\n}`;

export const colorThemeMixin = css`
  :host {
    --_theme-base: var(--color-neutral);
    --_theme-content: var(--color-neutral-content);
    --_theme-contrast: var(--color-neutral-contrast);
    --_theme-focus: var(--color-neutral-focus);
    --_theme-backdrop: var(--color-neutral-backdrop);
    --_theme-border: var(--color-neutral-border);
    --_theme-shadow: var(--color-neutral-focus-shadow);
    --_theme-halo: var(--halo-shadow-neutral);
  }

  ${THEME_COLORS.map(colorBlock).join('\n\n  ')}
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
