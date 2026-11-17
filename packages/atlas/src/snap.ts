import { AtlasConfigError } from './errors.js';
import { boundsOf } from './geometry.js';
import { rectBottom, rectCenter, rectRight } from './rect.js';
import type { Point, Rect } from './shapes.js';

/** A snap line to render: a guide with axis `'x'` sits at a fixed x position. */
export interface SnapGuide {
  axis: 'x' | 'y';
  /** Span endpoints along the guide's own axis (world coordinates). */
  from: number;
  /** The coordinate the guide sits on, perpendicular to `axis`. */
  position: number;
  to: number;
}

export interface SnapOptions {
  /** Other shapes to snap against. The moving rect itself must not be included. */
  candidates: readonly Rect[];
  /** Optional grid spacing per axis; lines run through multiples of the spacing. */
  grid?: { x?: number; y?: number };
  /** Maximum world-unit distance for a snap to engage. */
  threshold: number;
}

export interface SnapResult {
  /** Offset to apply to the moving rect; zero on an axis with no snap. */
  delta: Point;
  /** Guides for the snaps that engaged, one per axis. */
  guides: SnapGuide[];
}

/** The three x coordinates (left, center, right) a rect can snap with. */
function xAnchors(rect: Rect): number[] {
  return [rect.x, rect.x + rect.width / 2, rectRight(rect)];
}

function yAnchors(rect: Rect): number[] {
  return [rect.y, rect.y + rect.height / 2, rectBottom(rect)];
}

interface AxisSnap {
  delta: number;
  /** Target coordinate that produced the snap. */
  position: number;
}

function bestAxisSnap(anchors: readonly number[], targets: readonly number[], threshold: number): AxisSnap | null {
  let best: AxisSnap | null = null;
  for (const anchor of anchors) {
    for (const target of targets) {
      const delta = target - anchor;
      if (Math.abs(delta) > threshold) continue;
      if (best === null || Math.abs(delta) < Math.abs(best.delta)) best = { delta, position: target };
    }
  }
  return best;
}

function gridTargets(min: number, max: number, spacing: number | undefined, threshold: number): number[] {
  if (spacing === undefined || !Number.isFinite(spacing) || spacing <= 0) return [];
  const targets: number[] = [];
  for (let line = Math.floor((min - threshold) / spacing) * spacing; line <= max + threshold; line += spacing) {
    targets.push(line);
  }
  return targets;
}

function spanFor(
  position: number,
  moved: Rect,
  candidates: readonly Rect[],
  axis: 'x' | 'y',
): { from: number; to: number } {
  const touching: Rect[] = [];
  for (const candidate of candidates) {
    const anchors = axis === 'x' ? xAnchors(candidate) : yAnchors(candidate);
    if (anchors.some((anchor) => anchor === position)) touching.push(candidate);
  }
  const points: Point[] = [moved, ...touching].flatMap((rect) => [
    { x: rect.x, y: rect.y },
    { x: rectRight(rect), y: rectBottom(rect) },
  ]);
  const bounds = boundsOf(points) ?? { height: 0, width: 0, x: position, y: position };
  return axis === 'x' ? { from: bounds.y, to: rectBottom(bounds) } : { from: bounds.x, to: rectRight(bounds) };
}

/**
 * Snap a moving rect against candidate shapes and an optional grid. Each axis
 * snaps independently to the nearest target within `threshold`; ties resolve
 * to the first target found at an equal distance.
 */
