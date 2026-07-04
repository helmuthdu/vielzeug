import { computePosition, flip, offset, shift } from '@vielzeug/orbit';

import type { Datum, Series, TooltipConfig } from '../types';

import { warn } from '../_dev';

export interface TooltipState {
  dispose(): void;
  [Symbol.dispose](): void;
  el: HTMLDivElement | null;
  hide(): void;
  show(x: number, y: number, datum: Datum, series: Series): void;
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
  // Non-modal status text — announced by assistive tech whenever content/hide state changes.
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  container.appendChild(el);

  const tooltipOffset: number = (config !== true && config?.offset) || 8;
  const render = config !== true ? config?.render : undefined;
  const sanitize = config !== true ? config?.sanitize : undefined;

  if (render && !sanitize) {
    warn(
      'createTooltip: `render` is set without `sanitize` — falling back to plain-text rendering of the returned string to avoid an XSS risk. Pass `sanitize` to render HTML.',
    );
  }

  const disposeHandle = (): void => {
    el.remove();
  };

  return {
    dispose: disposeHandle,
    el,
    hide() {
      el.style.opacity = '0';
      // Clear the live region's text too — otherwise assistive tech keeps announcing the
      // last-hovered value as "current" even after the pointer leaves the chart.
      el.textContent = '';
    },
    show(x: number, y: number, datum: Datum, series: Series) {
      if (!container.isConnected) return;

      if (render) {
        const html = render(datum, series);

        if (sanitize) {
          el.innerHTML = sanitize(html);
        } else {
          // No sanitizer provided — never inject the raw string as HTML. Render it as text instead.
          el.textContent = html;
        }
      } else {
        el.textContent = `${series.name}: ${datum.value}`;
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
    [Symbol.dispose]: disposeHandle,
  };
}
