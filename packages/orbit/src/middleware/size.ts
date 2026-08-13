import { resolveBoundary } from '../overflow';
import type { DetectOverflowOptions, Middleware } from '../types';
import { getSide } from '../utils';

export type SizeOptions = DetectOverflowOptions;

/**
 * Reports the available space between the reference and boundary edges.
 *
 * Available dimensions are written to `middlewareData.size`.
 *
 * Read `result.middlewareData.size` in the positioner `apply` option or after `computePosition()`
 * to constrain the floating element's dimensions.
 *
 * @example
 * ```ts
 * const positioner = createPositioner(ref, el, {
 *   middleware: [offset(8), flip(), shift(), size()],
 *   apply(result) {
 *     el.style.maxHeight = `${(result.middlewareData.size as SizeData).availableHeight}px`;
 *   },
 * });
 * positioner.start();
 * ```
 */
export function size(options: SizeOptions = {}): Middleware {
  function sizeMiddleware(state: Parameters<Middleware>[0]): ReturnType<Middleware> {
    const { boundary, padding } = resolveBoundary(options, state);
    const side = getSide(state.placement);
    const top = boundary.y + padding.top;
    const right = boundary.x + boundary.width - padding.right;
    const bottom = boundary.y + boundary.height - padding.bottom;
    const left = boundary.x + padding.left;

    const availableHeight =
      side === 'bottom'
        ? Math.max(0, bottom - state.y)
        : side === 'top'
          ? Math.max(0, state.rects.reference.y - top)
          : Math.max(0, bottom - top);

    const availableWidth =
      side === 'right'
        ? Math.max(0, right - state.x)
        : side === 'left'
          ? Math.max(0, state.rects.reference.x - left)
          : Math.max(0, right - left);

    return { data: { size: { availableHeight, availableWidth } } };
  }

  return sizeMiddleware;
}
