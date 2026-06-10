import { computePosition, flip, offset, shift } from '@vielzeug/orbit';

import type { DataPoint, Series, TooltipConfig } from '../types';

export interface TooltipState {
  destroy(): void;
  el: HTMLDivElement;
  hide(): void;
  show(x: number, y: number, point: DataPoint, series: Series): void;
}

export function createTooltip(container: HTMLElement, config?: TooltipConfig | true): TooltipState {
  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }

  const el = document.createElement('div');

  el.className = 'prism-tooltip';
  el.style.position = 'absolute';
  el.style.pointerEvents = 'none';
  el.style.top = '0';
  el.style.left = '0';
  container.appendChild(el);

  const tooltipOffset: number = (config !== true && config?.offset) || 8;
  const render = config !== true ? config?.render : undefined;

  return {
    destroy() {
      el.remove();
    },
    el,
    hide() {
      el.style.opacity = '0';
    },
    show(x: number, y: number, point: DataPoint, series: Series) {
      if (render) {
        el.innerHTML = render(point, series);
      } else {
        el.textContent = `${series.name}: ${point.y}`;
      }

      const virtualRef = {
        getBoundingClientRect: () => {
          const rect = container.getBoundingClientRect();

          return {
            bottom: rect.top + y,
            height: 0,
            left: rect.left + x,
            right: rect.left + x,
            top: rect.top + y,
            width: 0,
            x: rect.left + x,
            y: rect.top + y,
          };
        },
      };

      const { x: posX, y: posY } = computePosition(virtualRef, el, {
        middleware: [offset(tooltipOffset), flip(), shift({ padding: 8 })],
        placement: 'top',
      });

      const rect = container.getBoundingClientRect();

      el.style.left = `${posX - rect.left}px`;
      el.style.top = `${posY - rect.top}px`;
      el.style.opacity = '1';
    },
  };
}
