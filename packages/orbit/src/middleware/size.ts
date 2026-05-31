import type { DetectOverflowOptions, Middleware, SizeData } from '../types';

import { getBoundaryRect } from '../overflow';
import { getSide, tagMiddleware, toSideObject } from '../utils';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SizeOptions extends DetectOverflowOptions {}

/**
 * Reports the available space between the reference and boundary edges.
 *
 * Available dimensions are written to `middlewareData.size`.
 *
 * Read `result.middlewareData.size` in the `float()` `apply` callback to constrain
 * the floating element's dimensions.
 *
 * @example
 * ```ts
 * const cleanup = float(ref, el, {
 *   middleware: [offset(8), flip(), shift(), size()],
 *   apply(result) {
 *     el.style.maxHeight = `${result.middlewareData.size!.availableHeight}px`;
 *   },
 * });
 * ```
 */
export function size(options: SizeOptions = {}): Middleware {
  return tagMiddleware(function sizeMiddleware(state: Parameters<Middleware>[0]): ReturnType<Middleware> {
    const boundary = getBoundaryRect(options.boundary ?? state.boundary);
    const padding = toSideObject(options.padding ?? state.padding);
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

    const sizeData: SizeData = { availableHeight, availableWidth };

    return { data: { size: sizeData } };
  }, 'size');
}
