import { clamp } from '@vielzeug/arsenal';

import type { Alignment, Middleware, Padding, Placement, Rect, Side, SideObject, TypedMiddleware } from './types';

import { OrbitConfigError } from './errors';

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
 * Ordering rules for dev-mode middleware validation.
 * Each tuple is `[mustFollow, mustPrecede]` — `mustFollow` must appear **after** `mustPrecede`
 * in the pipeline. Validation throws if `mustFollow` is found at a lower index than `mustPrecede`.
 * @internal
 */
export const MIDDLEWARE_ORDER_RULES: Array<[mustFollow: string, mustPrecede: string]> = [
  ['arrow', 'flip'],
  ['arrow', 'shift'],
  ['arrow', 'autoPlacement'],
  ['flip', 'inline'],
  ['shift', 'inline'],
  ['autoPlacement', 'inline'],
  ['size', 'flip'],
  ['size', 'autoPlacement'],
];

/**
 * Validates a list of middleware names for known-bad orderings.
 * Throws a descriptive error in dev mode if an invalid ordering is detected.
 * @internal
 */
export function validateMiddlewareNames(names: Array<string | null>): void {
  for (const [mustFollow, mustPrecede] of MIDDLEWARE_ORDER_RULES) {
    const followIdx = names.indexOf(mustFollow);
    const precedeIdx = names.indexOf(mustPrecede);

    if (followIdx !== -1 && precedeIdx !== -1 && followIdx < precedeIdx) {
      throw new OrbitConfigError(
        `"${mustFollow}" must come after "${mustPrecede}" in the middleware pipeline. ` +
          `Recommended order: inline → offset → flip/autoPlacement → shift → size → arrow.`,
      );
    }
  }

  if (names.includes('flip') && names.includes('autoPlacement')) {
    throw new OrbitConfigError('use either flip() or autoPlacement() in the middleware pipeline, not both.');
  }
}

/**
 * Unique symbol used to tag middleware with a name for dev-mode ordering validation.
 * Using a Symbol avoids collisions with any `__name` property set by transpilers or wrappers.
 * @internal
 */
export const MIDDLEWARE_NAME = Symbol.for('@vielzeug/orbit/name');

/**
 * Tags a middleware function with a name for dev-mode ordering validation and brands it
 * as a `TypedMiddleware<K, D>` for compile-time `middlewareData` inference.
 * @internal
 */
export function tagMiddleware<K extends string, D, F extends Middleware>(fn: F, name: K): F & TypedMiddleware<K, D> {
  (fn as Record<symbol, unknown>)[MIDDLEWARE_NAME] = name;

  return fn as F & TypedMiddleware<K, D>;
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
