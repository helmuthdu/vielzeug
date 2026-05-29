import type { Alignment, Padding, Placement, Rect, Side, SideObject } from './types';

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
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** @internal */
export function isElement(value: unknown): value is Element {
  return typeof Element !== 'undefined' && value instanceof Element;
}
