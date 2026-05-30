import type { DetectOverflowOptions, Middleware, ReferenceElement, SizeData } from '../types';

import { getBoundaryRect } from '../overflow';
import { getSide, tagMiddleware, toSideObject } from '../utils';

export interface SizeApplyArgs extends SizeData {
  elements: { floating: HTMLElement; reference: ReferenceElement };
}

export interface SizeOptions extends DetectOverflowOptions {
  /**
   * Optional callback to mutate the floating element based on available space.
   *
   * @deprecated Read `result.middlewareData.size` directly and apply in the `float()` `apply`
   * callback instead. DOM mutations inside middleware break the pure computation model.
   * This option will be removed in the next major version.
   */
  apply?: (args: SizeApplyArgs) => void;
}

/**
 * Reports the available space between the reference and boundary edges.
 *
 * Available dimensions are written to `middlewareData.size`.
 *
 * @example
 * ```ts
 * const cleanup = float(ref, el, {
 *   middleware: [offset(8), flip(), shift(), size()],
 *   apply({ middlewareData }) {
 *     el.style.maxHeight = `${middlewareData.size!.availableHeight}px`;
 *   },
 * });
 * ```
 */
export function size(options: SizeOptions = {}): Middleware {
  const { apply } = options;

  if (import.meta.env.DEV && apply) {
    console.warn(
      '[orbit] size({ apply }) is deprecated. ' +
        'Read `middlewareData.size` in the `float()` `apply` callback instead. ' +
        'DOM mutations inside middleware break the pure computation model.',
    );
  }

  return tagMiddleware(function sizeMiddleware(state: Parameters<Middleware>[0]): ReturnType<Middleware> {
    const boundary = getBoundaryRect(options.boundary);
    const padding = toSideObject(options.padding);
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

    apply?.({ ...sizeData, elements: state.elements });

    return { data: { size: sizeData } };
  }, 'size');
}
