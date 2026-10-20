import { detectOverflow, getPlacementOverflow, hasOverflow, totalOverflow } from '../overflow';
import type { DetectOverflowOptions, Middleware, Placement } from '../types';
import { getAlignment, getSide, OPPOSITE, withPlacement } from '../utils';

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
  function flipMiddleware(state: Parameters<Middleware>[0]): ReturnType<Middleware> {
    const currentOverflow = detectOverflow(state, options);

    if (!hasOverflow(currentOverflow)) return;

    const side = getSide(state.placement);
    const align = getAlignment(state.placement);
    const fallbackPlacements = options.fallbackPlacements ?? [withPlacement(OPPOSITE[side], align)];
    const skipped: Placement[] = [state.placement];
    let bestPlacement = state.placement;
    // Score the current placement at base (un-offset) coordinates, like every candidate below,
    // not at its current post-middleware position. Mixing the two is what makes the choice
    // unstable: with an `offset()` upstream, the current side always looks `offset` px worse
    // than it does at base coords, so when *neither* side fits and their base overflows differ
    // by less than that margin, each pipeline restart prefers the other side and the reset
    // loop runs until `computePosition` throws. Base-scoring both sides makes the pick
    // idempotent: the same placement wins again on the next iteration and the loop settles
    // (with `shift` clamping whatever overflow remains).
    let bestScore = totalOverflow(getPlacementOverflow(state, state.placement, options));

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

  return flipMiddleware;
}
