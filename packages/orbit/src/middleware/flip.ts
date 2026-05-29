import type { DetectOverflowOptions, Middleware, Placement } from '../types';

import { detectOverflow, getPlacementOverflow, hasOverflow, totalOverflow } from '../core';
import { OPPOSITE, getAlignment, getSide, withPlacement } from '../utils';

export interface FlipOptions extends DetectOverflowOptions {
  /**
   * Ordered list of candidate placements to try when the floating element overflows.
   * Defaults to the opposite side, preserving the current alignment.
   */
  fallbackPlacements?: Placement[];
}

/**
 * Flips the floating element to the opposite side when it overflows the boundary.
 * Falls back to the candidate with the least total overflow when no candidate fits.
 */
export function flip(options: FlipOptions = {}): Middleware {
  return (state) => {
    const currentOverflow = detectOverflow(state, options);

    if (!hasOverflow(currentOverflow)) return;

    const side = getSide(state.placement);
    const align = getAlignment(state.placement);
    const fallbackPlacements = options.fallbackPlacements ?? [withPlacement(OPPOSITE[side], align)];
    let bestPlacement = state.placement;
    let bestScore = totalOverflow(currentOverflow);

    for (const candidate of fallbackPlacements) {
      const candidateOverflow = getPlacementOverflow(state, candidate, options);
      const score = totalOverflow(candidateOverflow);

      if (!hasOverflow(candidateOverflow)) {
        return { reset: { placement: candidate } };
      }

      if (score < bestScore) {
        bestPlacement = candidate;
        bestScore = score;
      }
    }

    if (bestPlacement !== state.placement) {
      return { reset: { placement: bestPlacement } };
    }
  };
}
