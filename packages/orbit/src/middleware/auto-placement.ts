import type { Alignment, DetectOverflowOptions, Middleware, Placement, Side } from '../types';

import { warn } from '../_warn';
import { getAvailableSpace, getBoundaryRect, getPlacementOverflow, totalOverflow } from '../overflow';
import { tagMiddleware, toSideObject } from '../utils';

export interface AutoPlacementOptions extends DetectOverflowOptions {
  /**
   * Placements to evaluate. When provided, takes precedence over `alignment`.
   * Note: use either `flip` or `autoPlacement`, not both.
   */
  allowedPlacements?: Placement[];
  /**
   * Constrains auto-placement to variants with the given alignment.
   *
   * - `'start'` — evaluates only `top-start`, `right-start`, `bottom-start`, `left-start`.
   * - `'end'` — evaluates only `top-end`, `right-end`, `bottom-end`, `left-end`.
   * - `null` — evaluates all 12 variants (4 cardinal + 4 start + 4 end).
   * - omitted (default) — evaluates the 4 cardinal sides only.
   */
  alignment?: Alignment | null;
}

const SIDES: Side[] = ['top', 'right', 'bottom', 'left'];

function getDefaultPlacements(alignment?: Alignment | null): Placement[] {
  if (alignment === undefined) return SIDES;

  if (alignment === null) {
    return SIDES.flatMap((side) => [side, `${side}-start`, `${side}-end`] as Placement[]);
  }

  return SIDES.map((side) => `${side}-${alignment}` as Placement);
}

/**
 * Automatically selects the placement with the most available space and least overflow.
 * Evaluates all allowed placements and picks the optimal one.
 *
 * Use the `alignment` option to restrict evaluation to aligned variants (e.g. `'start'`)
 * when you want to preserve a consistent alignment across all candidate sides.
 *
 * @see {@link flip} for simple opposite-side flipping.
 */
export function autoPlacement(options: AutoPlacementOptions = {}): Middleware {
  return tagMiddleware(function autoPlacementMiddleware(state: Parameters<Middleware>[0]): ReturnType<Middleware> {
    const padding = toSideObject(options.padding ?? state.padding);
    const boundary = getBoundaryRect(options.boundary ?? state.boundary);
    const placements = options.allowedPlacements ?? getDefaultPlacements(options.alignment);

    if (import.meta.env.DEV && placements.length === 0) {
      warn('autoPlacement: allowedPlacements is empty — no placement will be evaluated.');
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
  }, 'autoPlacement');
}
