/** Velocity- and pressure-modulated stroke widths. */

import {
  clamp,
  distance,
  requireFiniteNumber,
  requirePositive,
  requireRange,
  requireStrokePoints,
} from './_validate.js';
import { InkConfigError } from './errors.js';
import type { StrokePoint } from './types.js';

export interface StrokeTaperOptions {
  /**
   * Fade-out LENGTH measured along arc length from the last point, in the same units as
   * `width`. Symmetric to `start`. Default `0` (no fade-out).
   */
  end?: number;
  /**
   * Fade-in LENGTH measured along arc length from the first point, in the same units as
   * `width`. Within the first `start` units the width is multiplied by a smoothstep ramp
   * rising from `0.15` to `1`. Default `0` (no fade-in).
   */
  start?: number;
}

export interface StrokeWidthOptions {
  /** Pen speed treated as "neutral", in pixels per millisecond. Default `0.5`. */
  referenceSpeed?: number;
  /**
   * When `true` and the stroke is timed, synthesize pressure for points that have NO `pressure`
   * from an in/out smoothstep ramp over arc length: the width multiplier drops to `0.5` at each
   * tip (pressure ramps from `0` to neutral `0.5`) so mouse strokes thin at the ends. Points that
   * DO carry `pressure` always use their real value; untimed strokes ignore this option.
   * Default `false`.
   */
  simulatePressure?: boolean;
  /**
   * Taper the stroke ends: fade the width in over `taper.start` and out over `taper.end`
   * units of arc length, multiplying the velocity/pressure profile by a smoothstep ramp that
   * bottoms out at `0.15` of full width. Applied on top of (not instead of) speed and pressure.
   */
  taper?: StrokeTaperOptions;
  /** How strongly speed modulates width: `0` disables velocity, `1` is fully inverse-proportional. Default `0.5`. */
  thinning?: number;
  /** Width at reference speed with neutral pressure. Must be positive. */
  width: number;
}

/** Fixed velocity-scale range; slow strokes at most double, fast strokes at most quarter. */
const MIN_SCALE = 0.25;
const MAX_SCALE = 2;

/** Width multiplier at the very tip of a taper. */
const TAPER_FLOOR = 0.15;
/** Synthesized pressure at the very tip of a simulated-pressure ramp (maps to 0.5x width). */
const PRESSURE_FLOOR = 0;
/** Fraction of total arc length (each end) over which simulated pressure ramps. */
const PRESSURE_RAMP_FRACTION = 0.15;

/** Smoothstep on `[0, 1]`: `3t² - 2t³`, clamped outside the range. */
function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

/** Cumulative arc length at each point, starting at `0`. */
function arcLengths(points: readonly StrokePoint[]): number[] {
  const cum: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(cum[i - 1] + distance(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y));
  }
  return cum;
}

/** Validate a taper length option: finite and non-negative. */
function requireTaperLength(value: number, name: string): number {
  requireFiniteNumber(value, name);
  if (value < 0) {
    throw new InkConfigError(`Expected ${name} to be non-negative, received ${value}.`);
  }
  return value;
}

/**
 * Pressure response curve, clamped to `[0, 1]`:
 * `0.5` (the neutral value a mouse reports) maps to exactly `1`, so a stroke with
 * neutral pressure is as wide as one without pressure data. Range: `[0.5, 1.25]`.
 */
function pressureScale(pressure: number): number {
  const p = clamp(pressure, 0, 1);
  return p <= 0.5 ? 0.5 + p : 1 + (p - 0.5) * 0.5;
}

