import type { Point, Rect } from './_shapes.js';

export function rectFromPoints(points: Iterable<Point>): Rect | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let found = false;
  for (const point of points) {
    found = true;
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }
  if (!found) return null;
  return { height: maxY - minY, width: maxX - minX, x: minX, y: minY };
}

export function rectRight(rect: Rect): number {
  return rect.x + rect.width;
}

export function rectBottom(rect: Rect): number {
  return rect.y + rect.height;
}

export function rectCenter(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

export function unionRect(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    height: Math.max(rectBottom(a), rectBottom(b)) - y,
    width: Math.max(rectRight(a), rectRight(b)) - x,
    x,
    y,
  };
}

/** Returns null when the rects do not overlap. Touching edges do not intersect. */
export function intersectRect(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(rectRight(a), rectRight(b));
  const bottom = Math.min(rectBottom(a), rectBottom(b));
  if (right <= x || bottom <= y) return null;
  return { height: bottom - y, width: right - x, x, y };
}

export function containsRect(outer: Rect, inner: Rect): boolean {
  return (
    outer.x <= inner.x &&
    outer.y <= inner.y &&
    rectRight(outer) >= rectRight(inner) &&
    rectBottom(outer) >= rectBottom(inner)
  );
}

export function containsPoint(rect: Rect, point: Point): boolean {
  return point.x >= rect.x && point.x <= rectRight(rect) && point.y >= rect.y && point.y <= rectBottom(rect);
}

/** Grows (positive) or shrinks (negative) every edge; a shrink past the center yields a negative-size rect. */
export function inflateRect(rect: Rect, amount: number): Rect {
  return { height: rect.height + amount * 2, width: rect.width + amount * 2, x: rect.x - amount, y: rect.y - amount };
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return intersectRect(a, b) !== null;
}
