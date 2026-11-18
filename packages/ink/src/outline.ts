/** Closed variable-width polygon approximating a stroked path. */

import { clamp, requireFiniteNumber, requireStrokePoints } from './_validate.js';
import { InkConfigError } from './errors.js';
import type { Point, StrokePoint } from './types.js';

/** Unit normal at sample `i` of a polyline, derived from the central tangent; falls back to adjacent segments. */
function normalAt(points: readonly Point[], i: number): Point {
  const last = points.length - 1;
  const prev = points[clamp(i - 1, 0, last)];
  const next = points[clamp(i + 1, 0, last)];
  let tx = next.x - prev.x;
  let ty = next.y - prev.y;
  if (tx === 0 && ty === 0) {
    // Degenerate central tangent (e.g. a spike back on itself): use the outgoing segment.
    const other = points[clamp(i + 1, 0, last)];
    tx = other.x - points[i].x;
    ty = other.y - points[i].y;
  }
  const len = Math.hypot(tx, ty);
  if (len === 0) return { x: 0, y: -1 };
  return { x: ty / len, y: -tx / len };
}

/** Append the interior points of a half-circle cap: samples from `startAngle` to `startAngle + PI`, endpoints excluded. */
function appendCap(outline: Point[], center: Point, startAngle: number, radius: number): void {
  const steps = 8;
  for (let s = 1; s < steps; s++) {
    const angle = startAngle + Math.PI * (s / steps);
    outline.push({ x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius });
  }
}

/**
 * Build a closed polygon approximating the variable-width stroke through `points`.
 *
 * Each sample is offset by half its width along the local normal; the ring runs the start cap,
 * the left side forward, the end cap, and the right side backward, so it is closed without a
 * repeated final point. Pass a constant `width` for a uniform stroke, or one width per point
 * (from `strokeWidths`) for a variable one. Deterministic: identical input produces an identical ring.
 *
 * @throws {import('./errors.js').InkConfigError} When `widths` is a mismatched array or holds non-positive values.
 */
export function strokeOutline(points: readonly StrokePoint[], widths: number | readonly number[]): Point[] {
  const input = requireStrokePoints(points, 1);
  const perPoint: readonly number[] = typeof widths === 'number' ? input.map(() => widths) : widths;
  if (perPoint.length !== input.length) {
    throw new InkConfigError(`Expected widths to hold ${input.length} number(s), received ${perPoint.length}.`);
  }
  for (const [index, w] of perPoint.entries()) {
    requireFiniteNumber(w, `widths[${index}]`);
    if (w <= 0) {
      throw new InkConfigError(`Expected widths[${index}] to be a positive finite number, received ${w}.`);
    }
  }

  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i < input.length; i++) {
    const point = input[i];
    const half = perPoint[i] / 2;
    const normal = normalAt(input, i);
    left.push({ x: point.x + normal.x * half, y: point.y + normal.y * half });
    right.push({ x: point.x - normal.x * half, y: point.y - normal.y * half });
  }

  const first = input[0];
  const last = input[input.length - 1];
  const firstNormal = normalAt(input, 0);
  const lastNormal = normalAt(input, input.length - 1);

  const outline: Point[] = [];
  // Start cap: half-circle from the right offset of the first sample, around its back, to the left offset.
  appendCap(outline, first, Math.atan2(firstNormal.y, firstNormal.x) + Math.PI, perPoint[0] / 2);
  outline.push(...left);
  // End cap: half-circle from the left offset of the last sample, around its front, to the right offset.
  appendCap(outline, last, Math.atan2(lastNormal.y, lastNormal.x), perPoint[perPoint.length - 1] / 2);
  outline.push(...right.reverse());
  return outline;
}
