import { computePosition, flip, offset, shift } from '@vielzeug/orbit';

import type { DataPoint, Series, TooltipConfig } from '../types';

export interface TooltipState {
  el: HTMLDivElement;
  hide(): void;
  show(x: number, y: number, point: DataPoint, series: Series): void;
  destroy(): void;
}

export function createTooltip(container: HTMLElement, config?: TooltipConfig | true): TooltipState {
  const el = document.createElement('div');

  el.className = 'prism-tooltip';
  el.style.position = 'fixed';
  el.style.pointerEvents = 'none';
  el.style.top = '0';
  el.style.left = '0';
  document.body.appendChild(el);

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

      const containerRect = container.getBoundingClientRect();
      const virtualRef = {
        getBoundingClientRect: () => ({
          bottom: containerRect.top + y,
          height: 0,
          left: containerRect.left + x,
          right: containerRect.left + x,
          top: containerRect.top + y,
          width: 0,
          x: containerRect.left + x,
          y: containerRect.top + y,
        }),
      };

      const { x: posX, y: posY } = computePosition(virtualRef, el, {
        middleware: [offset(tooltipOffset), flip(), shift({ padding: 8 })],
        placement: 'top',
      });

      el.style.left = `${posX}px`;
      el.style.top = `${posY}px`;
      el.style.opacity = '1';
    },
  };
}
