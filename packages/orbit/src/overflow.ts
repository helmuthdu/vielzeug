/**
 * @vielzeug/orbit — overflow-detection helpers.
 *
 * Imported by both `core.ts` (for `detectOverflow`) and middleware modules.
 * Middleware should import from here instead of reaching into core internals.
 */

import type { DetectOverflowOptions, MiddlewareState, Placement, Rect, SideObject } from './types';

import { baseCoords, flatTreeParent, getSide, toSideObject } from './utils';

// ── Boundary ──────────────────────────────────────────────────────────────────

function getViewportRect(): Rect {
  const vv = window.visualViewport;

  if (vv) return { height: vv.height, width: vv.width, x: vv.offsetLeft, y: vv.offsetTop };

  return { height: window.innerHeight, width: window.innerWidth, x: 0, y: 0 };
}

/** Resolve a boundary option to a plain Rect. Defaults to the visual viewport. */
export function getBoundaryRect(boundary?: Element | Rect): Rect {
  if (!boundary) return getViewportRect();

  if (boundary instanceof Element) {
    const r = boundary.getBoundingClientRect();

    return { height: r.height, width: r.width, x: r.x, y: r.y };
  }

  return boundary as Rect;
}

const CLIPPING_OVERFLOW = /(hidden|clip|scroll|auto|overlay)/;

function intersectRect(a: Rect, b: Rect): Rect {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);

  return { height: Math.max(0, bottom - y), width: Math.max(0, right - x), x, y };
}

/**
 * Walks up from `element` (crossing shadow boundaries via the flat tree) collecting every
 * ancestor whose `overflow`/`overflow-x`/`overflow-y` clips content — `hidden`, `clip`, `scroll`,
 * `auto`, or `overlay` — intersecting each one's rect into a running result (the nearest,
 * most-restrictive ancestor wins, same model real CSS clipping uses). Always intersects with the
 * viewport too, so the result never exceeds it even when no clipping ancestor is found.
 *
 * Pass this as `boundary` to `flip`/`shift`/`size` so a floating element nested inside a
 * scrollable region or a dialog panel stays within *that* container — which is what a user
 * actually sees as "the edge" — instead of only avoiding the full page viewport, which the
 * floating element can still be well inside while visibly overhanging a much smaller ancestor.
 *
 * @example
 * ```ts
 * const boundary = getClippingAncestorRect(floatingEl);
 * computePosition(reference, floating, { boundary, middleware: [flip(), shift()] });
 * ```
 */
export function getClippingAncestorRect(element: Element): Rect {
  let node = flatTreeParent(element);
  let rect = getViewportRect();

  while (node) {
    const style = getComputedStyle(node);

    if (CLIPPING_OVERFLOW.test(`${style.overflow}${style.overflowX}${style.overflowY}`)) {
      const r = node.getBoundingClientRect();

      rect = intersectRect(rect, { height: r.height, width: r.width, x: r.x, y: r.y });
    }

    node = flatTreeParent(node);
  }

  return rect;
}

/**
 * Resolves the effective boundary and padding for a middleware, falling back from
 * per-middleware `options` to the global `state.boundary` / `state.padding` defaults.
 * @internal
 */
export function resolveBoundary(
  options: DetectOverflowOptions,
  state: Pick<MiddlewareState, 'boundary' | 'padding'>,
): { boundary: Rect; padding: SideObject } {
  return {
    boundary: getBoundaryRect(options.boundary ?? state.boundary),
    padding: toSideObject(options.padding ?? state.padding),
  };
}

// ── Floating rect at current position ────────────────────────────────────────

/** The floating element's rect using the current computed x/y from state. */
export function getFloatingRect(state: MiddlewareState): Rect {
  return { ...state.rects.floating, x: state.x, y: state.y };
}

// ── Per-side overflow ─────────────────────────────────────────────────────────

/** How many pixels each side of `rect` overflows `boundary` (adjusted by `padding`). Negative = no overflow. */
export function detectOverflowAtRect(rect: Rect, boundary: Rect, padding: SideObject): SideObject {
  return {
    bottom: rect.y + rect.height - (boundary.y + boundary.height - padding.bottom),
    left: boundary.x + padding.left - rect.x,
    right: rect.x + rect.width - (boundary.x + boundary.width - padding.right),
    top: boundary.y + padding.top - rect.y,
  };
}

/** Sum of positive overflows on all sides. */
export function totalOverflow(overflow: SideObject): number {
  return (
    Math.max(overflow.top, 0) + Math.max(overflow.right, 0) + Math.max(overflow.bottom, 0) + Math.max(overflow.left, 0)
  );
}

/** True if any side has positive overflow. */
export function hasOverflow(overflow: SideObject): boolean {
  return overflow.top > 0 || overflow.right > 0 || overflow.bottom > 0 || overflow.left > 0;
}

/**
 * True if the rect is fully clipped (hidden) by the overflow on any axis.
 * Used by `hide` middleware.
 */
export function isFullyClipped(rect: Rect, overflow: SideObject): boolean {
  return (
    overflow.top >= rect.height ||
    overflow.right >= rect.width ||
    overflow.bottom >= rect.height ||
    overflow.left >= rect.width
  );
}

// ── Placement-specific helpers ────────────────────────────────────────────────

/** Available space in pixels between the reference and the boundary on the given placement's side. */
export function getAvailableSpace(
  state: MiddlewareState,
  placement: Placement,
  boundary: Rect,
  padding: SideObject,
): number {
  const ref = state.rects.reference;
  const side = getSide(placement);

  switch (side) {
    case 'bottom':
      return boundary.y + boundary.height - padding.bottom - (ref.y + ref.height);
    case 'left':
      return ref.x - (boundary.x + padding.left);
    case 'right':
      return boundary.x + boundary.width - padding.right - (ref.x + ref.width);
    case 'top':
      return ref.y - (boundary.y + padding.top);
  }
}

/**
 * Overflow of the floating element if it were positioned at `placement`
 * using base (un-shifted) coordinates, before any middleware adjustments.
 */
export function getPlacementOverflow(
  state: MiddlewareState,
  placement: Placement,
  options: DetectOverflowOptions = {},
): SideObject {
  const { x, y } = baseCoords(placement, state.rects.reference, state.rects.floating);
  const { boundary, padding } = resolveBoundary(options, state);
  const rect = { ...state.rects.floating, x, y };

  return detectOverflowAtRect(rect, boundary, padding);
}

/** Overflow of the floating element at its current position in the middleware pipeline. */
export function detectOverflow(state: MiddlewareState, options: DetectOverflowOptions = {}): SideObject {
  const { boundary, padding } = resolveBoundary(options, state);

  return detectOverflowAtRect(getFloatingRect(state), boundary, padding);
}
