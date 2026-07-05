import { css } from '@vielzeug/ore';

/**
 * Register the --rainbow-angle CSS custom property so browsers can
 * interpolate it inside conic-gradient().
 * Called automatically by rainbowEffectMixin on first use.
 */
let rainbowRegistered = false;

export function registerRainbowProperty() {
  if (rainbowRegistered) return;

  if (typeof CSS !== 'undefined' && CSS.registerProperty) {
    try {
      CSS.registerProperty({
        inherits: false,
        initialValue: '0deg',
        name: '--rainbow-angle',
        syntax: '<angle>',
      });
    } catch {
      // Already registered — safe to ignore
    }
  }

  rainbowRegistered = true;
}

/**
 * Register the --shine-angle CSS custom property so browsers can
 * interpolate it inside conic-gradient().
 * Called automatically by shineEffectMixin on first use.
 */
let shineRegistered = false;

export function registerShineProperty() {
  if (shineRegistered) return;

  if (typeof CSS !== 'undefined' && CSS.registerProperty) {
    try {
      CSS.registerProperty({
        inherits: false,
        initialValue: '0deg',
        name: '--shine-angle',
        syntax: '<angle>',
      });
    } catch {
      // Already registered — safe to ignore
    }
  }

  shineRegistered = true;
}

/**
 * Rainbow Border Effect Mixin
 *
 * Animated rainbow border with glow effect.
 * Perfect for highlighting call-to-action elements or special features.
 *
 * @param selector - CSS selector for the element (e.g., 'button', '.box')
 * @returns CSSResult with rainbow border animation
 *
 * @example
 * ```ts
 * import { rainbowEffectMixin } from '../../styles/effects/rainbow.css';
 *
 * return {
 *   styles: [rainbowEffectMixin('button'), componentStyles],
 *   template: html`...`
 * };
 * ```
 */
export const rainbowEffectMixin = (selector: string) => {
  registerRainbowProperty();

  return css`
    /* ========================================
       Rainbow Border Effect
       ======================================== */

    :host([effect='rainbow']) ${selector} {
      position: relative;
      border: var(--border-2) solid transparent !important;
      overflow: visible;
    }

    /* Rainbow border and glow layers */
    :host([effect='rainbow']) ${selector}::before, :host([effect='rainbow']) ${selector}::after {
      content: '';
      position: absolute;
      inset: calc(-1 * var(--border-2));
      border: inherit;
      border-radius: inherit;

      /* Reserve no-clip space for glow */
      box-shadow: 0 0 calc(3 * var(--blur-xl)) rgba(0 0 0 / 0.001);

      /* Rainbow gradient — Okabe-Ito colorblind-safe palette */
      background: conic-gradient(
          from var(--rainbow-angle),
          #56b4e9,
          /* Sky Blue       */ #0072b2,
          /* Deep Blue      */ #009e73,
          /* Bluish Green   */ #f0e442,
          /* Yellow         */ #e69f00,
          /* Orange         */ #d55e00,
          /* Vermillion     */ #cc79a7,
          /* Reddish Purple */ #56b4e9 /* Back to Sky Blue */
        )
        border-box;

      /* Make everything inside padding-box transparent
       by subtracting padding-box from no-clip box */
      -webkit-mask:
        conic-gradient(red 0 0) no-clip subtract,
        conic-gradient(red 0 0) padding-box;
      mask:
        conic-gradient(red 0 0) no-clip subtract,
        conic-gradient(red 0 0) padding-box;

      pointer-events: none;
      animation: rainbow-rotate 4s linear infinite;
    }

    /* Turn one pseudo layer into glow halo */
    :host([effect='rainbow']) ${selector}::after {
      filter: blur(var(--blur-xl));
    }

    /* ========================================
       Animation
       ======================================== */

    @keyframes rainbow-rotate {
      to {
        --rainbow-angle: 1turn;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      :host([effect='rainbow']) ${selector}::before, :host([effect='rainbow']) ${selector}::after {
        animation: none;
      }
    }
  `;
};

/**
 * Shine Border Effect Mixin
 *
 * Animated color-aware border shine. A tight arc of the component's own
 * theme color rotates around the border, producing the glossy "shimmer"
 * look seen in modern card and button designs.
 *
 * Respects the `color` attribute via `--_theme-*` tokens — no extra
 * configuration needed. Falls back to the neutral theme when no color
 * is set.
 *
 * @param selector - CSS selector for the inner element (e.g., 'button', '.box')
 * @returns CSSResult with shine border animation
 *
 * @example
 * ```ts
 * styles: [shineEffectMixin('button'), componentStyles]
 * ```
 */
export const shineEffectMixin = (selector: string) => {
  registerShineProperty();

  return css`
    /* ========================================
       Shine Border Effect
       ======================================== */

    :host([effect='shine']) ${selector} {
      position: relative;
      overflow: visible;
      --_shine-color: light-dark(
        oklch(from var(--_theme-focus) 0.6 calc(c * 1.2) h),
        oklch(from var(--_theme-focus) 0.85 calc(c * 1.2) h)
      );
    }

    /* Shine border — single pseudo, glow via box-shadow (follows border-radius, no artifacts) */
    :host([effect='shine']) ${selector}::before {
      content: '';
      position: absolute;
      inset: calc(-1 * var(--border-2));
      border: var(--border-2) solid transparent;
      border-radius: calc(var(--_radius, 0px) + var(--border-2));

      /* Two comet tails 180deg apart, same shape rotating together */
      background:
        conic-gradient(from var(--shine-angle), transparent 0%, transparent 75%, var(--_shine-color) 100%) border-box,
        conic-gradient(
            from calc(var(--shine-angle) + 180deg),
            transparent 0%,
            transparent 75%,
            var(--_shine-color) 100%
          )
          border-box;

      -webkit-mask:
        conic-gradient(red 0 0) no-clip subtract,
        conic-gradient(red 0 0) padding-box;
      mask:
        conic-gradient(red 0 0) no-clip subtract,
        conic-gradient(red 0 0) padding-box;

      /* Use the theme's own focus-shadow — color-aware, well-tuned, no artifacts */
      box-shadow: var(--_theme-shadow);

      pointer-events: none;
      animation: shine-rotate 2.5s linear infinite;
    }

    /* ========================================
       Animation
       ======================================== */

    @keyframes shine-rotate {
      to {
        --shine-angle: 1turn;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      :host([effect='shine']) ${selector}::before {
        animation: none;
      }
    }
  `;
};
