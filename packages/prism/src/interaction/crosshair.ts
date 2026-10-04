import { createSvgElement, setAttributes } from '../svg/element';
import type { CrosshairConfig } from '../types';

export interface CrosshairState {
  hide(): void;
  show(x: number, y: number, width: number, height: number): void;
  /** When `false`, the crosshair follows the raw mouse position instead of snapping to the nearest datum. */
  readonly snap: boolean;
}

export function createCrosshair(parent: SVGGElement, config?: CrosshairConfig | true): CrosshairState {
  const showVertical = config === true || config?.vertical !== false;
  const showHorizontal = config !== true && config?.horizontal === true;
  const snap = config === true || config?.snap !== false;

  const group = createSvgElement('g', { 'aria-hidden': 'true', class: 'prism-crosshair', style: 'display:none' });

  const vLine = showVertical
    ? createSvgElement('line', { class: 'prism-crosshair-v', 'stroke-dasharray': 'var(--prism-crosshair-dash, 4 2)' })
    : null;
  const hLine = showHorizontal
    ? createSvgElement('line', { class: 'prism-crosshair-h', 'stroke-dasharray': 'var(--prism-crosshair-dash, 4 2)' })
    : null;

  if (vLine) group.appendChild(vLine);

  if (hLine) group.appendChild(hLine);

  parent.appendChild(group);

  return {
    hide() {
      group.style.display = 'none';
    },
    show(x: number, y: number, width: number, height: number) {
      group.style.display = '';

      if (vLine) setAttributes(vLine, { x1: x, x2: x, y1: 0, y2: height });

      if (hLine) setAttributes(hLine, { x1: 0, x2: width, y1: y, y2: y });
    },
    snap,
  };
}
