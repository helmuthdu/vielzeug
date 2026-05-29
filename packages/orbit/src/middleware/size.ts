import type { DetectOverflowOptions, Middleware, ReferenceElement, SizeData } from '../types';

import { getBoundaryRect } from '../core';
import { getSide, toSideObject } from '../utils';

export interface SizeApplyArgs extends SizeData {
  elements: { floating: HTMLElement; reference: ReferenceElement };
}

export interface SizeOptions extends DetectOverflowOptions {
  /**
   * Optional callback to mutate the floating element based on available space.
   * Called after `middlewareData.size` is populated.
   *
   * Prefer reading `result.middlewareData.size` directly over using this callback.
   */
  apply?: (args: SizeApplyArgs) => void;
}

/**
 * Reports the available space between the reference and boundary edges.
 *
 * Available dimensions are written to `middlewareData.size` and optionally
 * passed to an `apply` callback for immediate DOM mutations.
 *
 * @example Read from result (preferred):
 * ```ts
 * const result = computePosition(ref, el, { middleware: [size()] });
 * el.style.maxHeight = `${result.middlewareData.size!.availableHeight}px`;
 * ```
 *
 * @example Mutate in callback (convenient shorthand):
 * ```ts
 * size({ apply({ availableHeight, elements }) {
 *   elements.floating.style.maxHeight = `${availableHeight}px`;
 * }})
 * ```
 */
export function size(options: SizeOptions = {}): Middleware {
  const { apply } = options;

  return (state) => {
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
  };
}
