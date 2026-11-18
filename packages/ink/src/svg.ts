/** SVG path `d` string output for polylines and outline polygons. */

import { requireInteger, requireStrokePoints } from './_validate.js';
import type { Point } from './types.js';

export interface PolylineToSvgPathOptions {
  /** Append `Z` to close the path. Use for outline rings from `strokeOutline`. Default `false`. */
  close?: boolean;
  /** Decimal places for emitted coordinates (`0`-`12`). Default `2`. */
  precision?: number;
}

function format(value: number, precision: number): string {
  // `+ 0` normalizes -0 to 0 so output is stable across platforms.
  const rounded = Number(value.toFixed(precision)) + 0;
  return String(rounded);
}

/**
 * Serialize a polyline as an SVG path `d` string: `M x y` followed by one `L x y` per remaining
 * point. Coordinates are rounded to `precision` decimal places.
 *
 * Works for both open strokes and closed rings: pass `close: true` for the outline polygon
 * returned by `strokeOutline`.
 *
 * @example
 * ```ts
 * polylineToSvgPath([{ x: 0, y: 0 }, { x: 10, y: 5 }]);
 * // 'M 0 0 L 10 5'
 * polylineToSvgPath(strokeOutline(points, 4), { close: true });
 * // 'M ... L ... Z'
 * ```
 *
 * @throws {import('./errors.js').InkConfigError} When `points` is empty or `precision` is out of range.
 */
export function polylineToSvgPath(points: readonly Point[], options: PolylineToSvgPathOptions = {}): string {
  const input = requireStrokePoints(points, 1);
  const close = options.close ?? false;
  const precision = requireInteger(options.precision ?? 2, 'precision', 0, 12);
  const parts: string[] = [`M ${format(input[0].x, precision)} ${format(input[0].y, precision)}`];
  for (let i = 1; i < input.length; i++) {
    parts.push(`L ${format(input[i].x, precision)} ${format(input[i].y, precision)}`);
  }
  if (close) parts.push('Z');
  return parts.join(' ');
}
