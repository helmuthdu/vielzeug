import { WireConfigError } from './errors.js';
import type { CubicBezier, Point } from './types.js';

const DEFAULT_ARROWHEAD_LENGTH = 10;
const DEFAULT_ARROWHEAD_WIDTH = 6;
const DEFAULT_HIT_THRESHOLD = 4;
const BEZIER_SAMPLES = 64;

/** Evaluates the cubic bezier at raw parameter `u` in `[0, 1]`. */
function cubicAt(curve: CubicBezier, u: number): Point {
  const v = 1 - u;
  const a = v * v * v;
  const b = 3 * v * v * u;
  const c = 3 * v * u * u;
  const d = u * u * u;
  return {
    x: a * curve.from.x + b * curve.c1.x + c * curve.c2.x + d * curve.to.x,
    y: a * curve.from.y + b * curve.c1.y + c * curve.c2.y + d * curve.to.y,
  };
}

/** Options for {@link arrowhead}. */
export interface ArrowheadOptions {
  /** Distance from the tip back along the shaft. Default 10. */
  readonly length?: number;
  /** Full width of the base, perpendicular to the shaft. Default 6. */
  readonly width?: number;
}

/** Options for the hit-test helpers. */
export interface HitOptions {
  /** Maximum distance from the shape for a hit. Default 4. */
  readonly threshold?: number;
}

/** Where a point hit a shape. */
export interface HitResult {
  /** Euclidean distance from the query point to the closest point on the shape. */
  readonly distance: number;
  /** Position along the shape, normalized by arc length in `[0, 1]`. */
  readonly t: number;
}

function requirePoint(value: Point, label: string): void {
  if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    throw new WireConfigError(`Wire edit ${label} must have finite coordinates, received (${value.x}, ${value.y}).`);
  }
}

function requirePositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new WireConfigError(`Wire edit ${label} must be a finite positive number, received ${String(value)}.`);
  }
}

function requireUnitT(t: number): void {
  if (!Number.isFinite(t) || t < 0 || t > 1) {
    throw new WireConfigError(`Wire edit t must be a finite number in [0, 1], received ${String(t)}.`);
  }
}

/**
 * Build a filled triangle that caps a line at `tip`, pointing along
 * `direction`. The apex sits at `tip`; the base sits `length` behind it
 * along `-direction`, `width` apart. `direction` may be any non-zero
 * vector and is normalized internally.
 *
 * @param tip - The apex of the arrowhead.
 * @param direction - The direction the line arrives from, pointing toward the tip.
 * @param options - Head `length` (default 10) and `width` (default 6).
 * @returns `[tip, baseLeft, baseRight]` as three points.
 * @throws {@link WireConfigError} when a point is non-finite, `direction` is
 * zero, or `length`/`width` are not finite positive numbers.
 */
export function arrowhead(tip: Point, direction: Point, options: ArrowheadOptions = {}): Point[] {
  requirePoint(tip, 'arrowhead tip');
  requirePoint(direction, 'arrowhead direction');
  const magnitude = Math.hypot(direction.x, direction.y);
  if (magnitude === 0) {
    throw new WireConfigError('Wire edit arrowhead direction must be non-zero.');
  }
  const length = options.length ?? DEFAULT_ARROWHEAD_LENGTH;
  const width = options.width ?? DEFAULT_ARROWHEAD_WIDTH;
  requirePositive(length, 'arrowhead length');
  requirePositive(width, 'arrowhead width');
  const ux = direction.x / magnitude;
  const uy = direction.y / magnitude;
  // Perpendicular unit vector for the base offsets.
  const px = -uy;
  const py = ux;
  const baseX = tip.x - ux * length;
  const baseY = tip.y - uy * length;
  const half = width / 2;
  return [
    { x: tip.x, y: tip.y },
    { x: baseX + px * half, y: baseY + py * half },
    { x: baseX - px * half, y: baseY - py * half },
  ];
}

