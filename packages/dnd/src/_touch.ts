import { createDragGesture, type DragGesture, type DragGestureDetail } from '@vielzeug/gesture';

import { warn } from './_dev.js';
import { createDisposable } from './_shared.js';
import { DndError } from './errors.js';
import type { Disposable } from './types.js';

export type TouchInputOptions = Readonly<{
  /** Finger movement in pixels required before sorting starts. @default 6 */
  activationDistance?: number;
  /**
   * Renders visual feedback for a touch drag. Return `null` to keep the source item visible
   * instead of rendering a preview. Dnd clones the returned element, preserving caller-owned DOM.
   * The default is an inert outline sized to the source item.
   */
  preview?: false | ((item: HTMLElement) => HTMLElement | null);
}>;

export interface ScopeTouchController extends Disposable {
  cancel(): boolean;
  register(element: HTMLElement): () => void;
}

const PREVIEW_Z_INDEX = 2147483647;

type TouchDragSession = {
  current: DragGestureDetail['current'];
  lastTarget: Element | null;
  preview: HTMLElement | null;
  previewOrigin: DragGestureDetail['current'] | null;
  source: HTMLElement;
};

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
  const preview = source.ownerDocument.createElement('div');
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
  const { activationDistance = 6, preview: previewOption } = options;
  if (!Number.isFinite(activationDistance) || activationDistance < 0) {
    throw new DndError('touch.activationDistance must be a non-negative finite number');
  }

  const dataTransfer = makeDataTransfer();
  const gestures = new Map<HTMLElement, DragGesture>();
  let pendingSource: HTMLElement | null = null;
  let session: TouchDragSession | null = null;

  const resetSession = (): void => {
    session?.preview?.remove();
    pendingSource = null;
    session = null;
  };
  const disposable = createDisposable(() => {
    resetSession();
    gestures.clear();
  });

  const eventTarget = (event: PointerEvent): Element | null => {
    const target = event.composedPath().find((node) => (node as Node).nodeType === 1) ?? event.target;
    return target && (target as Node).nodeType === 1 ? (target as Element) : null;
  };

  const elementBelow = (active: TouchDragSession, point: DragGestureDetail['current']): Element | null => {
    const previousSourceDisplay = active.source.style.display;
    const previousPreviewDisplay = active.preview?.style.display ?? '';
    active.source.style.display = 'none';
    if (active.preview) active.preview.style.display = 'none';
    try {
      return active.source.ownerDocument.elementFromPoint(point.x, point.y);
    } finally {
      active.source.style.display = previousSourceDisplay;
      if (active.preview) active.preview.style.display = previousPreviewDisplay;
    }
  };

  const dispatch = (
    element: Element,
    type: string,
    point: DragGestureDetail['current'],
    hasPreview = false,
  ): boolean => {
    const EventType = element.ownerDocument.defaultView?.Event ?? Event;
    const event = new EventType(type, { bubbles: true, cancelable: true });
    Object.defineProperties(event, {
      __dndTouch: { configurable: true, value: true },
      __dndTouchPreview: { configurable: true, value: hasPreview },
      clientX: { configurable: true, value: point.x },
      clientY: { configurable: true, value: point.y },
      dataTransfer: { configurable: true, value: dataTransfer },
    });
    element.dispatchEvent(event);
    return event.defaultPrevented;
  };

  const renderPreview = (source: HTMLElement): HTMLElement | null => {
    if (previewOption === false) return null;
    let previewElement: HTMLElement | null;
    try {
      const preview = previewOption?.(source);
      previewElement = previewOption
        ? ((preview?.cloneNode(true) as HTMLElement | undefined) ?? null)
        : createDefaultPreview(source);
    } catch (error) {
      warn(`touch drag preview failed to render, continuing without one: ${String(error)}`);
      previewElement = null;
    }
    if (!previewElement) return null;

    previewElement.setAttribute('aria-hidden', 'true');
    previewElement.setAttribute('data-dnd-touch-preview', '');
    previewElement.setAttribute('inert', '');
    previewElement.removeAttribute('id');
    previewElement.querySelectorAll('[id]').forEach((element) => {
      element.removeAttribute('id');
    });
    previewElement.style.pointerEvents = 'none';
    previewElement.style.position = 'fixed';
    previewElement.style.zIndex = String(PREVIEW_Z_INDEX);
    source.ownerDocument.body.appendChild(previewElement);
    return previewElement;
  };

  const start = (detail: DragGestureDetail): void => {
    const source = pendingSource;
    pendingSource = null;
    if (!source) return;

    const preview = renderPreview(source);
    const active: TouchDragSession = {
      current: detail.current,
      lastTarget: source,
      preview,
      previewOrigin: preview ? detail.current : null,
      source,
    };
    session = active;
    dispatch(source, 'dragstart', detail.current, preview !== null);
  };

  const move = (detail: DragGestureDetail): void => {
    if (!session) return;
    session.current = detail.current;
    if (session.preview && session.previewOrigin) {
      const x = detail.current.x - session.previewOrigin.x;
      const y = detail.current.y - session.previewOrigin.y;
      session.preview.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    const below = elementBelow(session, detail.current);
    if (below && below !== session.lastTarget) {
      if (session.lastTarget) dispatch(session.lastTarget, 'dragleave', detail.current);
      session.lastTarget = below;
    }
    if (below) dispatch(below, 'dragover', detail.current);
    detail.event.preventDefault();
  };

  const end = (detail: DragGestureDetail & Readonly<{ reason: 'cancel' | 'release' }>): void => {
    pendingSource = null;
    if (!session) return;
    const active = session;
    try {
      let dropAccepted = false;
      if (detail.reason === 'release') {
        const below = elementBelow(active, detail.current);
        if (below) dropAccepted = dispatch(below, 'drop', detail.current);
      }
      dataTransfer.dropEffect = dropAccepted ? 'move' : 'none';
      dispatch(active.source, 'dragend', detail.current, active.preview !== null);
    } finally {
      dataTransfer.dropEffect = 'move';
      resetSession();
    }
  };

  return Object.assign(disposable, {
    cancel(): boolean {
      for (const gesture of gestures.values()) {
        if (gesture.cancel()) return true;
      }
      return false;
    },
    register(element: HTMLElement): () => void {
      const gesture = createDragGesture(element, {
        activationDistance,
        onEnd: end,
        onMove: move,
        onStart: start,
        pointerCapture: false,
        shouldStart: (event) => {
          if (event.pointerType !== 'touch' || session) return false;
          const target = eventTarget(event);
          pendingSource = target ? resolveDragTarget(target) : null;
          return pendingSource !== null;
        },
        signal: disposable.disposalSignal,
      });
      gestures.set(element, gesture);

      return () => {
        gesture.dispose();
        gestures.delete(element);
        if (pendingSource && element.contains(pendingSource)) pendingSource = null;
        if (session && element.contains(session.source)) resetSession();
      };
    },
  });
}
