import { warn } from './_dev';
import { createDisposable } from './_shared';
import { type Disposable } from './types';

export interface TouchInputOptions {
  /**
   * Renders visual feedback for a touch drag. Return `null` to keep the source item visible
   * instead of rendering a preview. Dnd clones the returned element, preserving caller-owned DOM.
   * The default is an inert outline sized to the source item.
   */
  preview?: false | ((item: HTMLElement) => HTMLElement | null);
}

export type ScopeTouchController = Disposable;

const PREVIEW_Z_INDEX = 2147483647;

function makeDataTransfer(): DataTransfer {
  return {
    dropEffect: 'move',
    effectAllowed: 'move',
    getData: () => '',
    setData() {},
    setDragImage() {},
  } as unknown as DataTransfer;
}

function createDefaultPreview(source: HTMLElement): HTMLElement {
  const rect = source.getBoundingClientRect();
  const preview = document.createElement('div');

  preview.setAttribute('aria-hidden', 'true');
  preview.setAttribute('data-dnd-touch-preview', '');
  preview.setAttribute('inert', '');
  Object.assign(preview.style, {
    background: 'transparent',
    border: '2px solid currentColor',
    boxSizing: 'border-box',
    height: `${rect.height}px`,
    left: `${rect.left}px`,
    opacity: '0.7',
    pointerEvents: 'none',
    position: 'fixed',
    top: `${rect.top}px`,
    transition: 'none',
    width: `${rect.width}px`,
    zIndex: String(PREVIEW_Z_INDEX),
  });

  return preview;
}

export function createScopeTouchController(
  options: TouchInputOptions,
  resolveDragTarget: (target: Element) => HTMLElement | null,
): ScopeTouchController {
  const dt = makeDataTransfer();
  const dragStartDistancePx = 6;
  let pendingDraggable: HTMLElement | null = null;
  let pendingStartPoint: { clientX: number; clientY: number } | null = null;
  let dragging: HTMLElement | null = null;
  let lastTarget: Element | null = null;
  let previewEl: HTMLElement | null = null;
  let previewOrigin: { clientX: number; clientY: number } | null = null;

  function removePreview(): void {
    previewEl?.remove();
    previewEl = null;
    previewOrigin = null;
  }

  function elementBelow(clientX: number, clientY: number): Element | null {
    const previousDraggingDisplay = dragging?.style.display ?? '';
    const previousPreviewDisplay = previewEl?.style.display ?? '';

    if (dragging) dragging.style.display = 'none';

    if (previewEl) previewEl.style.display = 'none';

    const below = document.elementFromPoint(clientX, clientY);

    if (dragging) dragging.style.display = previousDraggingDisplay;

    if (previewEl) previewEl.style.display = previousPreviewDisplay;

    return below;
  }

  const disposable = createDisposable(() => {
    pendingDraggable = null;
    pendingStartPoint = null;
    dragging = null;
    lastTarget = null;
    removePreview();
  });

  function dispatch(element: Element, type: string, clientX: number, clientY: number, hasPreview = false): void {
    const event = new Event(type, { bubbles: true, cancelable: true });

    Object.defineProperty(event, '__dndTouch', { configurable: true, value: true });
    Object.defineProperty(event, '__dndTouchPreview', { configurable: true, value: hasPreview });
    Object.defineProperty(event, 'clientX', { configurable: true, value: clientX });
    Object.defineProperty(event, 'clientY', { configurable: true, value: clientY });
    Object.defineProperty(event, 'dataTransfer', { configurable: true, value: dt });
    element.dispatchEvent(event);
  }

  function renderPreview(source: HTMLElement, point: { clientX: number; clientY: number }): boolean {
    if (options.preview === false) return false;

    try {
      const preview = options.preview?.(source);

      previewEl = options.preview
        ? ((preview?.cloneNode(true) as HTMLElement | undefined) ?? null)
        : createDefaultPreview(source);
    } catch (error) {
      warn(`touch drag preview failed to render, continuing without one: ${String(error)}`);
      previewEl = null;
    }

    if (!previewEl) return false;

    previewEl.setAttribute('aria-hidden', 'true');
    previewEl.setAttribute('data-dnd-touch-preview', '');
    previewEl.setAttribute('inert', '');
    previewEl.removeAttribute('id');
    previewEl.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
    previewEl.style.pointerEvents = 'none';
    previewEl.style.position = 'fixed';
    previewEl.style.zIndex = String(PREVIEW_Z_INDEX);
    document.body.appendChild(previewEl);
    previewOrigin = point;

    return true;
  }

  document.addEventListener(
    'touchstart',
    (event: TouchEvent) => {
      const touch = event.touches[0];

      if (!touch) return;

      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const draggable = target ? resolveDragTarget(target) : null;

      if (!draggable) return;

      pendingDraggable = draggable;
      pendingStartPoint = { clientX: touch.clientX, clientY: touch.clientY };
    },
    { passive: false, signal: disposable.disposalSignal },
  );

  document.addEventListener(
    'touchmove',
    (event: TouchEvent) => {
      const touch = event.touches[0];

      if (!touch) return;

      if (!dragging) {
        if (!pendingDraggable || !pendingStartPoint) return;

        const distance = Math.hypot(
          touch.clientX - pendingStartPoint.clientX,
          touch.clientY - pendingStartPoint.clientY,
        );

        if (distance < dragStartDistancePx) return;

        dragging = pendingDraggable;
        lastTarget = pendingDraggable;

        const hasPreview = renderPreview(dragging, touch);

        dispatch(dragging, 'dragstart', touch.clientX, touch.clientY, hasPreview);
      }

      if (previewEl && previewOrigin) {
        const dx = touch.clientX - previewOrigin.clientX;
        const dy = touch.clientY - previewOrigin.clientY;

        previewEl.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      }

      const below = elementBelow(touch.clientX, touch.clientY);

      if (below && below !== lastTarget) {
        if (lastTarget) dispatch(lastTarget, 'dragleave', touch.clientX, touch.clientY);

        lastTarget = below;
      }

      if (below) dispatch(below, 'dragover', touch.clientX, touch.clientY);

      pendingDraggable = null;
      pendingStartPoint = null;
      event.preventDefault();
    },
    { passive: false, signal: disposable.disposalSignal },
  );

  function finish(event: TouchEvent, cancelled: boolean): void {
    if (!dragging) {
      pendingDraggable = null;
      pendingStartPoint = null;

      return;
    }

    const touch = event.changedTouches[0];

    if (!touch) return;

    if (!cancelled) {
      const below = elementBelow(touch.clientX, touch.clientY);

      if (below) dispatch(below, 'drop', touch.clientX, touch.clientY);
    }

    dispatch(dragging, 'dragend', touch.clientX, touch.clientY, previewEl !== null);
    pendingDraggable = null;
    pendingStartPoint = null;
    dragging = null;
    lastTarget = null;
    removePreview();
  }

  document.addEventListener('touchend', (event: TouchEvent) => finish(event, false), {
    passive: true,
    signal: disposable.disposalSignal,
  });
  document.addEventListener('touchcancel', (event: TouchEvent) => finish(event, true), {
    passive: true,
    signal: disposable.disposalSignal,
  });

  return disposable;
}
