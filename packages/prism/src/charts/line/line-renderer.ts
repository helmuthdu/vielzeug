import type { Point } from '../../svg/path';
import type { Datum, Scale, TransitionConfig } from '../../types';

import { warn } from '../../_dev';
import { resolveEasing } from '../../animation/easing';
import { tweenNumber } from '../../animation/tween';
import { createSvgElement, setAttributes } from '../../svg/element';
import { linePath, monotonePath, stepPath } from '../../svg/path';

export interface LineRenderOptions {
  color: string;
  curve: 'linear' | 'monotone' | 'step';
  /** Aborted when the owning chart is disposed — stops the transition's `requestAnimationFrame` loop from rescheduling. */
  disposalSignal?: AbortSignal;
  pointRadius: number;
  showPoints: boolean;
  strokeWidth: number;
  transition?: TransitionConfig;
}

const activeAnimations = new WeakMap<SVGGElement, () => void>();

function buildPath(pts: Point[], curve: LineRenderOptions['curve']): string {
  return curve === 'monotone' ? monotonePath(pts) : curve === 'step' ? stepPath(pts) : linePath(pts);
}

export function renderLine(parent: SVGGElement, points: Point[], options: LineRenderOptions): void {
  const dur = options.transition?.duration ?? (options.transition ? 300 : 0);
  const easing = resolveEasing(options.transition?.easing);

  let path = parent.querySelector<SVGPathElement>('.prism-line-path');

  if (!path) {
    path = createSvgElement('path', { class: 'prism-line-path', fill: 'none' });
    parent.appendChild(path);
  }

  setAttributes(path, { stroke: options.color, 'stroke-width': options.strokeWidth });

  let dotsGroup = parent.querySelector<SVGGElement>('.prism-line-dots');

  if (options.showPoints) {
    if (!dotsGroup) {
      dotsGroup = createSvgElement('g', { class: 'prism-line-dots' });
      parent.appendChild(dotsGroup);
    }
  } else if (dotsGroup) {
    dotsGroup.remove();
    dotsGroup = null;
  }

  if (dur === 0) {
    setAttributes(path, { d: buildPath(points, options.curve) });

    if (dotsGroup) {
      while (dotsGroup.children.length > points.length) dotsGroup.removeChild(dotsGroup.lastChild!);

      for (let i = 0; i < points.length; i++) {
        let c = dotsGroup.children[i] as SVGCircleElement | undefined;

        if (!c) {
          c = createSvgElement('circle', { class: 'prism-line-dot' });
          dotsGroup.appendChild(c);
        }

        setAttributes(c, { cx: points[i].x, cy: points[i].y, fill: options.color, r: options.pointRadius });
      }
    }

    return;
  }

  activeAnimations.get(parent)?.();

  const hasExisting = !!path.getAttribute('d');

  const fromPts: Point[] = [];
  let lastKnown: Point | null = null;

  if (dotsGroup) {
    const existingCount = dotsGroup.children.length;

    for (let i = 0; i < existingCount; i++) {
      const c = dotsGroup.children[i] as SVGCircleElement;
      const pt = { x: Number(c.getAttribute('cx')), y: Number(c.getAttribute('cy')) };

      fromPts.push(pt);
      lastKnown = pt;
    }

    while (dotsGroup.children.length > points.length) dotsGroup.removeChild(dotsGroup.lastChild!);

    for (let i = dotsGroup.children.length; i < points.length; i++) {
      const c = createSvgElement('circle', { class: 'prism-line-dot' });

      setAttributes(c, { cx: points[i].x, cy: points[i].y, fill: options.color, r: options.pointRadius });
      dotsGroup.appendChild(c);
    }
  }

  for (let i = fromPts.length; i < points.length; i++) {
    fromPts.push(lastKnown ?? points[i]);
  }

  let startTime: number | null = null;

  function frame(ts: number) {
    if (options.disposalSignal?.aborted) {
      activeAnimations.delete(parent);

      return;
    }

    if (startTime === null) startTime = ts;

    const t = Math.min(1, (ts - startTime) / dur);
    const e = easing(t);
    const interpolated: Point[] = points.map((to, i) => {
      const from = fromPts[i] ?? to;

      return { x: tweenNumber(from.x, to.x, e), y: tweenNumber(from.y, to.y, e) };
    });

    setAttributes(path!, { d: buildPath(interpolated, options.curve) });

    if (dotsGroup) {
      for (let i = 0; i < points.length; i++) {
        const c = dotsGroup.children[i] as SVGCircleElement | undefined;

        if (c) setAttributes(c, { cx: interpolated[i].x, cy: interpolated[i].y });
      }
    }

    if (t < 1) {
      const id = requestAnimationFrame(frame);

      activeAnimations.set(parent, () => cancelAnimationFrame(id));
    } else {
      activeAnimations.delete(parent);
    }
  }

  if (!hasExisting) {
    setAttributes(path, { d: buildPath(points, options.curve) });
  } else {
    const id = requestAnimationFrame(frame);

    activeAnimations.set(parent, () => cancelAnimationFrame(id));
  }
}

export function computePoints(data: Datum[], xScale: Scale<Date | number>, yScale: Scale<number>): Point[] {
  if (data.some((d) => d.key == null)) {
    warn(
      'computePoints: datum.key is null or undefined — data must use the Datum shape { key, value }. Did you pass { x, y } instead?',
    );
  } else if (data.some((d) => typeof d.key === 'string')) {
    warn('computePoints: string keys are not supported for line/area charts — use numeric or Date keys.');
  }

  return data.map((d) => ({
    x: xScale.map(d.key as Date | number),
    y: yScale.map(d.value),
  }));
}
