/** Stroke smoothing: deterministic Catmull-Rom resampling and Streamline-style causal averaging. */

import { clamp, distance, requireInteger, requireRange, requireStrokePoints } from './_validate.js';
import { InkConfigError } from './errors.js';
import type { StrokePoint } from './types.js';

export interface SmoothStrokeOptions {
  /** Smoothing algorithm. Default `'catmull-rom'`. */
  algorithm?: 'catmull-rom' | 'streamline';
  /** Samples emitted per input segment for `'catmull-rom'` (minimum 2). Default 8. Ignored by `'streamline'`. */
  steps?: number;
  /** Interpolation tension for `'catmull-rom'`. `0` is linear, `1` is the standard uniform spline. Default `1`. */
  tension?: number;
}

/** Catmull-Rom basis for one axis; `t` in `[0, 1]`, `alpha` scales the tangent terms. */
function catmullRomAxis(p0: number, p1: number, p2: number, p3: number, t: number, alpha: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      alpha * t * (p2 - p0) +
      alpha * t2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) +
      alpha * t3 * (3 * p1 - 3 * p2 - p0 + p3))
  );
}

function emitPoint(x: number, y: number, pressure?: number): StrokePoint {
  return pressure === undefined ? { x, y } : { pressure, x, y };
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
      const pressure =
        p1.pressure !== undefined && p2.pressure !== undefined
          ? p1.pressure + (p2.pressure - p1.pressure) * t
          : (p1.pressure ?? p2.pressure);
      result.push(
        emitPoint(
          catmullRomAxis(p0.x, p1.x, p2.x, p3.x, t, tension),
          catmullRomAxis(p0.y, p1.y, p2.y, p3.y, t, tension),
          pressure,
        ),
      );
    }
  }
  result.push(emitPoint(points[last].x, points[last].y, points[last].pressure));
  return result;
}

/**
 * Streamline-style causal low-pass: an exponential moving average toward each incoming
 * sample, with a jitter dead zone. Output length matches input length so per-point
 * widths and metadata stay aligned with the source samples.
 */
function streamlineAverage(points: readonly StrokePoint[], tension: number): StrokePoint[] {
  const alpha = clamp(1 - tension * 0.9, 0.05, 1);
  const result: StrokePoint[] = [emitPoint(points[0].x, points[0].y, points[0].pressure)];
  let sx = points[0].x;
  let sy = points[0].y;
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    // Dead zone: jitter smaller than the smoothing pull is dropped, keeping straight lines crisp.
    if (distance(sx, sy, point.x, point.y) < (1 - alpha) * 2) {
      result.push(emitPoint(sx, sy, point.pressure));
      continue;
    }
    sx += (point.x - sx) * alpha;
    sy += (point.y - sy) * alpha;
    result.push(emitPoint(sx, sy, point.pressure));
  }
  return result;
}

/**
 * Smooth a freehand stroke. Deterministic and pure: the same input always returns the same output.
 *
 * `'catmull-rom'` resamples the polyline through a uniform Catmull-Rom spline (`steps` samples per
 * input segment; the first and last input points are preserved exactly). `'streamline'` applies a
 * causal exponential average with a jitter dead zone and preserves input length.
 *
 * @throws {import('./errors.js').InkConfigError} When `points` is invalid or options are out of range.
 */
export function smoothStroke(points: readonly StrokePoint[], options: SmoothStrokeOptions = {}): StrokePoint[] {
  const input = requireStrokePoints(points);
  const algorithm = options.algorithm ?? 'catmull-rom';
  if (algorithm !== 'catmull-rom' && algorithm !== 'streamline') {
    throw new InkConfigError(
      `Unknown smoothing algorithm: ${String(algorithm)}. Expected 'catmull-rom' or 'streamline'.`,
    );
  }
  const tension = requireRange(options.tension ?? 1, 'tension', 0, 1);
  const steps = requireInteger(options.steps ?? 8, 'steps', 2, 1000);
  if (input.length < 3) return input.map((point) => ({ ...point }));
  return algorithm === 'catmull-rom' ? catmullRomResample(input, tension, steps) : streamlineAverage(input, tension);
}
