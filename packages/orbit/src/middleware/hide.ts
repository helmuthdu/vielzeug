import type { DetectOverflowOptions, HideData, Middleware } from '../types';

import { getBoundaryRect, getFloatingRect, detectOverflowAtRect, isFullyClipped } from '../core';
import { toSideObject } from '../utils';

export interface HideOptions extends DetectOverflowOptions {
  /**
   * Which hidden states to compute.
   * - `'referenceHidden'` — whether the reference itself is off-screen.
   * - `'escaped'` — whether the floating element has fully exited the boundary.
   * - `'both'` (default) — both of the above.
   */
  strategy?: 'referenceHidden' | 'escaped' | 'both';
}

/**
 * Detects when the reference or floating element is hidden outside the boundary.
 * Writes `{ referenceHidden, referenceHiddenOffsets, escaped, escapedOffsets }` to
 * `middlewareData.hide`.
 */
export function hide(options: HideOptions = {}): Middleware {
  const strategy = options.strategy ?? 'both';

  return (state) => {
    const boundary = getBoundaryRect(options.boundary);
    const padding = toSideObject(options.padding);
    const next: HideData = {};

    if (strategy === 'escaped' || strategy === 'both') {
      const floatingRect = getFloatingRect(state);
      const escapedOffsets = detectOverflowAtRect(floatingRect, boundary, padding);

      next.escaped = isFullyClipped(floatingRect, escapedOffsets);
      next.escapedOffsets = escapedOffsets;
    }

    if (strategy === 'referenceHidden' || strategy === 'both') {
      const referenceHiddenOffsets = detectOverflowAtRect(state.rects.reference, boundary, padding);

      next.referenceHidden = isFullyClipped(state.rects.reference, referenceHiddenOffsets);
      next.referenceHiddenOffsets = referenceHiddenOffsets;
    }

    return { data: { hide: next } };
  };
}
