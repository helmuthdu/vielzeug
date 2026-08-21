import { warn } from './_dev';
import { createDisposable } from './_shared';
import type { Disposable } from './types';

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

type TouchPoint = {
  clientX: number;
  clientY: number;
};

type PendingTouchSession = {
  identifier: number;
  source: HTMLElement;
  start: TouchPoint;
  state: 'pending';
};

type DraggingTouchSession = {
  current: TouchPoint;
  identifier: number;
  lastTarget: Element | null;
  preview: HTMLElement | null;
  previewOrigin: TouchPoint | null;
  source: HTMLElement;
  state: 'dragging';
};

type TouchSession = { state: 'idle' } | DraggingTouchSession | PendingTouchSession;

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
  let session: TouchSession = { state: 'idle' };

  function findTouch(touches: TouchList, identifier: number): Touch | undefined {
    return Array.from(touches).find((touch) => touch.identifier === identifier);
  }

  function resetSession(): void {
    if (session.state === 'dragging') session.preview?.remove();

    session = { state: 'idle' };
  }

  function elementBelow(active: DraggingTouchSession, clientX: number, clientY: number): Element | null {
    const previousSourceDisplay = active.source.style.display;
    const previousPreviewDisplay = active.preview?.style.display ?? '';

    active.source.style.display = 'none';
    if (active.preview) active.preview.style.display = 'none';

    try {
      return document.elementFromPoint(clientX, clientY);
    } finally {
      active.source.style.display = previousSourceDisplay;

      if (active.preview) active.preview.style.display = previousPreviewDisplay;
    }
  }

  const disposable = createDisposable(resetSession);

  function dispatch(element: Element, type: string, clientX: number, clientY: number, hasPreview = false): boolean {
    const event = new Event(type, { bubbles: true, cancelable: true });

    Object.defineProperty(event, '__dndTouch', { configurable: true, value: true });
    Object.defineProperty(event, '__dndTouchPreview', { configurable: true, value: hasPreview });
    Object.defineProperty(event, 'clientX', { configurable: true, value: clientX });
    Object.defineProperty(event, 'clientY', { configurable: true, value: clientY });
    Object.defineProperty(event, 'dataTransfer', { configurable: true, value: dt });
    element.dispatchEvent(event);

    return event.defaultPrevented;
  }

  function renderPreview(source: HTMLElement): HTMLElement | null {
    if (options.preview === false) return null;

    let previewEl: HTMLElement | null;

    try {
      const preview = options.preview?.(source);

      previewEl = options.preview
        ? ((preview?.cloneNode(true) as HTMLElement | undefined) ?? null)
        : createDefaultPreview(source);
    } catch (error) {
      warn(`touch drag preview failed to render, continuing without one: ${String(error)}`);
      previewEl = null;
    }

    if (!previewEl) return null;

    previewEl.setAttribute('aria-hidden', 'true');
    previewEl.setAttribute('data-dnd-touch-preview', '');
    previewEl.setAttribute('inert', '');
    previewEl.removeAttribute('id');
    previewEl.querySelectorAll('[id]').forEach((element) => {
      element.removeAttribute('id');
    });
    previewEl.style.pointerEvents = 'none';
    previewEl.style.position = 'fixed';
    previewEl.style.zIndex = String(PREVIEW_Z_INDEX);
    document.body.appendChild(previewEl);

    return previewEl;
  }

  document.addEventListener(
    'touchstart',
    (event: TouchEvent) => {
      if (session.state !== 'idle') return;

      const touch = event.changedTouches[0];

      if (!touch) return;

      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const draggable = target ? resolveDragTarget(target) : null;

      if (!draggable) return;

      session = {
        identifier: touch.identifier,
        source: draggable,
        start: { clientX: touch.clientX, clientY: touch.clientY },
        state: 'pending',
      };
    },
    { passive: false, signal: disposable.disposalSignal },
  );

  document.addEventListener(
    'touchmove',
    (event: TouchEvent) => {
      if (session.state === 'idle') return;

      const touch = findTouch(event.changedTouches, session.identifier);

      if (!touch) return;

      if (session.state === 'pending') {
        const distance = Math.hypot(touch.clientX - session.start.clientX, touch.clientY - session.start.clientY);

        if (distance < dragStartDistancePx) return;

        const point = { clientX: touch.clientX, clientY: touch.clientY };
        const preview = renderPreview(session.source);
        const active: DraggingTouchSession = {
          current: point,
          identifier: session.identifier,
          lastTarget: session.source,
          preview,
          previewOrigin: preview ? point : null,
          source: session.source,
          state: 'dragging',
        };

        session = active;
        dispatch(active.source, 'dragstart', touch.clientX, touch.clientY, preview !== null);

        if (session !== active) return;
      }

      session.current = { clientX: touch.clientX, clientY: touch.clientY };

      if (session.preview && session.previewOrigin) {
        const dx = touch.clientX - session.previewOrigin.clientX;
        const dy = touch.clientY - session.previewOrigin.clientY;

        session.preview.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      }

      const below = elementBelow(session, touch.clientX, touch.clientY);

      if (below && below !== session.lastTarget) {
        if (session.lastTarget) dispatch(session.lastTarget, 'dragleave', touch.clientX, touch.clientY);

        session.lastTarget = below;
      }

      if (below) dispatch(below, 'dragover', touch.clientX, touch.clientY);

      event.preventDefault();
    },
    { passive: false, signal: disposable.disposalSignal },
  );

  function finish(event: TouchEvent, cancelled: boolean): void {
    if (session.state === 'idle') return;

    const touch = findTouch(event.changedTouches, session.identifier);

    if (!touch) {
      const stillActive = findTouch(event.touches, session.identifier);

      if (!cancelled || stillActive) return;
    }

    if (session.state === 'pending') {
      resetSession();

      return;
    }

    const active = session;
    const point = touch ?? active.current;

    try {
      let dropAccepted = false;

      if (!cancelled) {
        const below = elementBelow(active, point.clientX, point.clientY);

        if (below) dropAccepted = dispatch(below, 'drop', point.clientX, point.clientY);
      }

      dt.dropEffect = dropAccepted ? 'move' : 'none';
      dispatch(active.source, 'dragend', point.clientX, point.clientY, active.preview !== null);
    } finally {
      dt.dropEffect = 'move';
      resetSession();
    }
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
