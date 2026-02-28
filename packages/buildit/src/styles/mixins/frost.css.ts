/**
 * Frost Variant Mixin
 *
 * Shared frost variant styles for components.
 * Provides consistent frosted glass effect with backdrop blur,
 * theme-aware colors, halo shadows, and elevation support.
 *
 * @param selector - CSS selector for the element (e.g., 'button', '.card', '.field')
 * @returns CSS string with complete frost variant implementation
 *
 * @example
 * ```ts
 * import { frostVariantMixin } from '../../styles/mixins/frost.css';
 *
 * const styles = css`
 *   // ...other styles...
 *   ${frostVariantMixin('button')}
 * `;
 * ```
 */
export const frostVariantMixin = (selector: string) => `
  @layer buildit.variants {
  :host([variant='frost']) ${selector} {
    backdrop-filter: blur(var(--blur-xl)) saturate(200%) brightness(1.1);
    -webkit-backdrop-filter: blur(var(--blur-xl)) saturate(200%) brightness(1.1);
  }

  :host([variant='frost']:not([color])) ${selector} {
    background: color-mix(in srgb, var(--color-canvas) 55%, transparent);
    border-color: color-mix(in srgb, var(--color-contrast-400) 45%, transparent);
    color: var(--color-contrast);
    text-shadow: var(--text-shadow-xs);
    border: var(--border) solid var(--_border-color);
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
    background: color-mix(in srgb, var(--_theme-base), transparent);
    border-color: color-mix(in srgb, var(--_theme-focus) 45%, transparent);
    color: var(--_theme-content);
    border: var(--border) solid var(--_border-color);
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

  /* ========================================
     Halo Shadows per Theme Color
     ======================================== */

  :host([variant='frost'][color='primary']) ${selector} {
    box-shadow: var(--halo-shadow-primary);
  }

  :host([variant='frost'][color='secondary']) ${selector} {
    box-shadow: var(--halo-shadow-secondary);
  }

  :host([variant='frost'][color='info']) ${selector} {
    box-shadow: var(--halo-shadow-info);
  }

  :host([variant='frost'][color='success']) ${selector} {
    box-shadow: var(--halo-shadow-success);
  }

  :host([variant='frost'][color='warning']) ${selector} {
    box-shadow: var(--halo-shadow-warning);
  }

  :host([variant='frost'][color='error']) ${selector} {
    box-shadow: var(--halo-shadow-error);
  }
`;
