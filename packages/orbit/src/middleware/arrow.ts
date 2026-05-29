import type { Middleware, Padding } from '../types';

import { getSide, toRect, toSideObject, clamp } from '../utils';

export interface ArrowOptions {
  /** The arrow DOM element. Must be a child of the floating element. */
  element: HTMLElement;
  /** Padding to keep the arrow from the floating element's corners. */
  padding?: Padding;
}

/**
 * Positions an arrow element inside the floating element, pointed toward the reference.
 * Writes `{ x?, y?, centerOffset }` to `middlewareData.arrow`.
 *
 * @example
 * ```ts
 * const result = computePosition(ref, floating, {
 *   middleware: [arrow({ element: arrowEl, padding: 8 })],
 * });
 * const { x, y } = result.middlewareData.arrow!;
 * arrowEl.style.left = x != null ? `${x}px` : '';
 * arrowEl.style.top  = y != null ? `${y}px` : '';
 * ```
 */
export function arrow({ element, padding = 0 }: ArrowOptions): Middleware {
  return (state) => {
    const side = getSide(state.placement);
    const inset = toSideObject(padding);
    const arrowRect = toRect(element.getBoundingClientRect());

    if (side === 'top' || side === 'bottom') {
      const idealX = state.rects.reference.x + state.rects.reference.width / 2 - state.x - arrowRect.width / 2;
      const minX = inset.left;
      const maxX = Math.max(minX, state.rects.floating.width - arrowRect.width - inset.right);
      const x = clamp(idealX, minX, maxX);

      return { data: { arrow: { centerOffset: idealX - x, x } } };
    }

    const idealY = state.rects.reference.y + state.rects.reference.height / 2 - state.y - arrowRect.height / 2;
    const minY = inset.top;
    const maxY = Math.max(minY, state.rects.floating.height - arrowRect.height - inset.bottom);
    const y = clamp(idealY, minY, maxY);

    return { data: { arrow: { centerOffset: idealY - y, y } } };
  };
}
