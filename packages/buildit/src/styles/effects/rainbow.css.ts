import { css } from '@vielzeug/craftit';

/**
 * Register CSS custom property for rainbow animation
 * Auto-registered when rainbowEffectMixin is called
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
      rainbowRegistered = true;
    } catch {
      // Property might already be registered, ignore error
      rainbowRegistered = true;
    }
  }
}

/**
 * Rainbow Border Effect Mixin
 *
 * Animated rainbow border with glow effect.
 * Perfect for highlighting call-to-action elements or special features.
 *
 * Auto-registers the --rainbow-angle CSS property when first called.
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
  // Auto-register the CSS property
  registerRainbowProperty();

  return css`
    /* ========================================
       Rainbow Border Effect
       ======================================== */

    :host([rainbow]) ${selector} {
      position: relative;
      border: var(--border-2) solid transparent !important;
      overflow: visible;
    }

    /* Rainbow border and glow layers */
    :host([rainbow]) ${selector}::before, :host([rainbow]) ${selector}::after {
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
    :host([rainbow]) ${selector}::after {
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
  `;
};
