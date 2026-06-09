import type { GridConfig } from '../types';

import { createSvgElement } from '../svg/element';

interface GridScale {
  map(value: unknown): number;
  ticks(count?: number): unknown[];
}

export function renderGrid(
  parent: SVGGElement,
  scale: GridScale,
  config: GridConfig | true,
  _length: number,
  crossLength: number,
  direction: 'horizontal' | 'vertical',
): void {
  while (parent.firstChild) parent.removeChild(parent.firstChild);

  const color = (config !== true && config.color) || undefined;
  const dash = (config !== true && config.dash) || undefined;
  const ticks = scale.ticks(10);

  for (const tick of ticks) {
    const pos = scale.map(tick);
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
