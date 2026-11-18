/** Stroke smoothing: deterministic Catmull-Rom resampling. */

import { clamp, requireInteger, requireRange, requireStrokePoints } from './_validate.js';
import type { StrokePoint } from './types.js';

export interface SmoothStrokeOptions {
  /** Samples emitted per input segment (minimum 2). Default 8. */
  steps?: number;
  /** Interpolation tension. `0` is linear, `1` is the standard uniform spline. Default `1`. */
  tension?: number;
}

/**
 * Interpolation basis for one axis; `t` in `[0, 1]`. `alpha` blends linear
 * interpolation (`alpha = 0`) with the standard uniform Catmull-Rom spline
 * (`alpha = 1`), so `tension: 0` is genuinely linear.
 */
function catmullRomAxis(p0: number, p1: number, p2: number, p3: number, t: number, alpha: number): number {
  const linear = p1 + (p2 - p1) * t;
  const t2 = t * t;
  const t3 = t2 * t;
  const spline =
    0.5 * (2 * p1 + t * (p2 - p0) + t2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) + t3 * (3 * p1 - 3 * p2 - p0 + p3));
  return linear + alpha * (spline - linear);
}

/** Linear interpolation of optional metadata; keeps the field absent when neither side has it. */
function lerpField(a: number | undefined, b: number | undefined, t: number): number | undefined {
  if (a !== undefined && b !== undefined) return a + (b - a) * t;
  return a ?? b;
}

function emitPoint(x: number, y: number, pressure?: number, time?: number): StrokePoint {
  const point: { x: number; y: number; pressure?: number; time?: number } = { x, y };
  if (pressure !== undefined) point.pressure = pressure;
  if (time !== undefined) point.time = time;
  return point;
}

function catmullRomResample(points: readonly StrokePoint[], tension: number, steps: number): StrokePoint[] {
  const result: StrokePoint[] = [];
  const last = points.length - 1;
  // Duplicated end controls keep the spline interpolating the true endpoints.
  const at = (index: number): StrokePoint => points[clamp(index, 0, last)];
  for (let i = 0; i < last; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      result.push(
        emitPoint(
          catmullRomAxis(p0.x, p1.x, p2.x, p3.x, t, tension),
          catmullRomAxis(p0.y, p1.y, p2.y, p3.y, t, tension),
          lerpField(p1.pressure, p2.pressure, t),
          lerpField(p1.time, p2.time, t),
        ),
      );
    }
  }
  result.push(emitPoint(points[last].x, points[last].y, points[last].pressure, points[last].time));
  return result;
}

/**
 * Resample a freehand stroke through a uniform Catmull-Rom spline: `steps` samples per input
 * segment, with the first and last input points preserved exactly. `pressure` and `time` are
 * interpolated linearly, so widths computed from the output match widths computed from the input.
 *
 * For jitter removal *while drawing*, use `stabilizeStroke` instead: this function adds points and
 * looks ahead, so it is the post-capture step.
 *
 * @throws {import('./errors.js').InkConfigError} When options are out of range.
 */
export function smoothStroke(points: readonly StrokePoint[], options: SmoothStrokeOptions = {}): StrokePoint[] {
  const input = requireStrokePoints(points);
  const tension = requireRange(options.tension ?? 1, 'tension', 0, 1);
  const steps = requireInteger(options.steps ?? 8, 'steps', 2, 1000);
  if (input.length < 3) return input.map((point) => ({ ...point }));
  return catmullRomResample(input, tension, steps);
}
