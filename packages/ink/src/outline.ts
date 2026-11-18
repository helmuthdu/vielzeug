/** Closed variable-width polygon approximating a stroked path. */

import { clamp, requireFiniteNumber, requireStrokePoints } from './_validate.js';
import { InkConfigError } from './errors.js';
import type { Point, StrokePoint } from './types.js';

/** End treatment for the outline ring. */
export type StrokeCap = 'round' | 'butt' | 'square';

/** Corner treatment where the offset sides form a sharp angle. */
export type StrokeJoin = 'round' | 'bevel' | 'miter';

export interface StrokeOutlineOptions {
  /**
   * How the ring closes at each end. `round` adds a half-circle cap, `butt` adds none,
   * `square` extends each end by half the width along the tangent. Default `'round'`.
   */
  cap?: StrokeCap;
  /**
   * How sharp turns are joined on the inside of the turn. `round` keeps the plain
   * normal-offset samples (which approximate a round join), `bevel` replaces the joint
   * with the two adjacent segment-offset points, `miter` extends to the offset-line
   * intersection when within `miterLimit` and falls back to bevel otherwise. Default `'round'`.
   */
  join?: StrokeJoin;
  /**
   * Maximum ratio of miter length to half width before a `miter` join falls back to bevel.
   * Must be positive. Default `4`.
   */
  miterLimit?: number;
}

const CAPS: readonly string[] = ['round', 'butt', 'square'];
const JOINS: readonly string[] = ['round', 'bevel', 'miter'];

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

/** Unit normal of the segment `from` → `to` using the same convention as `normalAt`; null for a degenerate segment. */
function segmentNormal(from: StrokePoint, to: StrokePoint): Point | null {
  const tx = to.x - from.x;
  const ty = to.y - from.y;
  const len = Math.hypot(tx, ty);
  if (len === 0) return null;
  return { x: ty / len, y: -tx / len };
}

/**
 * Replace the naive central-tangent offset samples at sharp interior turns (angle between
 * consecutive tangents > 90°) with join geometry. `side` is `+1` for the left offsets and
 * `-1` for the right offsets. Only the inside of the turn spikes with plain offsets: there
 * the two offset edges cross, and the crossing is dropped by keeping their intersection
 * (the union vertex) instead of the naive sample. On the outside, `bevel` inserts the two
 * per-segment offset points (a flat corner) and `miter` extends to the offset-line
 * intersection while its distance from the joint stays within `miterLimit` × half width,
 * falling back to bevel beyond it. Turns at or below 90° keep the naive sample, which
 * already reads as a round join.
 */
function applyJoin(
  offsets: readonly Point[],
  input: readonly StrokePoint[],
  half: readonly number[],
  join: 'bevel' | 'miter',
  miterLimit: number,
  side: 1 | -1,
): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < offsets.length; i++) {
    if (i === 0 || i === offsets.length - 1) {
      out.push(offsets[i]);
      continue;
    }
    const prev = input[i - 1];
    const cur = input[i];
    const next = input[i + 1];
    const t1x = cur.x - prev.x;
    const t1y = cur.y - prev.y;
    const t2x = next.x - cur.x;
    const t2y = next.y - cur.y;
    const l1 = Math.hypot(t1x, t1y);
    const l2 = Math.hypot(t2x, t2y);
    const n1 = segmentNormal(prev, cur);
    const n2 = segmentNormal(cur, next);
    const cos = l1 === 0 || l2 === 0 ? 1 : (t1x * t2x + t1y * t2y) / (l1 * l2);
    const cross = t1x * t2y - t1y * t2x;
    // A turn is sharp when its tangents differ by more than 90° (cos < 0). A left turn
    // (cross < 0 in this normal convention) puts the inside on the +normal side.
    const sharp = cos < 0 && n1 !== null && n2 !== null;
    const inside = cross === 0 ? cos < 0 : cross < 0 === (side === 1);
    if (!sharp || cross === 0) {
      // Not a sharp turn, a degenerate segment, or an exact reversal (parallel offset
      // edges, no finite join vertex): keep the naive sample.
      out.push(offsets[i]);
      continue;
    }
    const h = half[i];
    // Intersection of the two offset lines on this side:
    // line 1: cur + side*n1*h + t*t1; line 2: cur + side*n2*h + u*t2.
    // t = ((side*(n2-n1)*h) × t2) / (t1 × t2), u = ((side*(n2-n1)*h) × t1) / (t1 × t2).
    const wx = side * (n2.x - n1.x) * h;
    const wy = side * (n2.y - n1.y) * h;
    const t = (wx * t2y - wy * t2x) / cross;
    const u = (wx * t1y - wy * t1x) / cross;
    const hit = { x: cur.x + side * n1.x * h + t * t1x, y: cur.y + side * n1.y * h + t * t1y };
    if (inside) {
      // The inner union vertex sits behind the joint along segment 1 and forward along
      // segment 2 (in units of the full segment vectors). If it falls outside either
      // segment's span (e.g. a spike into a very short leg), no clean join vertex exists
      // and the naive sample is kept.
      const within = t >= -1 - 1e-9 && t <= 1e-9 && u >= -1e-9 && u <= 1 + 1e-9;
      out.push(within ? hit : offsets[i]);
      continue;
    }
    // Outside of a sharp turn.
    const o1 = { x: cur.x + side * n1.x * h, y: cur.y + side * n1.y * h };
    const o2 = { x: cur.x + side * n2.x * h, y: cur.y + side * n2.y * h };
    const miterLength = Math.hypot(hit.x - cur.x, hit.y - cur.y);
    if (join === 'miter' && miterLength / h <= miterLimit) {
      out.push(hit);
    } else {
      out.push(o1, o2);
    }
  }
  return out;
}

