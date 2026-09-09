import { computePosition, flip, offset, shift } from '@vielzeug/orbit';
import type { Datum, Series, TooltipConfig } from '../types';

export interface TooltipState {
  dispose(): void;
  el: HTMLDivElement | null;
  hide(): void;
  show(x: number, y: number, datum: Datum, series: Series): void;
  [Symbol.dispose](): void;
}

export function createTooltip(container: HTMLElement, config?: TooltipConfig | true): TooltipState {
  const previousPosition = container.style.position;
  const changedPosition = getComputedStyle(container).position === 'static';

  if (changedPosition) container.style.position = 'relative';

  const el = container.ownerDocument.createElement('div');

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

  let revealFrame: number | null = null;
  let clearTimer: ReturnType<typeof setTimeout> | null = null;
  let visible = false;

  const cancelClear = (): void => {
    if (clearTimer === null) return;

    clearTimeout(clearTimer);
    clearTimer = null;
  };

  const cancelReveal = (): void => {
    if (revealFrame === null) return;

    cancelAnimationFrame(revealFrame);
    revealFrame = null;
  };

  const disposeHandle = (): void => {
    cancelReveal();
    cancelClear();
    el.remove();
    if (changedPosition && container.style.position === 'relative') container.style.position = previousPosition;
  };

  return {
    dispose: disposeHandle,
    el,
    hide() {
      cancelReveal();
      cancelClear();
      visible = false;
      el.style.opacity = '0';
      clearTimer = setTimeout(() => {
        clearTimer = null;

        if (!visible) el.textContent = '';
      }, 150);
    },
    show(x: number, y: number, datum: Datum, series: Series) {
      if (!container.isConnected) return;

      cancelClear();

      if (render) {
        const content = render(datum, series);

        if (typeof content === 'string') el.textContent = content;
        else el.replaceChildren(content);
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

      const { x: positionX, y: positionY } = computePosition(virtualRef, el, {
        containingBlock: container,
        middleware: [offset(tooltipOffset), flip(), shift({ padding: 8 })],
        placement: 'top',
      });

      el.style.left = `${positionX}px`;
      el.style.top = `${positionY}px`;

      if (visible) {
        if (revealFrame === null) el.style.opacity = '1';

        return;
      }

      visible = true;
      el.style.opacity = '0';
      revealFrame = requestAnimationFrame(() => {
        revealFrame = null;

        if (visible) el.style.opacity = '1';
      });
    },
    [Symbol.dispose]: disposeHandle,
  };
}
