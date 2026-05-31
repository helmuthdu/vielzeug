import type { DetectOverflowOptions, Middleware, MiddlewareState } from '../types';

import { detectOverflow } from '../overflow';
import { clamp, getSide, tagMiddleware } from '../utils';

/**
 * A limiter function passed to `shift()` that constrains the maximum allowed drift.
 * Receives the current middleware state and the proposed shift correction (as deltas),
 * and returns the clamped correction.
 */
export type ShiftLimiter = (
  state: MiddlewareState,
  correction: { crossAxis: number; mainAxis: number },
) => { crossAxis: number; mainAxis: number };

export interface LimitShiftOptions {
  /**
   * Extra pixels of allowed drift past the reference's cross-axis extent before clamping kicks in.
   * Can be a static number or a function returning a number based on current state.
   * Default: `0`.
   */
  offset?: number | ((state: MiddlewareState) => number);
}

/**
 * Returns a {@link ShiftLimiter} that constrains `shift()` so the floating element
 * stays visually connected to the reference along the cross axis.
 *
 * Without a limiter, `shift()` will push the float as far as needed to fit in the boundary —
 * potentially sliding it far away from the reference. `limitShift` clamps the drift so the
 * float stays within the reference's cross-axis extent (± `offset` pixels).
 *
 * @example
 * ```ts
 * // Tooltip stays above the button even when viewport clips it.
 * shift({ padding: 6, limiter: limitShift() })
 *
 * // Allow up to 10px of drift beyond the reference's edges.
 * shift({ padding: 6, limiter: limitShift({ offset: 10 }) })
 * ```
 */
export function limitShift(options: LimitShiftOptions = {}): ShiftLimiter {
  return (state, correction) => {
    const { placement, rects, x, y } = state;
    const side = getSide(placement);
    const isVertical = side === 'top' || side === 'bottom';
    const extra = typeof options.offset === 'function' ? options.offset(state) : (options.offset ?? 0);

    if (isVertical) {
      // Cross axis is x. Clamp float.left to [ref.left-extra, ref.right+extra-float.width].
      const lo = rects.reference.x - extra;
      const hi = rects.reference.x + rects.reference.width + extra - rects.floating.width;
      const [min, max] = lo <= hi ? [lo, hi] : [hi, lo];
      const clamped = clamp(x + correction.crossAxis, min, max);

      return { ...correction, crossAxis: clamped - x };
    }

    // Cross axis is y. Clamp float.top to [ref.top-extra, ref.bottom+extra-float.height].
    const lo = rects.reference.y - extra;
    const hi = rects.reference.y + rects.reference.height + extra - rects.floating.height;
    const [min, max] = lo <= hi ? [lo, hi] : [hi, lo];
    const clamped = clamp(y + correction.crossAxis, min, max);

    return { ...correction, crossAxis: clamped - y };
  };
}

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
  /**
   * Constrains how far `shift()` can move the floating element along the cross axis.
   * Pass `limitShift()` to keep the float within the reference's extent.
   */
  limiter?: ShiftLimiter;
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
  const { crossAxis = true, limiter, mainAxis = false } = options;

  return tagMiddleware(function shiftMiddleware(state: Parameters<Middleware>[0]): ReturnType<Middleware> {
    const overflow = detectOverflow(state, options);
    const side = getSide(state.placement);
    const isVertical = side === 'top' || side === 'bottom';

    const xCorrection = Math.max(overflow.left, 0) - Math.max(overflow.right, 0);
    const yCorrection = Math.max(overflow.top, 0) - Math.max(overflow.bottom, 0);
    const applyX = isVertical ? crossAxis : mainAxis;
    const applyY = isVertical ? mainAxis : crossAxis;

    let dx = applyX ? xCorrection : 0;
    let dy = applyY ? yCorrection : 0;

    if (limiter) {
      const limited = limiter(state, {
        crossAxis: isVertical ? dx : dy,
        mainAxis: isVertical ? dy : dx,
      });

      dx = isVertical ? limited.crossAxis : limited.mainAxis;
      dy = isVertical ? limited.mainAxis : limited.crossAxis;
    }

    return { data: { shift: { x: dx, y: dy } }, x: state.x + dx, y: state.y + dy };
  }, 'shift');
}
