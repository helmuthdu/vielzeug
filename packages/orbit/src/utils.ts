import { clamp } from '@vielzeug/arsenal';

import type { Alignment, Middleware, Padding, Placement, Rect, Side, SideObject } from './types';

export { clamp };

export const OPPOSITE: Record<Side, Side> = { bottom: 'top', left: 'right', right: 'left', top: 'bottom' };

/** Returns the primary side of a placement (`'top' | 'bottom' | 'left' | 'right'`). */
export function getSide(p: Placement): Side {
  return p.split('-')[0] as Side;
}

/** Returns the alignment of a placement (`'start' | 'end'`), or `null` for center placements. */
export function getAlignment(p: Placement): Alignment | null {
  return (p.split('-')[1] as Alignment) ?? null;
}

/** @internal */
export function withPlacement(side: Side, align: Alignment | null): Placement {
  return (align ? `${side}-${align}` : side) as Placement;
}

/** @internal */
export function toRect({ height, width, x, y }: DOMRect | Rect): Rect {
  return { height, width, x, y };
}

/** @internal */
export function toSideObject(padding: Padding = 0): SideObject {
  if (typeof padding === 'number') {
    return { bottom: padding, left: padding, right: padding, top: padding };
  }

  return {
    bottom: padding.bottom ?? 0,
    left: padding.left ?? 0,
    right: padding.right ?? 0,
    top: padding.top ?? 0,
  };
}

/** @internal */
export function isElement(value: unknown): value is Element {
  return typeof Element !== 'undefined' && value instanceof Element;
}

// ── Middleware helpers ────────────────────────────────────────────────────────

/**
 * Ordering rules used by both `compose()` and `computePosition()` for dev-mode validation.
 * Each tuple is [before, after], meaning `before` must NOT appear before `after` in the pipeline.
 * @internal
 */
export const MIDDLEWARE_ORDER_RULES: Array<[before: string, after: string]> = [
  ['arrow', 'flip'],
  ['arrow', 'shift'],
  ['arrow', 'autoPlacement'],
  ['size', 'flip'],
  ['size', 'autoPlacement'],
];

/**
 * Unique symbol used to tag middleware with a name for dev-mode ordering validation.
 * Using a Symbol avoids collisions with any `__name` property set by transpilers or wrappers.
 * @internal
 */
export const MIDDLEWARE_NAME = Symbol.for('@vielzeug/orbit/name');

/**
 * Tags a middleware function with a name used for dev-mode ordering validation.
 * @internal
 */
export function tagMiddleware<F extends Middleware>(fn: F, name: string): F & { [MIDDLEWARE_NAME]: string } {
  return Object.assign(fn, { [MIDDLEWARE_NAME]: name });
}

// ── Geometry ──────────────────────────────────────────────────────────────────

function alignedOffset(align: Alignment | null, refStart: number, refSize: number, floatSize: number): number {
  if (align === 'start') return refStart;

  if (align === 'end') return refStart + refSize - floatSize;

  return refStart + (refSize - floatSize) / 2;
}

/**
 * Computes the base (un-shifted) x/y coordinates for a floating element
 * given the placement and the reference/floating rects.
 * @internal
 */
export function baseCoords(placement: Placement, ref: Rect, float: Rect): { x: number; y: number } {
  const side = getSide(placement);
  const align = getAlignment(placement);

  switch (side) {
    case 'bottom':
      return { x: alignedOffset(align, ref.x, ref.width, float.width), y: ref.y + ref.height };
    case 'left':
      return { x: ref.x - float.width, y: alignedOffset(align, ref.y, ref.height, float.height) };
    case 'right':
      return { x: ref.x + ref.width, y: alignedOffset(align, ref.y, ref.height, float.height) };
    case 'top':
      return { x: alignedOffset(align, ref.x, ref.width, float.width), y: ref.y - float.height };
  }
}
