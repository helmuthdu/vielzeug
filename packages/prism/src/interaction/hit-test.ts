import type { Point } from '../svg/path';

export function nearestPoint(points: Point[], target: Point): { distance: number; index: number } | null {
  if (points.length === 0) return null;

  let minDist = Infinity;
  let minIdx = 0;

  for (let i = 0; i < points.length; i++) {
    const dx = points[i].x - target.x;
    const dy = points[i].y - target.y;
    const dist = dx * dx + dy * dy;

    if (dist < minDist) {
      minDist = dist;
      minIdx = i;
    }
  }

  return { distance: Math.sqrt(minDist), index: minIdx };
}

export function nearestPointX(points: Point[], targetX: number): number {
  if (points.length === 0) return -1;

  let minDist = Infinity;
  let minIdx = 0;

  for (let i = 0; i < points.length; i++) {
    const dist = Math.abs(points[i].x - targetX);

    if (dist < minDist) {
      minDist = dist;
      minIdx = i;
    }
  }

  return minIdx;
}