function polylineLengths(points: readonly Point[]): number[] {
  const cumulative = new Array<number>(points.length);
  cumulative[0] = 0;
  for (let i = 1; i < points.length; i++) {
    cumulative[i] = cumulative[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return cumulative;
}

function pointAtPolylineLength(points: readonly Point[], cumulative: readonly number[], target: number): Point {
  const total = cumulative[cumulative.length - 1];
  if (total === 0) {
    return { x: points[0].x, y: points[0].y };
  }
  const clamped = Math.min(Math.max(target, 0), total);
  let low = 1;
  let high = cumulative.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (cumulative[mid] < clamped) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  const start = points[low - 1];
  const end = points[low];
  const segmentLength = cumulative[low] - cumulative[low - 1];
  if (segmentLength === 0) {
    return { x: start.x, y: start.y };
  }
  const ratio = (clamped - cumulative[low - 1]) / segmentLength;
  return { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio };
}

/** Sampled arc-length lookup table for one cubic bezier. */
interface BezierTable {
  readonly cumulative: number[];
  readonly samples: Point[];
  readonly total: number;
}

function bezierTable(curve: CubicBezier): BezierTable {
  const samples = new Array<Point>(BEZIER_SAMPLES + 1);
  const cumulative = new Array<number>(BEZIER_SAMPLES + 1);
  for (let i = 0; i <= BEZIER_SAMPLES; i++) {
    samples[i] = cubicAt(curve, i / BEZIER_SAMPLES);
  }
  cumulative[0] = 0;
  for (let i = 1; i <= BEZIER_SAMPLES; i++) {
    cumulative[i] = cumulative[i - 1] + Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y);
  }
  return { cumulative, samples, total: cumulative[BEZIER_SAMPLES] };
}

/** Raw bezier parameter `u` whose sampled arc length is `target`. */
function uAtBezierLength(table: BezierTable, target: number): number {
  const clamped = Math.min(Math.max(target, 0), table.total);
  let low = 1;
  let high = BEZIER_SAMPLES;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (table.cumulative[mid] < clamped) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  const span = table.cumulative[low] - table.cumulative[low - 1];
  const ratio = span === 0 ? 0 : (clamped - table.cumulative[low - 1]) / span;
  return (low - 1 + ratio) / BEZIER_SAMPLES;
}

/** Sampled arc length up to raw parameter `u`, interpolated within its cell. */
function sampledLengthAt(table: BezierTable, u: number): number {
  const scaled = Math.min(Math.max(u, 0), 1) * BEZIER_SAMPLES;
  const cell = Math.min(Math.floor(scaled), BEZIER_SAMPLES - 1);
  const ratio = scaled - cell;
  return table.cumulative[cell] + ratio * (table.cumulative[cell + 1] - table.cumulative[cell]);
}

function requireCurve(curve: CubicBezier, label: string): void {
  requirePoint(curve.from, `${label} from`);
  requirePoint(curve.c1, `${label} c1`);
  requirePoint(curve.c2, `${label} c2`);
  requirePoint(curve.to, `${label} to`);
}

/**
 * Point on a polyline at parameter `t`, where `t` is normalized by total
 * arc length (not by segment index): `t = 0.5` is the point halfway along
 * the wire's length. Exact for polylines.
 *
 * @param points - Two or more finite points.
 * @param t - Position in `[0, 1]` along the total length.
 * @returns The point at that length. A degenerate all-duplicate polyline
 * returns its first point for every `t`.
 * @throws {@link WireConfigError} when `points` has fewer than two finite
 * points or `t` is outside `[0, 1]`.
 */
export function pointOnPolyline(points: readonly Point[], t: number): Point {
  if (points.length < 2) {
    throw new WireConfigError(`Wire edit pointOnPolyline requires at least 2 points, received ${points.length}.`);
  }
  for (let i = 0; i < points.length; i++) {
    requirePoint(points[i], `pointOnPolyline points[${i}]`);
  }
  requireUnitT(t);
  const cumulative = polylineLengths(points);
  return pointAtPolylineLength(points, cumulative, t * cumulative[cumulative.length - 1]);
}

/**
 * Point on a cubic bezier at parameter `t`, where `t` is normalized by arc
 * length: `t = 0.5` is the point halfway along the curve's drawn length,
 * not the raw bezier midpoint.
 *
 * The arc-length mapping is approximated with a fixed lookup table of 64
 * samples, so `t` is accurate to within roughly one sample cell of the
 * true length fraction — sub-pixel for typical wire sizes.
 *
 * @param curve - A cubic bezier with finite endpoints and control points.
 * @param t - Position in `[0, 1]` along the curve length.
 * @returns The point at that length. A degenerate zero-length curve returns
 * its start for every `t`.
 * @throws {@link WireConfigError} when any curve point is non-finite or `t`
 * is outside `[0, 1]`.
 */
export function pointOnBezier(curve: CubicBezier, t: number): Point {
  requireCurve(curve, 'pointOnBezier');
  requireUnitT(t);
  const table = bezierTable(curve);
  if (table.total === 0) {
    return { x: curve.from.x, y: curve.from.y };
  }
  return cubicAt(curve, uAtBezierLength(table, t * table.total));
}

function distanceToSegment(point: Point, a: Point, b: Point): { distance: number; ratio: number } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const segmentLengthSq = abx * abx + aby * aby;
  if (segmentLengthSq === 0) {
    return { distance: Math.hypot(point.x - a.x, point.y - a.y), ratio: 0 };
  }
  const ratio = Math.min(Math.max(((point.x - a.x) * abx + (point.y - a.y) * aby) / segmentLengthSq, 0), 1);
  const projX = a.x + abx * ratio;
  const projY = a.y + aby * ratio;
  return { distance: Math.hypot(point.x - projX, point.y - projY), ratio };
}

