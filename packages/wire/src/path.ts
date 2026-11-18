import { fmt } from './_format.js';
import type { CubicBezier, Point } from './types.js';

/** Formats a polyline as an SVG path `d` string using absolute moveto and lineto commands. */
export function polylineToSvgPath(points: readonly Point[]): string {
  const first = points[0];
  if (!first) return '';
  const parts = [`M ${fmt(first.x)} ${fmt(first.y)}`];
  for (let i = 1; i < points.length; i += 1) {
    const point = points[i] as Point;
    parts.push(`L ${fmt(point.x)} ${fmt(point.y)}`);
  }
  return parts.join(' ');
}

/** Formats a cubic bezier segment as an SVG path `d` string using absolute curveto commands. */
export function bezierToSvgPath(curve: CubicBezier): string {
  return `M ${fmt(curve.from.x)} ${fmt(curve.from.y)} C ${fmt(curve.c1.x)} ${fmt(curve.c1.y)}, ${fmt(curve.c2.x)} ${fmt(curve.c2.y)}, ${fmt(curve.to.x)} ${fmt(curve.to.y)}`;
}
