import type { Point } from '../../svg/path';
import type { Scale, TransitionConfig, XScale } from '../../types';

import { warn } from '../../_warn';
import { resolveEasing } from '../../animation/easing';
import { tweenNumber } from '../../animation/tween';
import { createSvgElement, setAttributes } from '../../svg/element';
import { linePath, monotonePath, stepPath } from '../../svg/path';

export interface LineRenderOptions {
  color: string;
  curve: 'linear' | 'monotone' | 'step';
  pointRadius: number;
  showPoints: boolean;
  strokeWidth: number;
  transition?: TransitionConfig;
}

const activeAnimations = new WeakMap<SVGGElement, number>();

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

  const prevRafId = activeAnimations.get(parent);

  if (prevRafId !== undefined) cancelAnimationFrame(prevRafId);

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
      activeAnimations.set(parent, requestAnimationFrame(frame));
    } else {
      activeAnimations.delete(parent);
    }
  }

  if (!hasExisting) {
    setAttributes(path, { d: buildPath(points, options.curve) });
  } else {
    activeAnimations.set(parent, requestAnimationFrame(frame));
  }
}

export function computePoints(
  data: { x: Date | number | string; y: number }[],
  xScale: XScale,
  yScale: Scale<number>,
): Point[] {
  return data.map((d) => {
    if (typeof d.x === 'string') {
      warn(
        `computePoints: x value "${d.x}" is a string — use bandScale for categorical data or a numeric/Date x value for line/area charts`,
      );
    }

    return {
      x: (xScale as Scale<Date | number>).map(d.x as Date | number),
      y: yScale.map(d.y),
    };
  });
}
