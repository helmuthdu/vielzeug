import type { Point } from '../../svg/path';
import type { Scale, TransitionConfig, XScale } from '../../types';

import { createSvgElement, setAttributes } from '../../svg/element';
import { areaPath, linePath, monotonePath, stepPath } from '../../svg/path';

export interface AreaRenderOptions {
  color: string;
  curve: 'linear' | 'monotone' | 'step';
  fillOpacity: number;
  showLine: boolean;
  transition?: TransitionConfig;
}

function cssEasing(t: TransitionConfig['easing']): string {
  if (!t || t === 'ease-out') return 'ease-out';

  if (typeof t === 'function') return 'ease-out';

  return t;
}

export function renderArea(parent: SVGGElement, points: Point[], baselineY: number, options: AreaRenderOptions): void {
  const bottomPoints = points.map((p) => ({ x: p.x, y: baselineY }));
  const dur = options.transition?.duration ?? (options.transition ? 300 : 0);
  const ease = cssEasing(options.transition?.easing);
  const cssTransition = dur > 0 ? `d ${dur}ms ${ease}` : '';

  let fill = parent.querySelector<SVGPathElement>('.prism-area-fill');

  if (!fill) {
    fill = createSvgElement('path', { class: 'prism-area-fill' });
    parent.appendChild(fill);
  }

  fill.style.transition = cssTransition;
  setAttributes(fill, {
    d: areaPath(points, bottomPoints),
    fill: options.color,
    'fill-opacity': options.fillOpacity,
    stroke: 'none',
  });

  if (options.showLine) {
    const pathD =
      options.curve === 'monotone'
        ? monotonePath(points)
        : options.curve === 'step'
          ? stepPath(points)
          : linePath(points);

    let line = parent.querySelector<SVGPathElement>('.prism-area-line');

    if (!line) {
      line = createSvgElement('path', { class: 'prism-area-line', fill: 'none' });
      parent.appendChild(line);
    }

    line.style.transition = cssTransition;
    setAttributes(line, { d: pathD, stroke: options.color, 'stroke-width': 2 });
  } else {
    parent.querySelector('.prism-area-line')?.remove();
  }
}

export function computeAreaPoints(
  data: { x: Date | number | string; y: number }[],
  xScale: XScale,
  yScale: Scale<number>,
): Point[] {
  return data.map((d) => ({
    x: (xScale as Scale<Date | number>).map(d.x as Date | number),
    y: yScale.map(d.y),
  }));
}
