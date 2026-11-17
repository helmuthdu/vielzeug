import type { Point, Rect } from './shapes.js';

/**
 * Ray-casting point-in-polygon test. `polygon` is an open ring; an implicit closing
 * edge connects the last point to the first. Boundary behavior follows the standard
 * ray-cast convention (edge hits depend on the ray's crossing parity).
 */
export function pointInPolygon(polygon: readonly Point[], point: Point): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const crosses = a.y > point.y !== b.y > point.y;
    if (!crosses) continue;
    const xAtY = ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (point.x < xAtY) inside = !inside;
  }
  return inside;
}

function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

/**
 * Shortest distance from a point to a polyline (an open path; no implicit closing
 * edge). Returns Infinity for paths with fewer than two points unless the single
 * point coincides with `point` (distance 0) — callers pass real geometry.
 */
export function distanceToPolyline(path: readonly Point[], point: Point): number {
  if (path.length === 0) return Infinity;
  if (path.length === 1) return Math.hypot(point.x - path[0].x, point.y - path[0].y);
  let best = Infinity;
  for (let i = 0, j = 1; j < path.length; i = j++) {
    const d = distanceToSegment(point, path[i], path[j]);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Whether a point lies within `tolerance` of a polygon's outline or inside it —
 * the hit test for stroked shapes (outlines, wires rendered as strokes).
 */
export function pointNearPolygon(polygon: readonly Point[], point: Point, tolerance: number): boolean {
  if (tolerance < 0) return false;
  const closed = polygon.length > 0 ? [...polygon, polygon[0]] : polygon;
  if (distanceToPolyline(closed, point) <= tolerance) return true;
  return pointInPolygon(polygon, point);
}

/** Axis-aligned bounding box of a point set; null for empty input. */
export function boundsOf(points: Iterable<Point>): Rect | null {
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
  return found ? { height: maxY - minY, width: maxX - minX, x: minX, y: minY } : null;
}
