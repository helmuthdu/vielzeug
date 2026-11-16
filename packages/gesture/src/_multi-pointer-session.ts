import type { GestureEndReason, GestureHandle } from './_gesture.js';
import { GestureConfigError } from './errors.js';

export const DEFAULT_PINCH_ACTIVATION_DISTANCE = 6;

export function resolvePinchActivationDistance(value: number | undefined): number {
  if (value === undefined) return DEFAULT_PINCH_ACTIVATION_DISTANCE;
  if (!Number.isFinite(value) || value < 0) {
    throw new GestureConfigError(`activationDistance must be a non-negative finite number, got: ${value}`);
  }
  return value;
}

export type MultiPointerState = Readonly<{
  /** Distance between the two tracked pointers. */
  span: number;
  /** Angle of the line joining the two pointers, radians; positive is clockwise on screen. */
  angle: number;
  /** Midpoint of the two pointers in client coordinates. */
  centroidX: number;
  centroidY: number;
  event: PointerEvent;
}>;

type TrackedPointer = {
  captured: boolean;
  pointerId: number;
  x: number;
  y: number;
};

type MultiPointerSessionOptions = Readonly<{
  activationDistance: number;
  disabled?: boolean | (() => boolean | undefined);
  onActivate?: (state: MultiPointerState, baseline: MultiPointerBaseline) => void;
  onEnd?: (state: MultiPointerState, reason: GestureEndReason) => void;
  onMove?: (state: MultiPointerState) => void;
  pointerCapture: boolean;
  signal?: AbortSignal;
}>;

/** Span/angle/centroid captured when the second pointer went down; the recognizer's
 * relative scale/rotation is measured against this baseline. */
export type MultiPointerBaseline = Omit<MultiPointerState, 'event'>;

/**
 * Two-pointer session shared by multi-touch recognizers: tracks the first two pointers
 * that go down on the target after creation (extra pointers are ignored), activates once
 * the span between them changes by `activationDistance` pixels, and reports span/angle/
 * centroid until either tracked pointer ends the session. Baseline span/angle/centroid
 * come from the two pointerdown positions, so the activating event already reports the
 * crossed threshold rather than a neutral 1/0.
 */
