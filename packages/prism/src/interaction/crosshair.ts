import { createSvgElement, setAttributes } from '../svg/element';
import type { CrosshairConfig } from '../types';

export interface CrosshairState {
  hide(): void;
  show(x: number, y: number, width: number, height: number): void;
  /** When `false`, the crosshair follows the raw mouse position instead of snapping to the nearest datum. */
  readonly snap: boolean;
}

/**
 * Guide lines for the hovered position. Each line is drawn at the origin and placed
 * with a `transform`, so the CSS transition on `transform` glides a snapped guide to
 * the next datum. (`x1`/`y1` are not animatable CSS geometry properties, so the
 * position has to live in the transform.) Because the group starts `display: none`,
 * the first show places the guide instantly instead of sliding it in from the origin.
 */
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

      if (vLine) {
        setAttributes(vLine, { x1: 0, x2: 0, y1: 0, y2: height });
        vLine.style.transform = `translateX(${x}px)`;
      }

      if (hLine) {
        setAttributes(hLine, { x1: 0, x2: width, y1: 0, y2: 0 });
        hLine.style.transform = `translateY(${y}px)`;
      }
    },
    snap,
  };
}
