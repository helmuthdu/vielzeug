import { AtlasConfigError } from './errors.js';
import { rectBottom, rectCenter, rectFromPoints, rectRight } from './rect.js';
import type { Point, Rect } from './shapes.js';

/** What a guide was snapped to: a grid line, another shape's anchor, or an equal-spacing gap. */
export type SnapGuideKind = 'grid' | 'object' | 'spacing';

/**
 * A guide line to render. `axis` names the axis the line is perpendicular to:
 * an `'x'` guide is a vertical line at `position = x`, spanning `from..to` on
 * y. Spacing guides carry `marks`: the centers of the two equal gaps, measured
 * along the span axis, drawn as markers.
 */
export interface SnapGuide {
  axis: 'x' | 'y';
  /** Span endpoints along the line's own direction (world coordinates). */
  from: number;
  /** Render hint: draw grid and spacing guides dashed, object guides solid. */
  kind: SnapGuideKind;
  /** Spacing guides only: centers of the two equal gaps, on the span axis. */
  marks?: readonly [number, number];
  /** The coordinate the line sits on, on `axis`. */
  position: number;
  to: number;
}

export interface SnapOptions {
  /** Other shapes to snap against. The moving rect itself must not be included. */
  candidates: readonly Rect[];
  /** Optional grid spacing per axis; lines run through multiples of the spacing. */
  grid?: { x?: number; y?: number };
  /**
   * Also snap for equal gaps between neighbors (img.ly-style spacing guides)
   * on each axis where no alignment snap engaged. Default false.
   */
  spacing?: boolean;
  /** Maximum world-unit distance for a snap to engage. */
  threshold: number;
}

export interface SnapResult {
  /** Offset to apply to the moving rect; zero on an axis with no snap. */
  delta: Point;
  /** Guides for the snaps that engaged, at most one per axis. */
  guides: SnapGuide[];
}

/** The three x coordinates (left, center, right) a rect can snap with. */
function xAnchors(rect: Rect): number[] {
  return [rect.x, rect.x + rect.width / 2, rectRight(rect)];
}

function yAnchors(rect: Rect): number[] {
  return [rect.y, rect.y + rect.height / 2, rectBottom(rect)];
}

/** A snap target with the kind of guide it produced. */
interface Target {
  kind: SnapGuideKind;
  value: number;
}

interface AxisSnap {
  delta: number;
  kind: SnapGuideKind;
  /** Target coordinate that produced the snap. */
  position: number;
}

function bestAxisSnap(anchors: readonly number[], targets: readonly Target[], threshold: number): AxisSnap | null {
  let best: AxisSnap | null = null;
  for (const anchor of anchors) {
    for (const target of targets) {
      const delta = target.value - anchor;
      if (Math.abs(delta) > threshold) continue;
      if (best === null || Math.abs(delta) < Math.abs(best.delta)) {
        best = { delta, kind: target.kind, position: target.value };
      }
    }
  }
  return best;
}

function gridTargets(min: number, max: number, spacing: number | undefined, threshold: number): Target[] {
  if (spacing === undefined || !Number.isFinite(spacing) || spacing <= 0) return [];
  const targets: Target[] = [];
  for (let line = Math.floor((min - threshold) / spacing) * spacing; line <= max + threshold; line += spacing) {
    targets.push({ kind: 'grid', value: line });
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
  const bounds = rectFromPoints(points) ?? { height: 0, width: 0, x: position, y: position };
  return axis === 'x' ? { from: bounds.y, to: rectBottom(bounds) } : { from: bounds.x, to: rectRight(bounds) };
}

/** Overlap test on the axis perpendicular to `axis`. */
function overlapsPerpendicular(a: Rect, b: Rect, axis: 'x' | 'y'): boolean {
  return axis === 'x' ? a.y < rectBottom(b) && b.y < rectBottom(a) : a.x < rectRight(b) && b.x < rectRight(a);
}

/**
 * Equal-gap snap along `axis`: centers the rect between the nearest
 * perpendicular-overlapping neighbors when the gaps can be made equal within
 * `threshold`. `position` is the moving rect's center on the perpendicular
 * axis; `span` and `marks` are along `axis`.
 */
function axisSpacingSnap(
  rect: Rect,
  candidates: readonly Rect[],
  axis: 'x' | 'y',
  threshold: number,
): { delta: number; marks: readonly [number, number]; position: number; span: readonly [number, number] } | null {
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
    // `rect` is the already-moved rect, so the guide sits at the position the
    // shape actually occupies after both axes snapped.
    position: axis === 'x' ? rectCenter(rect).y : rectCenter(rect).x,
    span: [leftEnd, rightStart],
  };
}

/**
 * Snap a moving rect against candidate shapes, an optional grid, and (with
 * `spacing`) equal gaps between neighbors. Each axis snaps independently to
 * the nearest alignment target within `threshold`; when an axis finds no
 * alignment snap and `spacing` is enabled, it falls back to centering the rect
 * between its nearest neighbors on that axis.
 */
export function snapRect(rect: Rect, options: SnapOptions): SnapResult {
  const { candidates, grid, spacing, threshold } = options;
  if (!(threshold >= 0)) {
    throw new AtlasConfigError(`threshold must be a non-negative finite number; received ${String(threshold)}.`);
  }
  let movedX = rect.x;
  let movedY = rect.y;
  const delta = { x: 0, y: 0 };

  const xTargets: Target[] = candidates.flatMap((candidate) =>
    xAnchors(candidate).map((value): Target => ({ kind: 'object', value })),
  );
  xTargets.push(...gridTargets(rect.x, rectRight(rect), grid?.x, threshold));
  const xSnap = bestAxisSnap(xAnchors(rect), xTargets, threshold);
  if (xSnap !== null) {
    delta.x = xSnap.delta;
    movedX += xSnap.delta;
  }

  const yTargets: Target[] = candidates.flatMap((candidate) =>
    yAnchors(candidate).map((value): Target => ({ kind: 'object', value })),
  );
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
    guides.push({ axis: 'x', from: span.from, kind: xSnap.kind, position: xSnap.position, to: span.to });
  }
  if (ySnap !== null) {
    const span = spanFor(ySnap.position, movedRect, candidates, 'y');
    guides.push({ axis: 'y', from: span.from, kind: ySnap.kind, position: ySnap.position, to: span.to });
  }

  // Equal-spacing fallback fills the axes where no alignment snap engaged.
  // It runs on the moved rect so its perpendicular position honours the other
  // axis's snap.
  if (spacing) {
    if (xSnap === null) {
      const gap = axisSpacingSnap(movedRect, candidates, 'x', threshold);
      if (gap !== null) {
        delta.x = gap.delta;
        guides.push({
          axis: 'y',
          from: gap.span[0],
          kind: 'spacing',
          marks: gap.marks,
          position: gap.position,
          to: gap.span[1],
        });
      }
    }
    if (ySnap === null) {
      const gap = axisSpacingSnap(movedRect, candidates, 'y', threshold);
      if (gap !== null) {
        delta.y = gap.delta;
        guides.push({
          axis: 'x',
          from: gap.span[0],
          kind: 'spacing',
          marks: gap.marks,
          position: gap.position,
          to: gap.span[1],
        });
      }
    }
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
  const bounds = rectFromPoints(
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
