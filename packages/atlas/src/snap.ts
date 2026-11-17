import { AtlasConfigError } from './errors.js';
import { boundsOf } from './geometry.js';
import { rectBottom, rectCenter, rectRight } from './rect.js';
import type { Point, Rect } from './shapes.js';

/** What a guide was snapped to: a grid line or another shape's anchor. */
export type SnapGuideKind = 'grid' | 'object';

/** A snap line to render: a guide with axis `'x'` sits at a fixed x position. */
export interface SnapGuide {
  axis: 'x' | 'y';
  /** Span endpoints along the guide's own axis (world coordinates). */
  from: number;
  /** Render hint: draw grid guides dashed and object guides solid. */
  kind: SnapGuideKind;
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

/** A snapped coordinate that matches a candidate anchor came from an object. */
function guideKind(position: number, candidates: readonly Rect[], axis: 'x' | 'y'): SnapGuideKind {
  for (const candidate of candidates) {
    const anchors = axis === 'x' ? xAnchors(candidate) : yAnchors(candidate);
    if (anchors.some((anchor) => anchor === position)) return 'object';
  }
  return 'grid';
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
    const kind = guideKind(xSnap.position, candidates, 'x');
    guides.push({ axis: 'x', from: span.from, kind, position: xSnap.position, to: span.to });
  }
  if (ySnap !== null) {
    const span = spanFor(ySnap.position, movedRect, candidates, 'y');
    const kind = guideKind(ySnap.position, candidates, 'y');
    guides.push({ axis: 'y', from: span.from, kind, position: ySnap.position, to: span.to });
  }
  return { delta, guides };
}

/**
 * An equal-spacing indicator. Unlike `SnapGuide.axis` (the axis the line is
 * perpendicular to), `gapAxis` is the axis the equal gaps are measured along —
 * the same axis the delta applies to. The line runs along `gapAxis` from
 * `from` to `to` at `position`; `marks` are the centers of the two equal gaps.
 */
export interface SpacingGuide {
  /** Span endpoints along `gapAxis` (world coordinates). */
  from: number;
  /** Axis the equal gaps sit on, and the axis `snapSpacing` moved the rect. */
  gapAxis: 'x' | 'y';
  /** Centers of the left/right (or top/bottom) equal gaps, drawn as markers. */
  marks: readonly [number, number];
  /** World coordinate the line sits on, on the axis perpendicular to `gapAxis`. */
  position: number;
  to: number;
}

export interface SpacingResult {
  /** Offset to apply to the moving rect; zero on an axis with no spacing snap. */
  delta: Point;
  /** Spacing guides for the axes that snapped. */
  guides: SpacingGuide[];
}

/** Overlap test on the axis perpendicular to `axis`. */
function overlapsPerpendicular(a: Rect, b: Rect, axis: 'x' | 'y'): boolean {
  return axis === 'x' ? a.y < rectBottom(b) && b.y < rectBottom(a) : a.x < rectRight(b) && b.x < rectRight(a);
}

function axisSpacingSnap(
  rect: Rect,
  candidates: readonly Rect[],
  axis: 'x' | 'y',
  threshold: number,
): (AxisSnap & { marks: readonly [number, number]; span: readonly [number, number] }) | null {
  const start = axis === 'x' ? (r: Rect) => r.x : (r: Rect) => r.y;
  const end = axis === 'x' ? (r: Rect) => rectRight(r) : (r: Rect) => rectBottom(r);
  let leftEnd = -Infinity;
  let rightStart = Infinity;
  for (const candidate of candidates) {
    if (!overlapsPerpendicular(rect, candidate, axis)) continue;
    if (end(candidate) <= start(rect) && end(candidate) > leftEnd) leftEnd = end(candidate);
    if (start(candidate) >= end(rect) && start(candidate) < rightStart) rightStart = start(candidate);
  }
  if (leftEnd === -Infinity || rightStart === Infinity) return null;
  const free = rightStart - leftEnd - (axis === 'x' ? rect.width : rect.height);
  if (free < 0) return null;
  const ideal = leftEnd + free / 2;
  const delta = ideal - start(rect);
  if (Math.abs(delta) > threshold) return null;
  const gap = free / 2;
  return {
    delta,
    marks: [leftEnd + gap / 2, rightStart - gap / 2],
    position: axis === 'x' ? rectCenter(rect).y : rectCenter(rect).x,
    span: [leftEnd, rightStart],
  };
}

/**
 * Snap a moving rect so its gaps to the nearest neighbors on each axis are
 * equal (img.ly-style spacing guides). A candidate qualifies as a neighbor on
 * an axis only when it overlaps the moving rect on the perpendicular axis.
 * Each axis snaps independently within `threshold`; use after `snapRect` finds
 * no alignment snap on that axis.
 */
export function snapSpacing(rect: Rect, options: { candidates: readonly Rect[]; threshold: number }): SpacingResult {
  const { candidates, threshold } = options;
  if (!(threshold >= 0)) {
    throw new AtlasConfigError(`threshold must be a non-negative finite number; received ${String(threshold)}.`);
  }
  let deltaX = 0;
  let deltaY = 0;
  const guides: SpacingGuide[] = [];
  const xSnap = axisSpacingSnap(rect, candidates, 'x', threshold);
  if (xSnap !== null) {
    deltaX = xSnap.delta;
    guides.push({
      from: xSnap.span[0],
      gapAxis: 'x',
      marks: xSnap.marks,
      position: xSnap.position,
      to: xSnap.span[1],
    });
  }
  const ySnap = axisSpacingSnap(rect, candidates, 'y', threshold);
  if (ySnap !== null) {
    deltaY = ySnap.delta;
    guides.push({
      from: ySnap.span[0],
      gapAxis: 'y',
      marks: ySnap.marks,
      position: ySnap.position,
      to: ySnap.span[1],
    });
  }
  return { delta: { x: deltaX, y: deltaY }, guides };
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