/**
 * Closest point on a polyline to `point`, parameterized by arc length.
 * Exact: every segment is tested analytically.
 *
 * @param points - Two or more finite points.
 * @param point - The query point.
 * @param options - `threshold` (default 4): the maximum distance for a hit.
 * @returns The length-normalized `t` and `distance` of the closest point, or
 * `null` when the closest point is farther away than `threshold`.
 * @throws {@link WireConfigError} when `points` has fewer than two finite
 * points, `point` is non-finite, or `threshold` is not finite positive.
 */
export function hitPolyline(points: readonly Point[], point: Point, options: HitOptions = {}): HitResult | null {
  if (points.length < 2) {
    throw new WireConfigError(`Wire edit hitPolyline requires at least 2 points, received ${points.length}.`);
  }
  for (let i = 0; i < points.length; i++) {
    requirePoint(points[i], `hitPolyline points[${i}]`);
  }
  requirePoint(point, 'hitPolyline point');
  const threshold = options.threshold ?? DEFAULT_HIT_THRESHOLD;
  requirePositive(threshold, 'hitPolyline threshold');
  const cumulative = polylineLengths(points);
  const total = cumulative[cumulative.length - 1];
  let bestDistance = Infinity;
  let bestLength = 0;
  for (let i = 1; i < points.length; i++) {
    const hit = distanceToSegment(point, points[i - 1], points[i]);
    if (hit.distance < bestDistance) {
      bestDistance = hit.distance;
      bestLength = cumulative[i - 1] + hit.ratio * (cumulative[i] - cumulative[i - 1]);
    }
  }
  if (bestDistance > threshold) {
    return null;
  }
  return { distance: bestDistance, t: total === 0 ? 0 : bestLength / total };
}

/**
 * Closest point on a cubic bezier to `point`, parameterized by arc length.
 * Uses the same 64-sample lookup table as {@link pointOnBezier}: the nearest
 * sample is refined by ternary search on the true curve, so the reported
 * `distance` is accurate; `t` carries the table's arc-length tolerance.
 *
 * @param curve - A cubic bezier with finite endpoints and control points.
 * @param point - The query point.
 * @param options - `threshold` (default 4): the maximum distance for a hit.
 * @returns The length-normalized `t` and `distance` of the closest point, or
 * `null` when the closest point is farther away than `threshold`.
 * @throws {@link WireConfigError} when any curve point is non-finite,
 * `point` is non-finite, or `threshold` is not finite positive.
 */
export function hitBezier(curve: CubicBezier, point: Point, options: HitOptions = {}): HitResult | null {
  requireCurve(curve, 'hitBezier');
  requirePoint(point, 'hitBezier point');
  const threshold = options.threshold ?? DEFAULT_HIT_THRESHOLD;
  requirePositive(threshold, 'hitBezier threshold');
  const table = bezierTable(curve);
  if (table.total === 0) {
    const distance = Math.hypot(point.x - curve.from.x, point.y - curve.from.y);
    return distance <= threshold ? { distance, t: 0 } : null;
  }
  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let i = 0; i <= BEZIER_SAMPLES; i++) {
    const distance = Math.hypot(point.x - table.samples[i].x, point.y - table.samples[i].y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  // Refine within the neighbouring samples with ternary search, clamped to the
  // curve so an endpoint sample never extrapolates past t=0 or t=1.
  let lo = Math.max(0, (bestIndex - 1) / BEZIER_SAMPLES);
  let hi = Math.min(1, (bestIndex + 1) / BEZIER_SAMPLES);
  for (let i = 0; i < 32; i++) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    const p1 = cubicAt(curve, m1);
    const p2 = cubicAt(curve, m2);
    const d1 = Math.hypot(point.x - p1.x, point.y - p1.y);
    const d2 = Math.hypot(point.x - p2.x, point.y - p2.y);
    if (d1 < d2) {
      hi = m2;
    } else {
      lo = m1;
    }
  }
  const u = (lo + hi) / 2;
  const closest = cubicAt(curve, u);
  const distance = Math.hypot(point.x - closest.x, point.y - closest.y);
  if (distance > threshold) {
    return null;
  }
  return { distance, t: sampledLengthAt(table, u) / table.total };
}
