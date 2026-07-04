import type { CrosshairConfig } from '../types';

import { createSvgElement, setAttributes } from '../svg/element';

export interface CrosshairState {
  hide(): void;
  /** When `false`, the crosshair follows the raw mouse position instead of snapping to the nearest datum. */
  readonly snap: boolean;
  /**
   * @param announceText Optional text describing the value at the crosshair position,
   * announced via the crosshair's ARIA live region — used when no tooltip is also shown.
   */
  show(x: number, y: number, width: number, height: number, announceText?: string): void;
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

  // Non-modal status region for screen readers — the visual crosshair lines above are
  // aria-hidden (purely decorative), so the current value is announced here instead.
  // Positioned off-canvas rather than visually hidden via CSS so it works without prism's stylesheet.
  const liveRegion = createSvgElement('text', {
    'aria-live': 'polite',
    class: 'prism-crosshair-live',
    role: 'status',
    x: -9999,
    y: -9999,
  });

  parent.appendChild(liveRegion);

  return {
    hide() {
      group.style.display = 'none';
      liveRegion.textContent = '';
    },
    show(x: number, y: number, width: number, height: number, announceText?: string) {
      group.style.display = '';

      if (vLine) setAttributes(vLine, { x1: x, x2: x, y1: 0, y2: height });

      if (hLine) setAttributes(hLine, { x1: 0, x2: width, y1: y, y2: y });

      if (announceText !== undefined) liveRegion.textContent = announceText;
    },
    snap,
  };
}
