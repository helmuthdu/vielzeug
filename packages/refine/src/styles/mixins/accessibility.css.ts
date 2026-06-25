import { css } from '@vielzeug/ore';

/**
 * Coarse Pointer Mixin
 *
 * Under `@media (pointer: coarse)`, promotes the full component one size tier
 * so padding, gap, font-size, height, and icon-size all grow proportionally
 * with the WCAG 44 px touch target — not just the minimum height in isolation:
 *
 * - default / `size="md"` → lg-scale tokens + `--_touch-target: var(--size-11)`
 * - `size="sm"` → md-scale tokens + `--_touch-target: var(--size-11)`
 * - `size="lg"` → touch target only (already at max scale)
 *
 * Interactive elements inside the component that need a guaranteed tap target
 * should still reference `--_touch-target`:
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
    /* Default / md size: promote all scale tokens one tier up (md → lg) */
    :host,
    :host([size='md']) {
      --_touch-target: var(--size-11);
      --_font-size: var(--text-base);
      --_gap: var(--size-2-5);
      --_height: var(--size-12);
      --_size: var(--size-6);
      --_icon-size: var(--size-6);
      --_padding: var(--size-2-5) var(--size-5);
    }

    /* sm size: promote to md scale */
    :host([size='sm']) {
      --_touch-target: var(--size-11);
      --_font-size: var(--text-sm);
      --_gap: var(--size-2);
      --_height: var(--size-10);
      --_size: var(--size-5);
      --_icon-size: var(--size-5);
      --_padding: var(--size-2) var(--size-4);
    }

    /* lg size: already max, just enforce touch target */
    :host([size='lg']) {
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