/**
 * Compute one width per stroke point from pen speed and optional pressure.
 *
 * Speed is `distance / Δtime` between consecutive points, which stays correct after any
 * smoothing, stabilization, or simplification — the pipeline order no longer matters. When any
 * point lacks `time`, or a Δtime is zero, velocity modulation is disabled for the whole stroke
 * (width becomes `width × pressure`) instead of falling back to a spacing proxy that resampling
 * would distort. Slow widens, fast narrows, clamped to a fixed `[0.25, 2]` scale.
 *
 * The first point uses the forward segment; degenerate (zero-length) segments keep the previous
 * scale so stationary samples do not spike.
 *
 * `taper` fades the width in over `taper.start` and out over `taper.end` units of arc length
 * (smoothstep ramp, floor `0.15`), multiplying whatever the speed/pressure profile produced, so
 * a tapered stroke still responds to speed in its body. `simulatePressure` fills in pressure for
 * points that lack it on a timed stroke, ramping the width multiplier from `0.5` at each tip to
 * neutral across the first and last 15% of arc length; points with real `pressure` are never
 * overridden.
 *
 * @throws {import('./errors.js').InkConfigError} When options are out of range or `points` is empty.
 */
export function strokeWidths(points: readonly StrokePoint[], options: StrokeWidthOptions): number[] {
  const input = requireStrokePoints(points, 1);
  const width = requirePositive(options.width, 'width');
  const thinning = requireRange(options.thinning ?? 0.5, 'thinning', 0, 1);
  const referenceSpeed = requirePositive(options.referenceSpeed ?? 0.5, 'referenceSpeed');
  const taperStart = requireTaperLength(options.taper?.start ?? 0, 'taper.start');
  const taperEnd = requireTaperLength(options.taper?.end ?? 0, 'taper.end');

  // Velocity needs a timestamp on every point; otherwise it is off for the whole stroke.
  const timed = input.every((point) => point.time !== undefined);
  // Simulated pressure only makes sense on a timed stroke, and never overrides real pressure.
  const simulate = options.simulatePressure === true && timed;

  const needArc = taperStart > 0 || taperEnd > 0 || simulate;
  const cum = needArc ? arcLengths(input) : null;
  const total = cum ? cum[cum.length - 1] : 0;
  const pressureRamp = total * PRESSURE_RAMP_FRACTION;

  const widths: number[] = [];
  let lastScale = 1;
  for (let i = 0; i < input.length; i++) {
    if (timed && thinning > 0) {
      const point = input[i];
      const next = input[i + 1];
      // First point looks forward; the rest look at the segment they arrived on.
      const from = i > 0 ? input[i - 1] : point;
      const to = i > 0 ? point : next;
      if (to) {
        const dt = Math.abs((to.time as number) - (from.time as number));
        if (dt > 0) {
          const speed = distance(from.x, from.y, to.x, to.y) / dt;
          // Slow (speed < reference) widens: scale = (referenceSpeed / speed) ^ thinning.
          lastScale = clamp((referenceSpeed / speed) ** thinning, MIN_SCALE, MAX_SCALE);
        }
      }
    }

    let pressure = input[i].pressure;
    if (pressure === undefined && cum !== null && simulate && pressureRamp > 0) {
      // Ramp from PRESSURE_FLOOR at each tip up to neutral (0.5) in the body.
      const s = cum[i];
      const ramp = Math.min(smoothstep(s / pressureRamp), smoothstep((total - s) / pressureRamp));
      pressure = PRESSURE_FLOOR + (0.5 - PRESSURE_FLOOR) * ramp;
    }
    const pressureFactor = pressure === undefined ? 1 : pressureScale(pressure);

    let taperFactor = 1;
    if (cum && (taperStart > 0 || taperEnd > 0)) {
      const s = cum[i];
      if (taperStart > 0 && s < taperStart) {
        taperFactor = TAPER_FLOOR + (1 - TAPER_FLOOR) * smoothstep(s / taperStart);
      }
      const remaining = total - s;
      if (taperEnd > 0 && remaining < taperEnd) {
        const endFactor = TAPER_FLOOR + (1 - TAPER_FLOOR) * smoothstep(remaining / taperEnd);
        taperFactor = Math.min(taperFactor, endFactor);
      }
    }

    widths.push(width * lastScale * pressureFactor * taperFactor);
  }
  return widths;
}
