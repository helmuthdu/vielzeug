/** Ramer-Douglas-Peucker stroke decimation. */

import { requireFiniteNumber, requireStrokePoints } from './_validate.js';
import { InkConfigError } from './errors.js';
import type { StrokePoint } from './types.js';

/** Perpendicular distance from `p` to the infinite line through `a`-`b`; point distance when degenerate. */
function perpendicularDistance(p: StrokePoint, a: StrokePoint, b: StrokePoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const cross = Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x);
  return cross / Math.sqrt(lenSq);
}

/**
 * Decimate a stroke with Ramer-Douglas-Peucker: iteratively drop the point farthest from the
 * chord when its distance is under `tolerance`, keeping the first and last points. The result is
 * always a subsequence of the input (same object references), so metadata like `pressure` survives.
 *
 * @throws {import('./errors.js').InkConfigError} When `points` is invalid or `tolerance` is not a
 * non-negative finite number.
 */
export function simplifyStroke(points: readonly StrokePoint[], tolerance: number): StrokePoint[] {
  const input = requireStrokePoints(points);
  requireFiniteNumber(tolerance, 'tolerance');
  if (tolerance < 0) {
    throw new InkConfigError(`Expected tolerance to be >= 0, received ${tolerance}.`);
  }
  if (input.length < 3) return input.map((point) => ({ ...point }));

  // Iterative RDP with an explicit stack: no recursion depth limit on long strokes.
  const keep = new Uint8Array(input.length);
  keep[0] = 1;
  keep[input.length - 1] = 1;
  const stack: [number, number][] = [[0, input.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop() as [number, number];
    let farthest = -1;
    let maxDistance = -1;
    for (let i = first + 1; i < last; i++) {
      const d = perpendicularDistance(input[i], input[first], input[last]);
      if (d > maxDistance) {
        maxDistance = d;
        farthest = i;
      }
    }
    if (farthest !== -1 && maxDistance > tolerance) {
      keep[farthest] = 1;
      stack.push([first, farthest], [farthest, last]);
    }
  }

  const result: StrokePoint[] = [];
  for (let i = 0; i < input.length; i++) {
    if (keep[i]) result.push(input[i]);
  }
  return result;
}
