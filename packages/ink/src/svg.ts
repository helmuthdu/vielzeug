/** SVG path `d` string output for strokes and outline polygons. */

import { requireInteger, requireStrokePoints } from './_validate.js';
import { InkConfigError } from './errors.js';
import type { Point, StrokePoint } from './types.js';

export interface StrokeToSvgPathOptions {
  /** Append `Z` to close the path. Default `false`. */
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
 * Serialize a stroke as an SVG path `d` string: `M x y` followed by one `L x y` per remaining
 * sample. Coordinates are rounded to `precision` decimal places.
 *
 * @throws {import('./errors.js').InkConfigError} When `points` is invalid or options are out of range.
 */
export function strokeToSvgPath(points: readonly StrokePoint[], options: StrokeToSvgPathOptions = {}): string {
  const input = requireStrokePoints(points, 1);
  const close = options.close ?? false;
  if (typeof close !== 'boolean') {
    throw new InkConfigError(`Expected close to be a boolean, received ${typeof close}.`);
  }
  const precision = requireInteger(options.precision ?? 2, 'precision', 0, 12);
  const parts: string[] = [`M ${format(input[0].x, precision)} ${format(input[0].y, precision)}`];
  for (let i = 1; i < input.length; i++) {
    parts.push(`L ${format(input[i].x, precision)} ${format(input[i].y, precision)}`);
  }
  if (close) parts.push('Z');
  return parts.join(' ');
}

/**
 * Serialize an outline polygon (e.g. from `strokeOutline`) as a closed SVG path `d` string:
 * `M`, one `L` per remaining vertex, then `Z`.
 *
 * @throws {import('./errors.js').InkConfigError} When `polygon` is invalid or `precision` is out of range.
 */
export function strokeOutlineToSvgPath(polygon: readonly Point[], precision = 2): string {
  const input = requireStrokePoints(polygon, 1);
  const resolved = requireInteger(precision, 'precision', 0, 12);
  const parts: string[] = [`M ${format(input[0].x, resolved)} ${format(input[0].y, resolved)}`];
  for (let i = 1; i < input.length; i++) {
    parts.push(`L ${format(input[i].x, resolved)} ${format(input[i].y, resolved)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}
