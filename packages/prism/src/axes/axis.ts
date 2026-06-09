import type { AxisConfig } from '../types';

import { createSvgElement, setAttributes } from '../svg/element';
import { createTextElement } from '../svg/text';

interface AxisScale {
  map(value: unknown): number;
  ticks(count?: number): unknown[];
}

export function renderAxis(parent: SVGGElement, scale: AxisScale, config: AxisConfig, length: number): void {
  while (parent.firstChild) parent.removeChild(parent.firstChild);

  const isHorizontal = config.position === 'bottom' || config.position === 'top';
  const isInverted = config.position === 'top' || config.position === 'left';
  const tickSize = 6;
  const tickDirection = isInverted ? -1 : 1;

  const axisLine = createSvgElement('line', {
    class: 'prism-axis-line',
    x1: isHorizontal ? 0 : 0,
    x2: isHorizontal ? length : 0,
    y1: isHorizontal ? 0 : 0,
    y2: isHorizontal ? 0 : length,
  });

  parent.appendChild(axisLine);

  const ticks = scale.ticks(config.tickCount ?? 10);
  const format = config.tickFormat ?? String;

  for (const tick of ticks) {
    const pos = scale.map(tick);
    const tickLine = createSvgElement('line', {
      class: 'prism-axis-tick',
      x1: isHorizontal ? pos : 0,
      x2: isHorizontal ? pos : tickSize * tickDirection,
      y1: isHorizontal ? 0 : pos,
      y2: isHorizontal ? tickSize * tickDirection : pos,
    });

    parent.appendChild(tickLine);

    const label = createTextElement(format(tick), {
      class: 'prism-axis-label',
      'dominant-baseline': isHorizontal ? (isInverted ? 'auto' : 'hanging') : 'middle',
      'text-anchor': isHorizontal ? 'middle' : isInverted ? 'end' : 'start',
      x: isHorizontal ? pos : tickSize * tickDirection * 1.5,
      y: isHorizontal ? tickSize * tickDirection * 1.5 : pos,
    });

    parent.appendChild(label);
  }

  if (config.label) {
    const labelEl = createTextElement(config.label, {
      class: 'prism-axis-title',
      'dominant-baseline': 'middle',
      'text-anchor': 'middle',
    });

    if (isHorizontal) {
      setAttributes(labelEl, { x: length / 2, y: tickSize * tickDirection * 3.5 });
    } else {
      setAttributes(labelEl, {
        transform: `translate(${tickSize * tickDirection * 4}, ${length / 2}) rotate(-90)`,
      });
    }

    parent.appendChild(labelEl);
  }
}
