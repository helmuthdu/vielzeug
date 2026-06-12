import type { DetectOverflowOptions, FlipData, Middleware, Placement, TypedMiddleware } from '../types';

import { detectOverflow, getPlacementOverflow, hasOverflow, totalOverflow } from '../overflow';
import { getAlignment, getSide, OPPOSITE, tagMiddleware, withPlacement } from '../utils';

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
export function flip(options: FlipOptions = {}): TypedMiddleware<'flip', FlipData> {
  function flipMiddleware(state: Parameters<Middleware>[0]): ReturnType<Middleware> {
    const currentOverflow = detectOverflow(state, options);

    if (!hasOverflow(currentOverflow)) return;

    const side = getSide(state.placement);
    const align = getAlignment(state.placement);
    const fallbackPlacements = options.fallbackPlacements ?? [withPlacement(OPPOSITE[side], align)];
    const skipped: Placement[] = [state.placement];
    let bestPlacement = state.placement;
    let bestScore = totalOverflow(currentOverflow);

    for (const candidate of fallbackPlacements) {
      const candidateOverflow = getPlacementOverflow(state, candidate, options);
      const score = totalOverflow(candidateOverflow);

      if (!hasOverflow(candidateOverflow)) {
        return {
          data: { flip: { skippedPlacements: skipped } },
          reset: { placement: candidate },
        };
      }

      skipped.push(candidate);

      if (score < bestScore) {
        bestPlacement = candidate;
        bestScore = score;
      }
    }

    if (bestPlacement !== state.placement) {
      return {
        data: { flip: { skippedPlacements: skipped } },
        reset: { placement: bestPlacement },
      };
    }
  }

  return tagMiddleware<'flip', FlipData, typeof flipMiddleware>(flipMiddleware, 'flip');
}
