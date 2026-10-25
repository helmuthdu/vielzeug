import { shouldReduceMotion } from '@vielzeug/necromancer';

import { getMotionMode } from '../motion';

/**
 * Point-in-time check for the two components whose JavaScript *starts* motion
 * (the rating's sparkle burst, the drawer's swipe-close snap) and therefore
 * cannot rely on the CSS layer alone: a spawned animation with a zeroed
 * duration still runs its lifecycle (and its DOM nodes still accumulate), and
 * an inline `style.transition` set from a gesture bypasses every token.
 *
 * Everything else reduces through CSS: `--duration-*`/`--transition-*` zero out
 * and the `--_motion-*` hatches switch declarations off at `:root`, which is
 * also why components must never write their own
 * `@media (prefers-reduced-motion)` block - it would ignore `data-motion='full'`.
 *
 * Delegates the three-state resolution to necromancer's `shouldReduceMotion`,
 * the same rule `theme.css` implements in CSS.
 */
export function motionReduced(): boolean {
  return shouldReduceMotion(getMotionMode());
}