/** Unit tangent used to square off the cap at sample `i` (the central segment direction); null when degenerate. */
function squareTangent(points: readonly StrokePoint[], i: number): Point | null {
  const last = points.length - 1;
  const from = points[clamp(i - 1, 0, last)];
  const to = points[clamp(i + 1, 0, last)];
  const tx = to.x - from.x;
  const ty = to.y - from.y;
  const len = Math.hypot(tx, ty);
  if (len === 0) return null;
  return { x: tx / len, y: ty / len };
}

/**
 * Build a closed polygon approximating the variable-width stroke through `points`.
 *
 * Each sample is offset by half its width along the local normal; the ring runs the start cap,
 * the left side forward, the end cap, and the right side backward, so it is closed without a
 * repeated final point. Pass a constant `width` for a uniform stroke, or one width per point
 * (from `strokeWidths`) for a variable one. Deterministic: identical input produces an identical ring.
 *
 * `options.cap` selects the end treatment: `'round'` half-circle caps (default), `'butt'` for
 * no cap points, `'square'` for a half-width tangent extension at each end. `options.join`
 * selects the inside-corner treatment at turns sharper than 90°: `'round'` (default) keeps the
 * plain offset samples, `'bevel'` replaces each sharp joint with the two adjacent segment-offset
 * points (dropping the crossing spike), and `'miter'` extends to the offset-line intersection
 * while the miter length stays within `options.miterLimit` × half width, falling back to bevel beyond it.
 *
 * @throws {import('./errors.js').InkConfigError} When `widths` is a mismatched array or holds non-positive values, when `cap` or `join` is not a known variant, or when `miterLimit` is not a positive finite number.
 */
export function strokeOutline(
  points: readonly StrokePoint[],
  widths: number | readonly number[],
  options: StrokeOutlineOptions = {},
): Point[] {
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
  const cap = options.cap ?? 'round';
  if (!CAPS.includes(cap)) {
    throw new InkConfigError(`Expected cap to be one of ${CAPS.join(', ')}, received ${String(cap)}.`);
  }
  const join = options.join ?? 'round';
  if (!JOINS.includes(join)) {
    throw new InkConfigError(`Expected join to be one of ${JOINS.join(', ')}, received ${String(join)}.`);
  }
  let miterLimit = 4;
  if (options.miterLimit !== undefined) {
    requireFiniteNumber(options.miterLimit, 'miterLimit');
    if (options.miterLimit <= 0) {
      throw new InkConfigError(`Expected miterLimit to be a positive finite number, received ${options.miterLimit}.`);
    }
    miterLimit = options.miterLimit;
  }

  const half: number[] = [];
  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i < input.length; i++) {
    const point = input[i];
    const h = perPoint[i] / 2;
    half.push(h);
    const normal = normalAt(input, i);
    left.push({ x: point.x + normal.x * h, y: point.y + normal.y * h });
    right.push({ x: point.x - normal.x * h, y: point.y - normal.y * h });
  }
  const leftSide = join === 'round' ? left : applyJoin(left, input, half, join, miterLimit, 1);
  const rightSide = join === 'round' ? right : applyJoin(right, input, half, join, miterLimit, -1);

  const first = input[0];
  const last = input[input.length - 1];
  const firstNormal = normalAt(input, 0);
  const lastNormal = normalAt(input, input.length - 1);

  const outline: Point[] = [];
  if (cap === 'square') {
    // Square caps: extend each end by half the width along the tangent (two extra points per end).
    const startHalf = half[0];
    const endHalf = half[half.length - 1];
    const startTangent = squareTangent(input, 0);
    const endTangent = squareTangent(input, input.length - 1);
    if (startTangent) {
      outline.push(
        { x: right[0].x - startTangent.x * startHalf, y: right[0].y - startTangent.y * startHalf },
        { x: left[0].x - startTangent.x * startHalf, y: left[0].y - startTangent.y * startHalf },
      );
    }
    outline.push(...leftSide);
    if (endTangent) {
      outline.push(
        { x: left[left.length - 1].x + endTangent.x * endHalf, y: left[left.length - 1].y + endTangent.y * endHalf },
        {
          x: right[right.length - 1].x + endTangent.x * endHalf,
          y: right[right.length - 1].y + endTangent.y * endHalf,
        },
      );
    }
    outline.push(...rightSide.reverse());
    return outline;
  }

  if (cap === 'round') {
    // Start cap: half-circle from the right offset of the first sample, around its back, to the left offset.
    appendCap(outline, first, Math.atan2(firstNormal.y, firstNormal.x) + Math.PI, half[0]);
  }
  outline.push(...leftSide);
  if (cap === 'round') {
    // End cap: half-circle from the left offset of the last sample, around its front, to the right offset.
    appendCap(outline, last, Math.atan2(lastNormal.y, lastNormal.x), half[half.length - 1]);
  }
  outline.push(...rightSide.reverse());
  return outline;
}
