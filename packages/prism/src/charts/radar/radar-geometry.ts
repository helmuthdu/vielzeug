import { polarX, polarY } from '../../core/polar';
import { linearScale } from '../../scales/linear';
import type { Point } from '../../svg/path';
import { estimateTextWidth } from '../../svg/text';
import type { RadarAxisConfig, RadarSeriesConfig } from '../../types';

const TWO_PI = 2 * Math.PI;

export type LabelAnchor = 'end' | 'middle' | 'start';
export type LabelBaseline = 'auto' | 'hanging' | 'middle';

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function axisAngles(count: number, startAngle = 0): number[] {
  return Array.from({ length: count }, (_, i) => startAngle + (i * TWO_PI) / count);
}

/** Per-axis `[min, max]`: axis overrides win over `domain`, which wins over a nice range around the data. */
export function resolveAxisDomains(
  axes: readonly RadarAxisConfig[],
  series: readonly RadarSeriesConfig[],
  domain?: [number, number],
): [number, number][] {
  let shared = domain;

  if (!shared) {
    const values = series.flatMap((s) => s.data.map((d) => d.value)).filter(Number.isFinite);
    const min = Math.min(0, ...values);
    const max = values.length ? Math.max(...values) : 1;

    shared = linearScale({ domain: [min, max > min ? max : min + 1], range: [0, 1] }).domain as [number, number];
  }

  return axes.map((axis) => [axis.min ?? shared[0], axis.max ?? shared[1]]);
}

export function normalize(value: number, [min, max]: readonly [number, number]): number {
  if (max === min) return 0;

  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

export function radarPoints(
  fractions: readonly number[],
  cx: number,
  cy: number,
  radius: number,
  angles: readonly number[],
): Point[] {
  return fractions.map((f, i) => ({ x: polarX(cx, radius * f, angles[i]), y: polarY(cy, radius * f, angles[i]) }));
}

/** Closed outline through every point; `rounded` uses a closed Catmull–Rom spline. */
export function closedPath(points: readonly Point[], curve: 'linear' | 'rounded' = 'linear'): string {
  const n = points.length;

  if (n === 0) return '';

  const [first] = points;

  if (curve === 'linear' || n < 3) {
    return `M${first.x},${first.y}${points
      .slice(1)
      .map((p) => `L${p.x},${p.y}`)
      .join('')}Z`;
  }

  let d = `M${first.x},${first.y}`;

  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    d += `C${p1.x + (p2.x - p0.x) / 6},${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6},${p2.y - (p3.y - p1.y) / 6} ${p2.x},${p2.y}`;
  }

  return `${d}Z`;
}

export function ringPath(
  shape: 'circle' | 'polygon',
  cx: number,
  cy: number,
  r: number,
  angles: readonly number[],
): string {
  if (r <= 0) return '';

  if (shape === 'circle') return `M${cx},${cy - r}A${r},${r} 0 1 1 ${cx},${cy + r}A${r},${r} 0 1 1 ${cx},${cy - r}Z`;

  return closedPath(
    radarPoints(
      angles.map(() => 1),
      cx,
      cy,
      r,
      angles,
    ),
  );
}

export function labelPlacement(angle: number): { anchor: LabelAnchor; baseline: LabelBaseline } {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);

  return {
    anchor: Math.abs(sin) < 0.1 ? 'middle' : sin > 0 ? 'start' : 'end',
    baseline: cos > 0.9 ? 'auto' : cos < -0.9 ? 'hanging' : 'middle',
  };
}

/** Largest radius that leaves room for the axis labels around it. */
export function fitRadius(
  width: number,
  height: number,
  labels: readonly string[],
  angles: readonly number[],
  fontSize: number,
  gap: number,
): number {
  let side = 0;

  labels.forEach((label, i) => {
    if (labelPlacement(angles[i]).anchor !== 'middle') side = Math.max(side, estimateTextWidth(label, fontSize));
  });

  const lineHeight = fontSize * 1.3;

  return Math.max(8, Math.min(width / 2 - gap - side, height / 2 - gap - lineHeight));
}

/** Index of the axis closest in angle to the offset `(dx, dy)` from the centre. */
export function nearestAxis(dx: number, dy: number, count: number, startAngle = 0): number {
  if (count === 0) return -1;

  const step = TWO_PI / count;
  const angle = (((Math.atan2(dx, -dy) - startAngle) % TWO_PI) + TWO_PI) % TWO_PI;

  return Math.round(angle / step) % count;
}
