import type { Point } from '../svg/path';

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
