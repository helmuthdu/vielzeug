import type { GridConfig } from '../types';

import { createSvgElement, removeChildren } from '../svg/element';
import { type AnyScale, mapTick } from './scale-utils';

export function renderGrid(
  parent: SVGGElement,
  scale: AnyScale,
  config: GridConfig | true,
  crossLength: number,
  direction: 'horizontal' | 'vertical',
  tickCount = 10,
): void {
  removeChildren(parent);

  const color = (config !== true && config.color) || undefined;
  const dash = (config !== true && config.dash) || undefined;
  const ticks = scale.ticks(tickCount);

  for (const tick of ticks) {
    const pos = mapTick(scale, tick);
    const attrs: Record<string, number | string | undefined> = {
      class: 'prism-grid-line',
      stroke: color ?? 'var(--prism-grid-color)',
      'stroke-dasharray': dash,
      'stroke-opacity': 'var(--prism-grid-opacity)',
    };

    if (direction === 'vertical') {
      Object.assign(attrs, { x1: pos, x2: pos, y1: 0, y2: crossLength });
    } else {
      Object.assign(attrs, { x1: 0, x2: crossLength, y1: pos, y2: pos });
    }

    parent.appendChild(createSvgElement('line', attrs));
  }
}
