import type { Point, Rect } from './_shapes.js';
import { rectFromPoints } from './rect.js';

/**
 * Oriented bounding box: a rect rotated by `rotation` radians (positive clockwise on
 * screen) around its center.
 */
export type OBB = Readonly<{ x: number; y: number; width: number; height: number; rotation: number }>;

export function obbFromRect(rect: Rect, rotation = 0): OBB {
  return { height: rect.height, rotation, width: rect.width, x: rect.x, y: rect.y };
}

export function obbCenter(obb: OBB): Point {
  return { x: obb.x + obb.width / 2, y: obb.y + obb.height / 2 };
}

/** The four corners in world space, starting at the local top-left, clockwise on screen. */
export function obbCorners(obb: OBB): readonly [Point, Point, Point, Point] {
  const center = obbCenter(obb);
  const cos = Math.cos(obb.rotation);
  const sin = Math.sin(obb.rotation);
  const hx = obb.width / 2;
  const hy = obb.height / 2;
  const local: readonly Point[] = [
    { x: -hx, y: -hy },
    { x: hx, y: -hy },
    { x: hx, y: hy },
    { x: -hx, y: hy },
  ];
  return local.map((point) => ({
    x: center.x + point.x * cos - point.y * sin,
    y: center.y + point.x * sin + point.y * cos,
  })) as [Point, Point, Point, Point];
}

export function obbBounds(obb: OBB): Rect {
  const bounds = rectFromPoints(obbCorners(obb));
  if (!bounds) throw new Error('OBB corners must not be empty');
  return bounds;
}

/** Point test via inverse rotation into the box's local frame. */
export function pointInOBB(obb: OBB, point: Point): boolean {
  const center = obbCenter(obb);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const cos = Math.cos(-obb.rotation);
  const sin = Math.sin(-obb.rotation);
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;
  return Math.abs(localX) <= obb.width / 2 && Math.abs(localY) <= obb.height / 2;
}

/** Separating-axis theorem for two oriented boxes. */
export function obbsIntersect(a: OBB, b: OBB): boolean {
  const axes: readonly Point[] = [
    { x: Math.cos(a.rotation), y: Math.sin(a.rotation) },
    { x: -Math.sin(a.rotation), y: Math.cos(a.rotation) },
    { x: Math.cos(b.rotation), y: Math.sin(b.rotation) },
    { x: -Math.sin(b.rotation), y: Math.cos(b.rotation) },
  ];
  const cornersA = obbCorners(a);
  const cornersB = obbCorners(b);
  for (const axis of axes) {
    let minA = Infinity;
    let maxA = -Infinity;
    let minB = Infinity;
    let maxB = -Infinity;
    for (const corner of cornersA) {
      const proj = corner.x * axis.x + corner.y * axis.y;
      if (proj < minA) minA = proj;
      if (proj > maxA) maxA = proj;
    }
    for (const corner of cornersB) {
      const proj = corner.x * axis.x + corner.y * axis.y;
      if (proj < minB) minB = proj;
      if (proj > maxB) maxB = proj;
    }
    if (maxA <= minB || maxB <= minA) return false;
  }
  return true;
}

/** Axis-aligned box vs oriented box: delegates to SAT with the rect at zero rotation. */
export function rectIntersectsOBB(rect: Rect, obb: OBB): boolean {
  return obbsIntersect(obbFromRect(rect), obb);
}
