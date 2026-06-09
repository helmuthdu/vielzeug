import type { ArrowData, Middleware, Padding, TypedMiddleware } from '../types';

import { clamp, getSide, tagMiddleware, toRect, toSideObject } from '../utils';

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
 * Must come **after** flip(), shift(), and autoPlacement() in the middleware pipeline.
 *
 * @example
 * ```ts
 * const result = computePosition(ref, floating, {
 *   middleware: [offset(8), flip(), shift(), arrow({ element: arrowEl })],
 * });
 * const { x, y } = result.middlewareData.arrow!;
 * arrowEl.style.left = x != null ? `${x}px` : '';
 * arrowEl.style.top  = y != null ? `${y}px` : '';
 * ```
 */
export function arrow({ element, padding = 0 }: ArrowOptions): TypedMiddleware<'arrow', ArrowData> {
  function arrowMiddleware(state: Parameters<Middleware>[0]): ReturnType<Middleware> {
    const side = getSide(state.placement);
    const inset = toSideObject(padding);
    const arrowRect = toRect(element.getBoundingClientRect());

    if (side === 'top' || side === 'bottom') {
      const idealX = state.rects.reference.x + state.rects.reference.width / 2 - state.x - arrowRect.width / 2;
      const minX = inset.left;
      const maxX = Math.max(minX, state.rects.floating.width - arrowRect.width - inset.right);
      const x = clamp(idealX, minX, maxX);

      return { data: { arrow: { centerOffset: idealX - x, constrained: x !== idealX, x } } };
    }

    const idealY = state.rects.reference.y + state.rects.reference.height / 2 - state.y - arrowRect.height / 2;
    const minY = inset.top;
    const maxY = Math.max(minY, state.rects.floating.height - arrowRect.height - inset.bottom);
    const y = clamp(idealY, minY, maxY);

    return { data: { arrow: { centerOffset: idealY - y, constrained: y !== idealY, y } } };
  }

  return tagMiddleware<'arrow', ArrowData, typeof arrowMiddleware>(arrowMiddleware, 'arrow');
}
