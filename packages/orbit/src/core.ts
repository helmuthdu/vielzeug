import type {
  ComputePositionOptions,
  ComputePositionResult,
  DetectOverflowOptions,
  Middleware,
  MiddlewareData,
  MiddlewareReset,
  MiddlewareResult,
  MiddlewareState,
  Placement,
  Rect,
  ReferenceElement,
  SideObject,
} from './types';

import { getSide, getAlignment, toRect, toSideObject } from './utils';

// ── DOM helpers ───────────────────────────────────────────────────────────────

function getViewportRect(): Rect {
  const vv = window.visualViewport;

  if (vv) return { height: vv.height, width: vv.width, x: vv.offsetLeft, y: vv.offsetTop };

  return { height: window.innerHeight, width: window.innerWidth, x: 0, y: 0 };
}

/** @internal */
export function getBoundaryRect(boundary?: Element | Rect): Rect {
  if (!boundary) return getViewportRect();

  if ('getBoundingClientRect' in boundary) return toRect(boundary.getBoundingClientRect());

  return boundary;
}

/** @internal */
export function getRects(reference: ReferenceElement, floating: HTMLElement): MiddlewareState['rects'] {
  return {
    floating: toRect(floating.getBoundingClientRect()),
    reference: toRect(reference.getBoundingClientRect()),
  };
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

function alignedOffset(
  align: ReturnType<typeof getAlignment>,
  refStart: number,
  refSize: number,
  floatSize: number,
): number {
  if (align === 'start') return refStart;

  if (align === 'end') return refStart + refSize - floatSize;

  return refStart + (refSize - floatSize) / 2;
}

/** @internal */
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

/** @internal */
export function getFloatingRect(state: MiddlewareState): Rect {
  return { ...state.rects.floating, x: state.x, y: state.y };
}

function mergeState(state: MiddlewareState, result: MiddlewareResult | void): MiddlewareState {
  if (!result) return state;

  return {
    ...state,
    middlewareData: result.data ? { ...state.middlewareData, ...result.data } : state.middlewareData,
    placement: result.placement ?? state.placement,
    x: result.x ?? state.x,
    y: result.y ?? state.y,
  };
}

// ── Overflow helpers ──────────────────────────────────────────────────────────

/** @internal */
export function detectOverflowAtRect(rect: Rect, boundary: Rect, padding: SideObject): SideObject {
  return {
    bottom: rect.y + rect.height - (boundary.y + boundary.height - padding.bottom),
    left: boundary.x + padding.left - rect.x,
    right: rect.x + rect.width - (boundary.x + boundary.width - padding.right),
    top: boundary.y + padding.top - rect.y,
  };
}

/** @internal */
export function totalOverflow(overflow: SideObject): number {
  return (
    Math.max(overflow.top, 0) + Math.max(overflow.right, 0) + Math.max(overflow.bottom, 0) + Math.max(overflow.left, 0)
  );
}

/** @internal */
export function hasOverflow(overflow: SideObject): boolean {
  return overflow.top > 0 || overflow.right > 0 || overflow.bottom > 0 || overflow.left > 0;
}

/** @internal */
export function isFullyClipped(rect: Rect, overflow: SideObject): boolean {
  return (
    overflow.top >= rect.height ||
    overflow.right >= rect.width ||
    overflow.bottom >= rect.height ||
    overflow.left >= rect.width
  );
}

/** @internal */
export function getAvailableSpace(
  state: MiddlewareState,
  placement: Placement,
  boundary: Rect,
  padding: SideObject,
): number {
  const refRect = state.rects.reference;
  const side = getSide(placement);

  switch (side) {
    case 'bottom':
      return boundary.y + boundary.height - padding.bottom - (refRect.y + refRect.height);
    case 'left':
      return refRect.x - (boundary.x + padding.left);
    case 'right':
      return boundary.x + boundary.width - padding.right - (refRect.x + refRect.width);
    case 'top':
      return refRect.y - (boundary.y + padding.top);
  }
}

/** @internal */
export function getPlacementOverflow(
  state: MiddlewareState,
  placement: Placement,
  options: DetectOverflowOptions = {},
): SideObject {
  const { x, y } = baseCoords(placement, state.rects.reference, state.rects.floating);
  const boundary = getBoundaryRect(options.boundary);
  const padding = toSideObject(options.padding);
  const rect = { ...state.rects.floating, x, y };

  return detectOverflowAtRect(rect, boundary, padding);
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns the per-side overflow of the floating element against its boundary. */
export function detectOverflow(state: MiddlewareState, options: DetectOverflowOptions = {}): SideObject {
  const boundary = getBoundaryRect(options.boundary);
  const padding = toSideObject(options.padding);

  return detectOverflowAtRect(getFloatingRect(state), boundary, padding);
}

/**
 * Runs the middleware pipeline and returns the final position.
 *
 * Position is computed in viewport-relative coordinates with `position: fixed` assumed.
 */
export function computePosition(
  reference: ReferenceElement,
  floating: HTMLElement,
  { middleware = [], placement = 'bottom' }: ComputePositionOptions = {},
): ComputePositionResult {
  if (import.meta.env.DEV) {
    if (reference === floating) {
      console.warn('[orbit] reference and floating are the same element.');
    }

    const rect = floating.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) {
      console.warn('[orbit] Floating element has zero dimensions — is it hidden or detached from the DOM?');
    }
  }

  const mws = middleware.filter(Boolean) as Middleware[];
  let currentPlacement = placement;
  let middlewareData: MiddlewareData = {};
  let rects = getRects(reference, floating);

  for (let resets = 0; resets < 50; resets += 1) {
    let state: MiddlewareState = {
      ...baseCoords(currentPlacement, rects.reference, rects.floating),
      elements: { floating, reference },
      initialPlacement: placement,
      middlewareData,
      placement: currentPlacement,
      rects,
    };

    let reset: MiddlewareReset | undefined;

    for (const mw of mws) {
      const result = mw(state);

      state = mergeState(state, result);
      middlewareData = state.middlewareData;
      reset = result?.reset;

      if (reset) break;
    }

    if (!reset) {
      return { middlewareData: state.middlewareData, placement: state.placement, x: state.x, y: state.y };
    }

    if (reset !== true) {
      if (reset.rects === true) {
        rects = getRects(reference, floating);
      } else if (reset.rects) {
        rects = reset.rects;
      }

      currentPlacement = reset.placement ?? state.placement;
    }
  }

  throw new Error('[orbit] Middleware triggered too many resets in a single compute cycle.');
}
