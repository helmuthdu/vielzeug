/** Shared deterministic fixtures for the ink test suite. */
import type { StrokePoint } from '../types.js';

/** Deterministic pseudo-jitter: no Math.random, same noise every run. */
export function noisyLine(count: number, amplitude: number): StrokePoint[] {
  const points: StrokePoint[] = [];
  for (let i = 0; i < count; i++) {
    const wobble = i % 2 === 0 ? amplitude : -amplitude;
    points.push({ x: i * 10, y: 50 + wobble });
  }
  return points;
}

/** Largest turn angle between consecutive segments; sharp corners inflate it. */
export function maxTurnAngle(points: readonly StrokePoint[]): number {
  let max = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1];
    const b = points[i];
    const c = points[i + 1];
    let delta = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x);
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    max = Math.max(max, Math.abs(delta));
  }
  return max;
}

/** RMS deviation from the ideal centerline y = 50. */
export function centerlineDeviation(points: readonly StrokePoint[]): number {
  let sum = 0;
  for (const point of points) sum += (point.y - 50) * (point.y - 50);
  return Math.sqrt(sum / points.length);
}