export function createMultiPointerSession(target: Element, options: MultiPointerSessionOptions): GestureHandle {
  const { activationDistance, disabled, onActivate, onEnd, onMove, pointerCapture, signal } = options;
  const disposalController = new AbortController();
  let trackingDocument: Document | null = null;
  const pointers: TrackedPointer[] = [];
  let baseline: MultiPointerBaseline | null = null;
  let active = false;
  let lastEvent: PointerEvent | null = null;
  let disposed = false;

  const isDisabled = (): boolean => Boolean(typeof disabled === 'function' ? disabled() : disabled);

  const read = (): MultiPointerState | null => {
    if (pointers.length !== 2 || !lastEvent) return null;
    const [a, b] = pointers as [TrackedPointer, TrackedPointer];
    return {
      angle: Math.atan2(b.y - a.y, b.x - a.x),
      centroidX: (a.x + b.x) / 2,
      centroidY: (a.y + b.y) / 2,
      event: lastEvent,
      span: Math.hypot(b.x - a.x, b.y - a.y),
    };
  };

  const capturePointer = (pointer: TrackedPointer, event: PointerEvent): void => {
    if (!pointerCapture || typeof target.setPointerCapture !== 'function') return;
    try {
      target.setPointerCapture(event.pointerId);
      pointer.captured = typeof target.hasPointerCapture !== 'function' || target.hasPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointer ids (tests, scripted input) throw here; capture is best-effort.
      pointer.captured = false;
    }
  };

  const releaseCapture = (pointer: TrackedPointer): void => {
    if (!pointer.captured || typeof target.releasePointerCapture !== 'function') return;
    try {
      if (typeof target.hasPointerCapture === 'function' && !target.hasPointerCapture(pointer.pointerId)) return;
      target.releasePointerCapture(pointer.pointerId);
    } catch {
      // Pointer ownership may already have ended or the target may have detached.
    }
  };

  const removeTrackingListeners = (): void => {
    if (!trackingDocument) return;
    trackingDocument.removeEventListener('pointermove', onPointerMove, true);
    trackingDocument.removeEventListener('pointerup', onPointerUp, true);
    trackingDocument.removeEventListener('pointercancel', onPointerCancel, true);
    trackingDocument.removeEventListener('visibilitychange', onVisibilityChange);
    trackingDocument.defaultView?.removeEventListener('blur', onWindowBlur);
    target.removeEventListener('lostpointercapture', onLostPointerCapture);
    trackingDocument = null;
  };

  const clearSession = (): void => {
    for (const pointer of pointers) releaseCapture(pointer);
    pointers.length = 0;
    baseline = null;
    active = false;
    lastEvent = null;
    removeTrackingListeners();
  };

  const startTracking = (): void => {
    trackingDocument = target.ownerDocument;
    trackingDocument.addEventListener('pointermove', onPointerMove, true);
    trackingDocument.addEventListener('pointerup', onPointerUp, true);
    trackingDocument.addEventListener('pointercancel', onPointerCancel, true);
    trackingDocument.addEventListener('visibilitychange', onVisibilityChange);
    trackingDocument.defaultView?.addEventListener('blur', onWindowBlur);
    target.addEventListener('lostpointercapture', onLostPointerCapture);
  };

  const finish = (event: PointerEvent, reason: GestureEndReason): boolean => {
    if (!active) return false;
    lastEvent = event;
    const state = read();
    clearSession();
    if (state) onEnd?.(state, reason);
    return true;
  };

  const cancel = (): boolean => {
    if (disposed) return false;
    if (active && lastEvent) return finish(lastEvent, 'cancel');
    if (pointers.length === 0) return false;
    clearSession();
    return true;
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    signal?.removeEventListener('abort', dispose);
    disposalController.abort();
    clearSession();
    target.removeEventListener('pointerdown', onPointerDown);
  };

  const trackedIndex = (pointerId: number): number => pointers.findIndex((pointer) => pointer.pointerId === pointerId);

  const activateIfReady = (event: PointerEvent): void => {
    if (active || !baseline) return;
    const state = read();
    if (!state) return;
    if (Math.abs(state.span - baseline.span) < activationDistance) return;
    active = true;
    for (const pointer of pointers) capturePointer(pointer, event);
    onActivate?.(state, baseline);
  };

  const handlePointerDown = (event: PointerEvent): void => {
    if (disposed || isDisabled() || event.button !== 0) return;
    if (trackedIndex(event.pointerId) !== -1) return;
    // Only the first two pointers count; a third (and beyond) is ignored entirely.
    if (pointers.length >= 2) return;

    pointers.push({ captured: false, pointerId: event.pointerId, x: event.clientX, y: event.clientY });
    lastEvent = event;
    if (pointers.length === 1) startTracking();
    if (pointers.length === 2) {
      const [a, b] = pointers as [TrackedPointer, TrackedPointer];
      baseline = {
        angle: Math.atan2(b.y - a.y, b.x - a.x),
        centroidX: (a.x + b.x) / 2,
        centroidY: (a.y + b.y) / 2,
        span: Math.hypot(b.x - a.x, b.y - a.y),
      };
      activateIfReady(event);
    }
  };

  const handlePointerMove = (event: PointerEvent): void => {
    const index = trackedIndex(event.pointerId);
    if (index === -1) return;
    if (isDisabled()) {
      if (active) finish(event, 'cancel');
      else clearSession();
      return;
    }
    const pointer = pointers[index] as TrackedPointer;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    lastEvent = event;
    if (!active) {
      activateIfReady(event);
      return;
    }
    const state = read();
    if (state) onMove?.(state);
  };

  const handlePointerUp = (event: PointerEvent): void => {
    if (trackedIndex(event.pointerId) === -1) return;
    if (active) {
      finish(event, isDisabled() ? 'cancel' : 'release');
      return;
    }
    clearSession();
  };

  const handlePointerCancel = (event: PointerEvent): void => {
    if (trackedIndex(event.pointerId) === -1) return;
    if (active) finish(event, 'cancel');
    else clearSession();
  };

  const onPointerDown: EventListener = (event) => handlePointerDown(event as PointerEvent);
  const onPointerMove: EventListener = (event) => handlePointerMove(event as PointerEvent);
  const onPointerUp: EventListener = (event) => handlePointerUp(event as PointerEvent);
  const onPointerCancel: EventListener = (event) => handlePointerCancel(event as PointerEvent);
  const onLostPointerCapture: EventListener = (event) => {
    // Transferring implicit touch capture from a child also bubbles capture loss here.
    if (event.composedPath()[0] === target) handlePointerCancel(event as PointerEvent);
  };
  const onWindowBlur: EventListener = () => cancel();
  const onVisibilityChange: EventListener = () => {
    if (trackingDocument?.visibilityState === 'hidden') cancel();
  };

  target.addEventListener('pointerdown', onPointerDown);
  if (signal?.aborted) dispose();
  else signal?.addEventListener('abort', dispose, { once: true });

  return {
    get active() {
      return active;
    },
    cancel,
    get disposalSignal() {
      return disposalController.signal;
    },
    dispose,
    get disposed() {
      return disposed;
    },
    [Symbol.dispose]: dispose,
  };
}
