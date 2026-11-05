import { css } from '@vielzeug/ore';

/**
 * How much surface is moving, which is what decides the timing:
 * - `menu`: a small anchored action list that tracks the pointer and must feel immediate.
 * - `dropdown`: an anchored form-control panel (select, combobox, date/time picker, query bar).
 * - `panel`: a large anchored surface (popover, navigation menu).
 */
export type OverlayMotionTier = 'dropdown' | 'menu' | 'panel';

/**
 * Shared present/dismiss motion vocabulary for overlays.
 *
 * Every floating surface in refine has to solve the same three problems, and until now each one
 * re-solved them by hand in its own stylesheet — the same four-member `transition` list, copied a
 * dozen times with the durations drifting apart:
 *
 * 1. **The top-layer hold.** A surface that enters or leaves the top layer (`popover`, `<dialog>`)
 *    must keep `display` and `overlay` transitioning with `allow-discrete`. Without it the element
 *    is torn out of the top layer the moment its exit begins and drops behind the page content
 *    mid-fade, so the dismiss is never seen.
 * 2. **The `none` trap.** A `none` where a `<time>` belongs invalidates the *whole* `transition`
 *    shorthand, silently taking the hold down with it. `--transition-fast` and friends resolve to
 *    `none` under reduced motion, so they must never appear in a list that carries `allow-discrete`.
 *    `--duration-*` tokens zero to `0ms` instead, which stays a valid member: the hold survives and
 *    the motion simply becomes instant, which is the point. `dialog.css` and
 *    `navigation-menu-panel.css` each carry a comment about hitting this in production.
 * 3. **Asymmetric timing.** Presenting and dismissing are different gestures: a surface arrives
 *    deliberately and should leave the instant it is dismissed. One duration for both makes either
 *    the arrival sluggish or the departure linger.
 *
 * This mixin owns all three once and delivers them as two private custom properties, so a component
 * keeps control of *where* the motion is applied (its panel, its host, its `::backdrop`) while the
 * vocabulary lives in one place:
 *
 * ```css
 * .panel {
 *   transition: var(--_overlay-dismiss);
 * }
 * .panel[data-open] {
 *   transition: var(--_overlay-present);
 * }
 * ```
 *
 * Reduced motion is honored through the `--duration-*` tokens (they zero to `0ms`), so these lists
 * deliberately do NOT wrap in the `--_motion-transition` hatch: that hatch resolves to `none`, and
 * a `none` in front of an `allow-discrete` list is exactly the trap in point 2. A zeroed duration
 * gives the same instant result while keeping the hold syntactically valid.
 *
 * Displacement is also deliberately absent: it is already tokenized as `--overlay-enter-translate-y`
 * / `-y-up` / `-scale`, and each surface knows its own anchor edge and composes its own closed-state
 * `transform`. This mixin supplies timing and easing only.
 *
 * A third property, `--_overlay-hold`, carries only the `display`/`overlay` pair with no
 * opacity/transform members. Modal surfaces (`<dialog>` + `showModal()`) animate opacity and
 * transform on a child panel and on `::backdrop`, so the dialog element itself needs the hold and
 * nothing else; giving it the full list would add members that never change.
 *
 * @example
 * ```ts
 * import { overlayMotionMixin } from '../../styles';
 *
 * return {
 *   styles: [overlayMotionMixin('dropdown'), componentStyles],
 * };
 * ```
 */
const TIER_TIMING: Record<OverlayMotionTier, { dismiss: string; present: string }> = {
  dropdown: { dismiss: 'var(--duration-150)', present: 'var(--duration-200)' },
  // A menu tracks the pointer: anything slower reads as lag between the click and the flyout.
  menu: { dismiss: 'var(--duration-100)', present: 'var(--duration-150)' },
  panel: { dismiss: 'var(--duration-200)', present: 'var(--duration-250)' },
};

export const overlayMotionMixin = (tier: OverlayMotionTier = 'dropdown') => {
  const { dismiss, present } = TIER_TIMING[tier];

  return css`
    :host {
      --_overlay-dismiss: opacity ${dismiss} var(--ease-in-out), transform ${dismiss} var(--ease-in-out),
        display ${dismiss} allow-discrete, overlay ${dismiss} allow-discrete;
      --_overlay-present: opacity ${present} var(--ease-in-out), transform ${present} var(--ease-spring),
        display ${present} allow-discrete, overlay ${present} allow-discrete;
      --_overlay-hold: display ${dismiss} allow-discrete, overlay ${dismiss} allow-discrete;
    }
  `;
};
