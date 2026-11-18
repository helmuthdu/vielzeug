/** Causal stroke stabilization: Streamline-style low-pass for use while drawing. */

import { distance, requireRange, requireStrokePoints } from './_validate.js';
import type { StrokePoint } from './types.js';

export interface StabilizeStrokeOptions {
  /**
   * How strongly the filter pulls toward each incoming sample. `0` keeps the raw input,
   * `1` is maximum smoothing. Default `0.5`.
   */
  strength?: number;
}

/**
 * Remove hand jitter from a stroke *while it is being drawn*: a causal exponential
 * average toward each incoming sample, with a jitter dead zone so straight lines stay crisp.
 *
 * Output length always equals input length, so per-point widths and metadata stay aligned with
 * the source samples. The last output point is always the last input point — the stroke ends
 * exactly where the pen lifted, never short of it. Inside the dead zone the previous smoothed
 * position repeats, but the incoming sample's `pressure` and `time` are carried through.
 *
 * Deterministic and pure: the same input always returns the same output.
 *
 * @throws {import('./errors.js').InkConfigError} When `strength` is out of range.
 */
export function stabilizeStroke(points: readonly StrokePoint[], options: StabilizeStrokeOptions = {}): StrokePoint[] {
  const input = requireStrokePoints(points);
  const strength = requireRange(options.strength ?? 0.5, 'strength', 0, 1);
  if (input.length < 2) return input.map((point) => ({ ...point }));
  // strength 0 -> alpha 1 (no smoothing); strength 1 -> alpha 0.1 (heavy smoothing).
  const alpha = 1 - strength * 0.9;
  const deadZone = (1 - alpha) * 2;
  const emit = (x: number, y: number, source: StrokePoint): StrokePoint => {
    const point: { x: number; y: number; pressure?: number; time?: number } = { x, y };
    if (source.pressure !== undefined) point.pressure = source.pressure;
    if (source.time !== undefined) point.time = source.time;
    return point;
  };

  const result: StrokePoint[] = [emit(input[0].x, input[0].y, input[0])];
  let sx = input[0].x;
  let sy = input[0].y;
  for (let i = 1; i < input.length; i++) {
    const point = input[i];
    if (i === input.length - 1) {
      // Snap to the final sample so the stroke never trails past where the pen lifted.
      result.push(emit(point.x, point.y, point));
      break;
    }
    if (distance(sx, sy, point.x, point.y) < deadZone) {
      result.push(emit(sx, sy, point));
      continue;
    }
    sx += (point.x - sx) * alpha;
    sy += (point.y - sy) * alpha;
    result.push(emit(sx, sy, point));
  }
  return result;
}
