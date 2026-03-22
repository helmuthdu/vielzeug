import { css } from '@vielzeug/craftit';

/**
 * Coarse Pointer Mixin
 *
 * Defines `--_touch-target: var(--size-11)` on `:host` under `@media (pointer: coarse)`
 * to expose the WCAG minimum tap-target token across the shadow DOM.
 * Interactive elements inside the component should reference it:
 *
 * ```css
 * .close { min-height: var(--_touch-target); min-width: var(--_touch-target); }
 * ```
 *
 * @example
 * ```ts
 * import { coarsePointerMixin } from '../../styles';
 *
 * return {
 *   styles: [coarsePointerMixin, componentStyles],
 *   template: html`...`
 * };
 * ```
 */
export const coarsePointerMixin = css`
  @media (pointer: coarse) {
    :host {
      --_touch-target: var(--size-11);
    }
  }
`;

/**
 * Reduced Motion Mixin
 *
 * Defines `--_motion-transition: none` and `--_motion-animation: none` on
 * `:host` under `@media (prefers-reduced-motion: reduce)`.
 * Component CSS opts in via CSS variable fallbacks:
 *
 * ```css
 * .panel { transition: var(--_motion-transition, opacity 300ms ease); }
 * .loader { animation: var(--_motion-animation, spin 0.6s linear infinite); }
 * ```
 *
 * @example
 * ```ts
 * import { reducedMotionMixin } from '../../styles';
 *
 * return {
 *   styles: [reducedMotionMixin, componentStyles],
 *   template: html`...`
 * };
 * ```
 */
export const reducedMotionMixin = css`
  @media (prefers-reduced-motion: reduce) {
    :host {
      --_motion-transition: none;
      --_motion-animation: none;
    }
  }
`;
