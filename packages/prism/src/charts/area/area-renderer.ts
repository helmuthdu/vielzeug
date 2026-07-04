import type { Point } from '../../svg/path';
import type { Datum, Scale, TransitionConfig } from '../../types';

import { warn } from '../../_dev';
import { resolveEasing } from '../../animation/easing';
import { tweenNumber } from '../../animation/tween';
import { createSvgElement, setAttributes } from '../../svg/element';
import { areaPath, linePath, monotonePath, stepPath } from '../../svg/path';

export interface AreaRenderOptions {
  color: string;
  curve: 'linear' | 'monotone' | 'step';
  /** Aborted when the owning chart is disposed — stops the transition's `requestAnimationFrame` loop from rescheduling. */
  disposalSignal?: AbortSignal;
  fillOpacity: number;
  showLine: boolean;
  transition?: TransitionConfig;
}

const activeAreaAnimations = new WeakMap<SVGGElement, () => void>();
const previousPoints = new WeakMap<SVGGElement, Point[]>();

function buildLinePath(pts: Point[], curve: AreaRenderOptions['curve']): string {
  return curve === 'monotone' ? monotonePath(pts) : curve === 'step' ? stepPath(pts) : linePath(pts);
}

export function renderArea(parent: SVGGElement, points: Point[], baselineY: number, options: AreaRenderOptions): void {
  const dur = options.transition?.duration ?? (options.transition ? 300 : 0);
  const easing = resolveEasing(options.transition?.easing);

  let fill = parent.querySelector<SVGPathElement>('.prism-area-fill');

  if (!fill) {
    fill = createSvgElement('path', { class: 'prism-area-fill' });
    parent.appendChild(fill);
  }

  setAttributes(fill, { fill: options.color, 'fill-opacity': options.fillOpacity, stroke: 'none' });

  let line: SVGPathElement | null = null;

  if (options.showLine) {
    line = parent.querySelector<SVGPathElement>('.prism-area-line');

    if (!line) {
      line = createSvgElement('path', { class: 'prism-area-line', fill: 'none' });
      parent.appendChild(line);
    }

    setAttributes(line, { stroke: options.color, 'stroke-width': 2 });
  } else {
    parent.querySelector('.prism-area-line')?.remove();
  }

  if (dur === 0) {
    const bottomPoints = points.map((p) => ({ x: p.x, y: baselineY }));

    setAttributes(fill, { d: areaPath(points, bottomPoints, options.curve) });

    if (line) setAttributes(line, { d: buildLinePath(points, options.curve) });

    return;
  }

  activeAreaAnimations.get(parent)?.();

  const hasExisting = fill.hasAttribute('d');

  if (!hasExisting) {
    const bottomPoints = points.map((p) => ({ x: p.x, y: baselineY }));

    setAttributes(fill, { d: areaPath(points, bottomPoints, options.curve) });

    if (line) setAttributes(line, { d: buildLinePath(points, options.curve) });

    previousPoints.set(parent, points);

    return;
  }

  const rawFrom = previousPoints.get(parent) ?? points;
  const fromPoints: Point[] = points.map((_, i) => rawFrom[i] ?? rawFrom[rawFrom.length - 1] ?? points[i]);

  let startTime: number | null = null;

  function frame(ts: number) {
    if (options.disposalSignal?.aborted) {
      activeAreaAnimations.delete(parent);

      return;
    }

    if (startTime === null) startTime = ts;

    const t = Math.min(1, (ts - startTime) / dur);
    const e = easing(t);
    const interpolated: Point[] = points.map((to, i) => ({
      x: tweenNumber(fromPoints[i].x, to.x, e),
      y: tweenNumber(fromPoints[i].y, to.y, e),
    }));
    const interpolatedBottom = interpolated.map((p) => ({ x: p.x, y: baselineY }));

    setAttributes(fill!, { d: areaPath(interpolated, interpolatedBottom, options.curve) });

    if (line) setAttributes(line, { d: buildLinePath(interpolated, options.curve) });

    if (t < 1) {
      const id = requestAnimationFrame(frame);

      activeAreaAnimations.set(parent, () => cancelAnimationFrame(id));
    } else {
      activeAreaAnimations.delete(parent);
      previousPoints.set(parent, points);
    }
  }

  previousPoints.set(parent, fromPoints);

  const id = requestAnimationFrame(frame);

  activeAreaAnimations.set(parent, () => cancelAnimationFrame(id));
}

export function computeAreaPoints(data: Datum[], xScale: Scale<Date | number>, yScale: Scale<number>): Point[] {
  if (data.some((d) => d.key == null)) {
    warn(
      'computeAreaPoints: datum.key is null or undefined — data must use the Datum shape { key, value }. Did you pass { x, y } instead?',
    );
  } else if (data.some((d) => typeof d.key === 'string')) {
    warn('computeAreaPoints: string keys are not supported for line/area charts — use numeric or Date keys.');
  }

  return data.map((d) => ({
    x: xScale.map(d.key as Date | number),
    y: yScale.map(d.value),
  }));
}