export function snapRect(rect: Rect, options: SnapOptions): SnapResult {
  const { candidates, grid, threshold } = options;
  if (!(threshold >= 0)) {
    throw new AtlasConfigError(`threshold must be a non-negative finite number; received ${String(threshold)}.`);
  }
  let movedX = rect.x;
  let movedY = rect.y;
  const delta = { x: 0, y: 0 };

  const xTargets = candidates.flatMap((candidate) => xAnchors(candidate));
  xTargets.push(...gridTargets(rect.x, rectRight(rect), grid?.x, threshold));
  const xSnap = bestAxisSnap(xAnchors(rect), xTargets, threshold);
  if (xSnap !== null) {
    delta.x = xSnap.delta;
    movedX += xSnap.delta;
  }

  const yTargets = candidates.flatMap((candidate) => yAnchors(candidate));
  yTargets.push(...gridTargets(rect.y, rectBottom(rect), grid?.y, threshold));
  const ySnap = bestAxisSnap(yAnchors(rect), yTargets, threshold);
  if (ySnap !== null) {
    delta.y = ySnap.delta;
    movedY += ySnap.delta;
  }

  // Guides span the union of the moved rect and every candidate sharing the snapped coordinate.
  const movedRect: Rect = { ...rect, x: movedX, y: movedY };
  const guides: SnapGuide[] = [];
  if (xSnap !== null) {
    const span = spanFor(xSnap.position, movedRect, candidates, 'x');
    guides.push({ axis: 'x', from: span.from, position: xSnap.position, to: span.to });
  }
  if (ySnap !== null) {
    const span = spanFor(ySnap.position, movedRect, candidates, 'y');
    guides.push({ axis: 'y', from: span.from, position: ySnap.position, to: span.to });
  }
  return { delta, guides };
}

/** Which edge/center line to align rects on. */
export type AlignEdge = 'left' | 'horizontal-center' | 'right' | 'top' | 'vertical-center' | 'bottom';

/**
 * Align rects on a shared line derived from their combined bounds, preserving
 * sizes. Returns new rects in input order; the input is untouched.
 */
export function alignRects(rects: readonly Rect[], edge: AlignEdge): Rect[] {
  if (rects.length === 0) return [];
  const bounds = boundsOf(
    rects.flatMap((rect) => [
      { x: rect.x, y: rect.y },
      { x: rectRight(rect), y: rectBottom(rect) },
    ]),
  );
  if (bounds === null) return [];
  return rects.map((rect) => {
    switch (edge) {
      case 'left':
        return { ...rect, x: bounds.x };
      case 'horizontal-center':
        return { ...rect, x: rectCenter(bounds).x - rect.width / 2 };
      case 'right':
        return { ...rect, x: rectRight(bounds) - rect.width };
      case 'top':
        return { ...rect, y: bounds.y };
      case 'vertical-center':
        return { ...rect, y: rectCenter(bounds).y - rect.height / 2 };
      case 'bottom':
        return { ...rect, y: rectBottom(bounds) - rect.height };
      default:
        throw new AtlasConfigError(`unknown align edge: ${String(edge)}.`);
    }
  });
}

/**
 * Equalize the gaps between rects along an axis. The outermost rects stay
 * fixed; middle rects move in sorted order along the axis. Fewer than three
 * rects are returned as copies unchanged.
 */
export function distributeRects(rects: readonly Rect[], axis: 'x' | 'y'): Rect[] {
  if (rects.length <= 2) return rects.map((rect) => ({ ...rect }));
  const start = axis === 'x' ? (rect: Rect) => rect.x : (rect: Rect) => rect.y;
  const size = axis === 'x' ? (rect: Rect) => rect.width : (rect: Rect) => rect.height;
  const order = rects
    .map((rect, index) => ({ index, rect }))
    .sort((a, b) => start(a.rect) - start(b.rect) || a.index - b.index);
  const first = order[0].rect;
  const last = order[order.length - 1].rect;
  const totalSpan = start(last) + size(last) - start(first);
  const totalSize = order.reduce((sum, entry) => sum + size(entry.rect), 0);
  const gap = (totalSpan - totalSize) / (order.length - 1);
  const result = rects.map((rect) => ({ ...rect }));
  let cursor = start(first);
  for (const entry of order) {
    const moved = { ...entry.rect };
    if (axis === 'x') moved.x = cursor;
    else moved.y = cursor;
    result[entry.index] = moved;
    cursor += size(entry.rect) + gap;
  }
  return result;
}
