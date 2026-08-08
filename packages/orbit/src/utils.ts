import type { Alignment, Padding, Placement, Rect, Side, SideObject } from './types';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

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

/**
 * Returns `node`'s parent in the flat (rendering) tree — the tree CSS layout, paint, and
 * containing-block rules actually walk, which is *not* the same as light-DOM `parentElement`:
 *
 * - If `node` is itself distributed into a `<slot>` (`node.assignedSlot` is set), its rendered
 *   parent is that `<slot>`, which lives inside the shadow tree that projects it — not wherever
 *   `node.parentElement` points in the light DOM. Skipping this check would walk straight past
 *   the shadow host and out into *its* light-DOM ancestors, missing every ancestor between the
 *   `<slot>` and the shadow root (a dialog's `.panel`, say) entirely.
 * - Otherwise, falls back to `parentElement`, or — once that's exhausted at a shadow root
 *   boundary — the shadow root's host, so the walk continues past shadow boundaries instead of
 *   stopping there.
 *
 * `null` once it reaches a true root.
 * @internal
 */
export function flatTreeParent(node: Element): Element | null {
  if (node.assignedSlot) return node.assignedSlot;

  return (
    node.parentElement ?? (node.getRootNode() instanceof ShadowRoot ? (node.getRootNode() as ShadowRoot).host : null)
  );
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
