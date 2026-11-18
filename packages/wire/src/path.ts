import { fmt } from './_format.js';
import { WireConfigError } from './errors.js';
import type { CubicBezier, Point } from './types.js';

/** Configuration for `polylineToSvgPath()`. */
export interface PolylinePathOptions {
  /**
   * Radius used to round interior corners with quadratic arcs (`Q` commands).
   * Each corner is clamped to half of its shortest adjacent run, so tight
   * bends never overlap. `0` or omitted keeps sharp `L` corners.
   */
  cornerRadius?: number;
}

/** Below this normalized cross product, three points count as collinear. */
const COLLINEAR_EPSILON = 1e-9;

/**
 * Formats a polyline as an SVG path `d` string using absolute moveto and lineto
 * commands. With `cornerRadius`, interior corners are replaced by entry/exit runs
 * joined by a quadratic `Q` arc; the corner point itself is not emitted.
 */
export function polylineToSvgPath(points: readonly Point[], options: PolylinePathOptions = {}): string {
  const cornerRadius = options.cornerRadius ?? 0;
  if (!Number.isFinite(cornerRadius) || cornerRadius < 0) {
    throw new WireConfigError(
      `Path cornerRadius must be a finite non-negative number, received ${String(cornerRadius)}.`,
    );
  }
  const first = points[0];
  if (!first) return '';
  const last = points[points.length - 1] as Point;
  const parts = [`M ${fmt(first.x)} ${fmt(first.y)}`];
  if (cornerRadius === 0) {
    for (let i = 1; i < points.length; i += 1) {
      const point = points[i] as Point;
      parts.push(`L ${fmt(point.x)} ${fmt(point.y)}`);
    }
    return parts.join(' ');
  }
  // Rounded mode: interior corners become entry/exit runs joined by a Q arc;
  // the corner point itself is never emitted, collinear points pass through.
  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1] as Point;
    const cur = points[i] as Point;
    const next = points[i + 1] as Point;
    const inLen = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    const outLen = Math.hypot(next.x - cur.x, next.y - cur.y);
    // Zero-length runs and near-collinear points have no corner to round.
    if (inLen === 0 || outLen === 0) continue;
    const inX = (cur.x - prev.x) / inLen;
    const inY = (cur.y - prev.y) / inLen;
    const outX = (next.x - cur.x) / outLen;
    const outY = (next.y - cur.y) / outLen;
    if (Math.abs(inX * outY - inY * outX) < COLLINEAR_EPSILON) continue;
    const radius = Math.min(cornerRadius, inLen / 2, outLen / 2);
    parts.push(`L ${fmt(cur.x - inX * radius)} ${fmt(cur.y - inY * radius)}`);
    parts.push(`Q ${fmt(cur.x)} ${fmt(cur.y)}, ${fmt(cur.x + outX * radius)} ${fmt(cur.y + outY * radius)}`);
  }
  parts.push(`L ${fmt(last.x)} ${fmt(last.y)}`);
  return parts.join(' ');
}

/** Formats a cubic bezier segment as an SVG path `d` string using absolute curveto commands. */
export function bezierToSvgPath(curve: CubicBezier): string {
  return `M ${fmt(curve.from.x)} ${fmt(curve.from.y)} C ${fmt(curve.c1.x)} ${fmt(curve.c1.y)}, ${fmt(curve.c2.x)} ${fmt(curve.c2.y)}, ${fmt(curve.to.x)} ${fmt(curve.to.y)}`;
}
