import type { DetectOverflowOptions, Middleware, Placement } from '../types';

import { getBoundaryRect, getAvailableSpace, getPlacementOverflow, totalOverflow } from '../core';
import { toSideObject } from '../utils';

export interface AutoPlacementOptions extends DetectOverflowOptions {
  /**
   * Placements to evaluate. Defaults to the four cardinal sides.
   * Note: use either `flip` or `autoPlacement`, not both.
   */
  allowedPlacements?: Placement[];
}

/**
 * Automatically selects the placement with the most available space and least overflow.
 * Evaluates all allowed placements and picks the optimal one.
 *
 * @see {@link flip} for simple opposite-side flipping.
 */
export function autoPlacement(options: AutoPlacementOptions = {}): Middleware {
  return (state) => {
    const padding = toSideObject(options.padding);
    const boundary = getBoundaryRect(options.boundary);
    const placements = options.allowedPlacements ?? (['top', 'right', 'bottom', 'left'] as Placement[]);

    if (import.meta.env.DEV && placements.length === 0) {
      console.warn('[orbit] autoPlacement: allowedPlacements is empty — no placement will be evaluated.');
    }

    let bestPlacement = state.placement;
    let bestOverflow = Number.POSITIVE_INFINITY;
    let bestSpace = Number.NEGATIVE_INFINITY;

    for (const candidate of placements) {
      const overflow = getPlacementOverflow(state, candidate, options);
      const overflowScore = totalOverflow(overflow);
      const availableSpace = getAvailableSpace(state, candidate, boundary, padding);

      if (overflowScore < bestOverflow || (overflowScore === bestOverflow && availableSpace > bestSpace)) {
        bestPlacement = candidate;
        bestOverflow = overflowScore;
        bestSpace = availableSpace;
      }
    }

    if (bestPlacement !== state.placement) {
      return { reset: { placement: bestPlacement } };
    }
  };
}
