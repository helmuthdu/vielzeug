import { computePosition, flip, getClippingAncestorRect, offset, type Rect, shift } from '@vielzeug/orbit';
import type { Datum, Series, TooltipConfig } from '../types';

export interface TooltipRow {
  color: string;
  name: string;
  value: string;
}

/** Inline so the spoken text stays hidden even without prism's stylesheet. */
const SCREEN_READER_ONLY =
  'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap';

/**
 * The shift boundary: the chart container intersected with the tooltip's clipping-ancestor
 * rect (what a host `overflow: hidden` actually shows). Clamping to the container alone would
 * let the tooltip sit inside a container that is itself clipped by a smaller ancestor; the
 * intersection keeps it inside what is actually visible. A degenerate intersection (zero area)
 * falls back to the container rect.
 */
function shiftBoundary(container: HTMLElement, tooltip: HTMLElement): Rect {
  const box = container.getBoundingClientRect();
  const containerRect: Rect = { height: box.height, width: box.width, x: box.x, y: box.y };
  const visible = getClippingAncestorRect(tooltip);
  const x = Math.max(containerRect.x, visible.x);
  const y = Math.max(containerRect.y, visible.y);
  const right = Math.min(containerRect.x + containerRect.width, visible.x + visible.width);
  const bottom = Math.min(containerRect.y + containerRect.height, visible.y + visible.height);

  if (right <= x || bottom <= y) return containerRect;

  return { height: bottom - y, width: right - x, x, y };
}

/**
 * Title plus one swatch row per series; text only, so data is never parsed as HTML.
 * `spoken` is what the tooltip's live region announces; the visual rows are aria-hidden.
 */
export function comparisonContent(
  doc: Document,
  title: string,
  rows: readonly TooltipRow[],
  spoken: string,
): HTMLElement {
  const body = doc.createElement('div');
  const sr = doc.createElement('span');
  const visual = doc.createElement('div');
  const head = doc.createElement('div');

  body.className = 'prism-tooltip-body';
  sr.className = 'prism-tooltip-sr';
  sr.style.cssText = SCREEN_READER_ONLY;
  sr.textContent = spoken;
  visual.setAttribute('aria-hidden', 'true');
  head.className = 'prism-tooltip-title';
  head.textContent = title;
  visual.appendChild(head);

  for (const row of rows) {
    const line = doc.createElement('div');
    const swatch = doc.createElement('span');
    const name = doc.createElement('span');
    const value = doc.createElement('span');

    line.className = 'prism-tooltip-row';
    swatch.className = 'prism-tooltip-swatch';
    swatch.style.setProperty('--prism-swatch', row.color);
    name.className = 'prism-tooltip-name';
    name.textContent = row.name;
    value.className = 'prism-tooltip-value';
    value.textContent = row.value;
    line.append(swatch, name, value);
    visual.appendChild(line);
  }

  body.append(sr, visual);

  return body;
}

export interface TooltipState {
  dispose(): void;
  el: HTMLDivElement | null;
  hide(): void;
  /** `content` replaces the default `series: value` body when no custom `render` is configured. */
  show(x: number, y: number, datum: Datum, series: Series, content?: Node | string): void;
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
  // Non-modal status text: announced by assistive tech whenever content/hide state changes.
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  container.appendChild(el);

  const tooltipOffset: number = (config !== true && config?.offset) || 8;
  const render = config !== true ? config?.render : undefined;

  // Opacity stays inline (the transition is declared in CSS against the token
  // duration); the class carries the rise, which needs to combine with the
  // left/top positioning without fighting it.
  const setVisible = (next: boolean): void => {
    el.classList.toggle('prism-tooltip--visible', next);
    el.style.opacity = next ? '1' : '0';
  };

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
      setVisible(false);
      clearTimer = setTimeout(() => {
        clearTimer = null;

        if (!visible) el.textContent = '';
      }, 150);
    },
    show(x: number, y: number, datum: Datum, series: Series, content?: Node | string) {
      if (!container.isConnected) return;

      cancelClear();

      const body = render ? render(datum, series) : (content ?? `${series.name}: ${datum.value}`);

      if (typeof body === 'string') el.textContent = body;
      else el.replaceChildren(body);

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
        middleware: [offset(tooltipOffset), flip(), shift({ boundary: shiftBoundary(container, el), padding: 8 })],
        placement: 'top',
      });

      el.style.left = `${positionX}px`;
      el.style.top = `${positionY}px`;

      if (visible) {
        if (revealFrame === null) setVisible(true);

        return;
      }

      visible = true;
      setVisible(false);
      // One frame at the hidden state first: without it the browser has no
      // starting value to transition from and the tooltip would just appear.
      revealFrame = requestAnimationFrame(() => {
        revealFrame = null;

        if (visible) setVisible(true);
      });
    },
    [Symbol.dispose]: disposeHandle,
  };
}
