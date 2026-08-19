/**
 * Shared motion utility — every hand-rolled animation in this app (currently `animated-price`'s
 * price tween) needs the same reduced-motion guard. Centralized here instead of duplicated per
 * component so the check can't drift.
 */
export function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
