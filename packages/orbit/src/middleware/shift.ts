import type { DetectOverflowOptions, Middleware } from '../types';

import { detectOverflow } from '../core';
import { getSide } from '../utils';

export interface ShiftOptions extends DetectOverflowOptions {
  /**
   * Whether to shift along the main axis (the axis away from the reference).
   * Default: `false` — main-axis overflow is better handled by `flip`.
   */
  mainAxis?: boolean;
  /**
   * Whether to shift along the cross axis (perpendicular to the reference direction).
   * Default: `true`.
   */
  crossAxis?: boolean;
}

/**
 * Shifts the floating element along the cross axis to keep it inside the boundary.
 *
 * By default only the cross axis is corrected. Enable `mainAxis` to also shift
 * along the main axis (useful when `flip` is not in the pipeline).
 *
 * | Placement        | Cross axis | Main axis |
 * |------------------|------------|-----------|
 * | `top` / `bottom` | horizontal | vertical  |
 * | `left` / `right` | vertical   | horizontal|
 */
export function shift(options: ShiftOptions = {}): Middleware {
  const { crossAxis = true, mainAxis = false } = options;

  return (state) => {
    const overflow = detectOverflow(state, options);
    const side = getSide(state.placement);
    const isVertical = side === 'top' || side === 'bottom';

    const xCorrection = Math.max(overflow.left, 0) - Math.max(overflow.right, 0);
    const yCorrection = Math.max(overflow.top, 0) - Math.max(overflow.bottom, 0);
    const applyX = isVertical ? crossAxis : mainAxis;
    const applyY = isVertical ? mainAxis : crossAxis;
    const dx = applyX ? xCorrection : 0;
    const dy = applyY ? yCorrection : 0;

    if (dx === 0 && dy === 0) return;

    return { x: state.x + dx, y: state.y + dy };
  };
}
