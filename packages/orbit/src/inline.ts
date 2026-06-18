import type { Middleware, Padding, Rect, ReferenceElement } from './types';

import { getSide, tagMiddleware, toRect, toSideObject } from './utils';

// ── Private helpers (only used by inline) ────────────────────────────────────────────

function getClientRects(reference: ReferenceElement): Rect[] {
  if (!('getClientRects' in reference) || typeof reference.getClientRects !== 'function') return [];

  return Array.from((reference.getClientRects as () => DOMRectList | DOMRect[])())
    .map(toRect)
    .filter((r) => r.width > 0 || r.height > 0);
}

function rectContainsPoint(rect: Rect, x: number, y: number, padding: ReturnType<typeof toSideObject>): boolean {
  return (
    x >= rect.x - padding.left &&
    x <= rect.x + rect.width + padding.right &&
    y >= rect.y - padding.top &&
    y <= rect.y + rect.height + padding.bottom
  );
}

function sameRect(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

// ── Inline middleware ─────────────────────────────────────────────────────────────────

export interface InlineOptions {
  /**
   * Cursor x-coordinate. When provided alongside `y`, the middleware picks the
   * client rect that contains the cursor instead of the closest rect to the floating element.
   */
  x?: number;
  /** Cursor y-coordinate. */
  y?: number;
  /**
   * Padding used when hit-testing cursor coordinates against client rects.
   * Prevents snapping when the cursor is just outside a rect edge. Default: `2`.
   *
   * @remarks Only applies when both `x` and `y` are provided.
   */
  padding?: Padding;
}

/**
 * Improves positioning accuracy for inline references that span multiple lines
 * (e.g. `<span>` wrapping across line breaks).
 *
 * Must be placed **before** `flip()` and other middleware in the pipeline.
 *
 * @example Tooltip on selected text:
 * ```ts
 * import { inline, float, flip, shift } from '@vielzeug/orbit';
 *
 * float(selectionRef, tooltip, {
 *   placement: 'top',
 *   middleware: [inline({ x: cursorX, y: cursorY }), flip(), shift({ padding: 6 })],
 * });
 * ```
 */
export function inline(options: InlineOptions = {}): Middleware {
  function inlineMiddleware(state: Parameters<Middleware>[0]): ReturnType<Middleware> {
    const rects = getClientRects(state.elements.reference);

    if (rects.length <= 1) return;

    const padding = toSideObject(options.padding ?? 2);
    const side = getSide(state.placement);
    let nextRect = rects[0]!;

    if (options.x != null && options.y != null) {
      nextRect = rects.find((rect) => rectContainsPoint(rect, options.x!, options.y!, padding)) ?? nextRect;
    } else if (side === 'top' || side === 'bottom') {
      const targetX = state.x + state.rects.floating.width / 2;

      nextRect = rects.reduce((best, rect) => {
        const bestDist = Math.abs(best.x + best.width / 2 - targetX);
        const rectDist = Math.abs(rect.x + rect.width / 2 - targetX);

        return rectDist < bestDist ? rect : best;
      }, nextRect);
    } else {
      const targetY = state.y + state.rects.floating.height / 2;

      nextRect = rects.reduce((best, rect) => {
        const bestDist = Math.abs(best.y + best.height / 2 - targetY);
        const rectDist = Math.abs(rect.y + rect.height / 2 - targetY);

        return rectDist < bestDist ? rect : best;
      }, nextRect);
    }

    if (sameRect(nextRect, state.rects.reference)) return;

    return { reset: { rects: { ...state.rects, reference: nextRect } } };
  }

  return tagMiddleware(inlineMiddleware, 'inline');
}
