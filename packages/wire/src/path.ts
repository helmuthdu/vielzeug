import { fmt } from './_format.js';
import type { Point } from './types.js';

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
