import { css } from '@vielzeug/ore';

/**
 * Visually-Hidden ("sr-only") Style
 *
 * Single source of truth for the standard visually-hidden-but-accessible
 * clipping technique: hides content visually while keeping it in the
 * accessibility tree (screen readers, `aria-live` regions).
 *
 * Two forms are exported from the same declarations so component stylesheets
 * and JS-created DOM elements never drift out of sync:
 * - `srOnlyMixin`: a `.sr-only` class for component `styles: [...]` arrays.
 * - `SR_ONLY_INLINE_STYLE`: the equivalent `cssText` string for elements
 *   created outside any component's shadow root (e.g. a live region appended
 *   directly to `document.body`).
 *
 * @example
 * ```ts
 * // Component stylesheet
 * import { srOnlyMixin } from '../../styles';
 * return { styles: [srOnlyMixin, componentStyles], template: html`<span class="sr-only">...</span>` };
 *
 * // JS-created element outside a shadow root
 * import { SR_ONLY_INLINE_STYLE } from '../../styles';
 * el.style.cssText = SR_ONLY_INLINE_STYLE;
 * ```
 */
export const SR_ONLY_INLINE_STYLE =
  'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;' +
  'white-space:nowrap;border-width:0;clip-path:inset(50%);';

export const srOnlyMixin = css`
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    white-space: nowrap;
    border-width: 0;
    clip-path: inset(50%);
  }
`;

/**
 * Touch Target Mixin
 *
 * Two responsibilities, one mixin:
 *
 * 1. **Guarantees the 44 px target on every pointer.** `--_touch-target` is set
 *    unconditionally on `:host`, so a component's `min-height: var(--_touch-target)`
 *    always resolves. It used to live inside `@media (pointer: coarse)`, which meant
 *    the documented "≥ 44×44" contract (docs/refine/accessibility.md) silently failed
 *    on a mouse: on a fine pointer the property was undefined, the `min-height`
 *    declaration was dropped at computed-value time, and the smaller declared desktop
 *    size won (dialog close 32 px, pagination 36 px, button md 40 px).
 * 2. **Promotes the whole component one size tier under a coarse pointer** so padding,
 *    gap, font-size, height, and icon-size grow *with* the target, not just its
 *    minimum height in isolation:
 *    - default / `size="md"` → lg-scale tokens
 *    - `size="sm"` → md-scale tokens
 *    - `size="lg"` → nothing (already at max scale)
 *
 * The target is the same 44 px on both pointers, so the coarse block no longer
 * re-declares it. Interactive elements inside the component reference it directly:
 *
 * ```css
 * .close { min-height: var(--_touch-target); min-width: var(--_touch-target); }
 * ```
 *
 * @example
 * ```ts
 * import { touchTargetMixin } from '../../styles';
 *
 * return {
 *   styles: [touchTargetMixin, componentStyles],
 *   template: html`...`
 * };
 * ```
 */
export const touchTargetMixin = css`
  :host {
    --_touch-target: var(--size-11);
  }

  @media (pointer: coarse) {
    /* Default / md size: promote all scale tokens one tier up (md → lg) */
    :host,
    :host([size='md']) {
      --_font-size: var(--text-base);
      --_gap: var(--size-2-5);
      --_height: var(--size-12);
      --_size: var(--size-6);
      --_icon-size: var(--size-6);
      --_padding: var(--size-2-5) var(--size-5);
    }

    /* sm size: promote to md scale */
    :host([size='sm']) {
      --_font-size: var(--text-sm);
      --_gap: var(--size-2);
      --_height: var(--size-10);
      --_size: var(--size-5);
      --_icon-size: var(--size-5);
      --_padding: var(--size-2) var(--size-4);
    }
  }
`;

/* Reduced motion is NOT a mixin: it is a `:root` declaration in theme.css
   (the "Reduced Motion" block), which inherits through shadow boundaries,
   so it reaches every component without per-component opt-in, and it honors
   the three-state motion mode (`setMotionMode()` / `data-motion`) that a
   media-query-only mixin could never express. Component CSS keeps opting in
   per declaration with the escape-hatch fallbacks:
   `transition: var(--_motion-transition, ...)` /
   `animation: var(--_motion-animation, ...)`. */
