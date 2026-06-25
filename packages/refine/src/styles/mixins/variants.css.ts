import { css } from '@vielzeug/ore';

/**
 * Frost Variant Mixin
 *
 * Shared frost variant styles for components.
 * Provides consistent frosted glass effect with backdrop blur,
 * theme-aware colors, halo shadows, and elevation support.
 *
 * @param selector - CSS selector for the element (e.g., 'button', '.card', '.field')
 * @returns CSSResult with complete frost variant implementation
 *
 * @example
 * ```ts
 * import { frostVariantMixin } from '../../styles/mixins/frost.css';
 *
 * return {
 *   styles: [frostVariantMixin('button'), componentStyles],
 *   template: html`...`
 * };
 * ```
 */
export const frostVariantMixin = (selector: string) => css`
  :host([variant='frost']) ${selector} {
    backdrop-filter: blur(var(--blur-xl)) saturate(200%) brightness(1.1);
    -webkit-backdrop-filter: blur(var(--blur-xl)) saturate(200%) brightness(1.1);
  }

  :host([variant='frost']:not([color])) ${selector} {
    background: color-mix(in oklch, var(--color-canvas) 55%, transparent);
    color: var(--color-contrast);
    text-shadow: var(--text-shadow-xs);
    border: var(--border) solid color-mix(in oklch, var(--color-contrast-400) 45%, transparent);
  }

  /* Frost neutral without elevation: use halo shadow */
  :host([variant='frost']:not([color]):not([elevation])) ${selector} {
    box-shadow: var(--halo-shadow-neutral);
  }

  /* Frost neutral with elevation: combine halo with elevation shadow */
  :host([variant='frost']:not([color])[elevation]) ${selector} {
    box-shadow: var(--halo-shadow-neutral), var(--_shadow);
  }

  :host([variant='frost'][color]) ${selector} {
    background: color-mix(in oklch, var(--_theme-base), transparent);
    border-color: color-mix(in oklch, var(--_theme-border) 45%, transparent);
    color: var(--_theme-content);
    border: var(--border) solid color-mix(in oklch, var(--_theme-border) 45%, transparent);
    backdrop-filter: blur(var(--blur-2xl)) saturate(220%) brightness(1.15);
    -webkit-backdrop-filter: blur(var(--blur-2xl)) saturate(220%) brightness(1.15);
    text-shadow: var(--text-shadow-xs);
    filter: brightness(1.05);
  }

  /* Frost color without elevation: use halo shadow */
  :host([variant='frost'][color]:not([elevation])) ${selector} {
    box-shadow: var(--_theme-halo);
  }

  /* Frost color with elevation: combine halo with elevation shadow */
  :host([variant='frost'][color][elevation]) ${selector} {
    box-shadow: var(--_theme-halo), var(--_shadow);
  }

  :host([variant='frost']:not([color])) ${selector}:hover {
    backdrop-filter: blur(var(--blur-2xl)) saturate(220%) brightness(1.15);
    -webkit-backdrop-filter: blur(var(--blur-2xl)) saturate(220%) brightness(1.15);
  }

  :host([variant='frost'][color]) ${selector}:hover {
    backdrop-filter: blur(var(--blur-3xl)) saturate(240%) brightness(1.2);
    -webkit-backdrop-filter: blur(var(--blur-3xl)) saturate(240%) brightness(1.2);
  }
`;
