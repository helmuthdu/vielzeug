import { AtlasConfigError } from './errors.js';
import { apply, around, multiply, rotate, scale, translate } from './matrix.js';
import { rectBottom, rectFromPoints, rectRight } from './rect.js';
import type { Matrix, Point, Rect } from './shapes.js';

/**
 * Transform for a positioned frame: `{ x, y }` places the frame's local
 * origin in world space; `rotation` (radians, clockwise on screen) and
 * `scale` pivot around `origin` (a world point, defaulting to `{ x, y }`
 * itself, which makes rotation and scale pure post-transforms of the
 * placement).
 */
export interface FrameOptions {
  /** World pivot for rotation and scale. Defaults to `{ x, y }`. */
  origin?: Point;
  /** Radians; positive is clockwise on screen. Default 0. */
  rotation?: number;
  /** Uniform number or per-axis scale. Default 1. */
  scale?: number | { x?: number; y?: number };
  /** Local→world placement. */
  x: number;
  y: number;
}

/**
 * Which edge(s) a resize handle drags, named like the eight bounding-box
 * handles: `'e'` drags the right edge, `'nw'` drags the top-left corner.
 */
export type ResizeEdges = 'e' | 'n' | 'ne' | 'nw' | 's' | 'se' | 'sw' | 'w';

export interface ResizeOptions {
  /** width/height ratio to lock. When set, the free dimension follows. */
  aspect?: number;
  /** Minimum width and height of the result. Default 0. */
  min?: number;
}

const RESIZE_EDGES: ReadonlySet<string> = new Set(['e', 'n', 'ne', 'nw', 's', 'se', 'sw', 'w']);

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) throw new AtlasConfigError(`${name} must be a finite number, received ${value}`);
}

/**
 * Local→world matrix for a frame: `around(origin, rotate · scale) · translate(x, y)`
 * (placement first, then the pivot transform). With the default origin this
 * reduces to `translate(x, y) · rotate · scale`.
 */
export function frameMatrix(options: FrameOptions): Matrix {
  assertFinite('frame.x', options.x);
  assertFinite('frame.y', options.y);
  const rotation = options.rotation ?? 0;
  assertFinite('frame.rotation', rotation);
  const rawScale = options.scale ?? 1;
  const sx = typeof rawScale === 'number' ? rawScale : (rawScale.x ?? 1);
  const sy = typeof rawScale === 'number' ? rawScale : (rawScale.y ?? sx);
  assertFinite('frame.scale', sx);
  assertFinite('frame.scale', sy);
  const origin = options.origin ?? { x: options.x, y: options.y };
  assertFinite('frame.origin.x', origin.x);
  assertFinite('frame.origin.y', origin.y);
  const local = multiply(rotate(rotation), scale(sx, sy));
  // Placement applies first, then the pivot transform: multiply(a, b) is a ∘ b.
  return multiply(around(origin, local), translate(options.x, options.y));
}

/** Axis-aligned world bounds of `rect` under `matrix`: the AABB of the four transformed corners. */
export function boundsOfFrame(rect: Rect, matrix: Matrix): Rect {
  assertFiniteRect(rect);
  for (let i = 0; i < 6; i++) assertFinite(`matrix[${i}]`, matrix[i]);
  const corners = [
    apply(matrix, { x: rect.x, y: rect.y }),
    apply(matrix, { x: rectRight(rect), y: rect.y }),
    apply(matrix, { x: rect.x, y: rectBottom(rect) }),
    apply(matrix, { x: rectRight(rect), y: rectBottom(rect) }),
  ] as const;
  return rectFromPoints(corners);
}

function assertFiniteRect(rect: Rect): void {
  assertFinite('rect.x', rect.x);
  assertFinite('rect.y', rect.y);
  assertFinite('rect.width', rect.width);
  assertFinite('rect.height', rect.height);
}

/**
 * Resizes `rect` by dragging the edge(s) named by `edges` to `point` (same
 * space as `rect`). The opposite edge(s) stay fixed. With `min`, the result
 * never collapses below that size on either axis. With `aspect`
 * (width/height), the ratio is locked: a corner drag derives the other axis
 * from the axis that moved further, an edge drag grows the free dimension
 * about its centre.
 */
export function resizeRect(rect: Rect, edges: ResizeEdges, point: Point, options: ResizeOptions = {}): Rect {
  assertFiniteRect(rect);
  assertFinite('point.x', point.x);
  assertFinite('point.y', point.y);
  if (!RESIZE_EDGES.has(edges)) {
    throw new AtlasConfigError(
      `unknown resize edges: ${String(edges)}. Expected one of ${[...RESIZE_EDGES].join(', ')}.`,
    );
  }
  const min = options.min ?? 0;
  assertFinite('min', min);
  if (min < 0) throw new AtlasConfigError(`min must be non-negative, received ${min}`);
  const aspect = options.aspect;
  if (aspect !== undefined) {
    assertFinite('aspect', aspect);
    if (aspect <= 0) throw new AtlasConfigError(`aspect must be positive, received ${aspect}`);
  }

  const dragsWest = edges.includes('w');
  const dragsEast = edges.includes('e');
  const dragsNorth = edges.includes('n');
  const dragsSouth = edges.includes('s');

  let left = rect.x;
  let right = rectRight(rect);
  let top = rect.y;
  let bottom = rectBottom(rect);
  if (dragsWest) left = Math.min(point.x, right - min);
  if (dragsEast) right = Math.max(point.x, left + min);
  if (dragsNorth) top = Math.min(point.y, bottom - min);
  if (dragsSouth) bottom = Math.max(point.y, top + min);

  if (aspect !== undefined) {
    // Clamping the driving width to max(min, min·aspect) keeps both axes ≥ min.
    const minSize = Math.max(min, min * aspect);
    const width = right - left;
    const height = bottom - top;
    const horizontalDragged = dragsWest || dragsEast;
    const verticalDragged = dragsNorth || dragsSouth;
    // The opposite edge of a dragged axis stays fixed; the free dimension of an
    // edge-only drag grows about its centre.
    const applyWidth = (w: number): void => {
      if (dragsWest) left = right - w;
      else right = left + w;
    };
    const applyHeight = (h: number): void => {
      if (dragsNorth) top = bottom - h;
      else bottom = top + h;
    };
    if (horizontalDragged && verticalDragged) {
      // Corner drag: the axis that moved further drives the other.
      const movedX = Math.max(Math.abs(right - rectRight(rect)), Math.abs(left - rect.x));
      const movedY = Math.max(Math.abs(bottom - rectBottom(rect)), Math.abs(top - rect.y));
      if (movedX >= movedY) {
        applyWidth(Math.max(width, minSize));
        applyHeight((right - left) / aspect);
      } else {
        applyHeight(Math.max(height, minSize / aspect));
        applyWidth((bottom - top) * aspect);
      }
    } else if (horizontalDragged) {
      // Re-apply the clamped width so a collapse past `min` keeps the ratio.
      const w = Math.max(width, minSize);
      applyWidth(w);
      const h = w / aspect;
      const centerY = rect.y + rect.height / 2;
      top = centerY - h / 2;
      bottom = centerY + h / 2;
    } else {
      const h = Math.max(height, minSize / aspect);
      applyHeight(h);
      const w = h * aspect;
      const centerX = rect.x + rect.width / 2;
      left = centerX - w / 2;
      right = centerX + w / 2;
    }
  }

  return { height: bottom - top, width: right - left, x: left, y: top };
}
