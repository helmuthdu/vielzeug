/**
 * Structural shape types shared across the canvas toolkit. Deliberately
 * duplicated (not imported) from `@vielzeug/atlas`: packages must not depend
 * on each other, and these shapes are structurally compatible.
 */

export type Point = Readonly<{ x: number; y: number }>;

export type Rect = Readonly<{ x: number; y: number; width: number; height: number }>;

/** Canvas2D/DOMMatrix element order: [a, b, c, d, e, f]. */
export type Matrix = readonly [number, number, number, number, number, number];

export function applyMatrix(matrix: Matrix, point: Point): Point {
  const [a, b, c, d, e, f] = matrix;
  return { x: a * point.x + c * point.y + e, y: b * point.x + d * point.y + f };
}

/** Inverse of a 2D affine matrix; null for degenerate matrices. */
export function invertMatrix(matrix: Matrix): Matrix | null {
  const [a, b, c, d, e, f] = matrix;
  const det = a * d - b * c;
  if (det === 0 || !Number.isFinite(det)) return null;
  const inv = 1 / det;
  return [d * inv, -b * inv, -c * inv, a * inv, (c * f - d * e) * inv, (b * e - a * f) * inv];
}

/** Axis-aligned bounds of a point cloud. */
export function boundsOf(points: Iterable<Point>): Rect {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const { x, y } of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { height: maxY - minY, width: maxX - minX, x: minX, y: minY };
}
