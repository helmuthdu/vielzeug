import type { GestureEndReason, GestureHandle } from './_gesture.js';

export type PointerAxis = 'x' | 'y';

const DEFAULT_ACTIVATION_DISTANCE = 6;

export function resolveActivationDistance(value: number | undefined): number {
  if (value === undefined) return DEFAULT_ACTIVATION_DISTANCE;
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`activationDistance must be a non-negative finite number, got: ${value}`);
  }
  return value;
}

export type PointerSessionDetail = Readonly<{
  axis: PointerAxis | undefined;
  currentX: number;
  currentY: number;
  event: PointerEvent;
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
  target: Element;
}>;

type PointerSessionOptions = Readonly<{
  activationDistance: number;
  axis?: PointerAxis | (() => PointerAxis);
  disabled?: boolean | (() => boolean | undefined);
  onEnd?: (detail: PointerSessionDetail & Readonly<{ reason: GestureEndReason }>) => void;
  onMove?: (detail: PointerSessionDetail) => void;
  onStart?: (detail: PointerSessionDetail) => void;
  pointerCapture: boolean;
  shouldStart?: (event: PointerEvent) => boolean;
  signal?: AbortSignal;
}>;

type PendingPointer = {
  axis: PointerAxis | undefined;
  event: PointerEvent;
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
};

type ActivePointer = PendingPointer & { captured: boolean };

const read = <T>(value: T | (() => T) | undefined, fallback: T): T =>
  typeof value === 'function' ? (value as () => T)() : (value ?? fallback);

const resolveAxis = (value: PointerSessionOptions['axis']): PointerAxis | undefined => {
  if (value === undefined) return undefined;
  const axis = typeof value === 'function' ? value() : value;
  if (axis !== 'x' && axis !== 'y') throw new RangeError(`axis must be "x" or "y", got: ${String(axis)}`);
  return axis;
};

export function createPointerSession(target: Element, options: PointerSessionOptions): GestureHandle {
  const { activationDistance, axis, disabled, onEnd, onMove, onStart, pointerCapture, shouldStart, signal } = options;
  const disposalController = new AbortController();
  const fixedAxis = typeof axis === 'function' ? undefined : resolveAxis(axis);
  let trackingDocument: Document | null = null;
  let pending: PendingPointer | null = null;
  let active: ActivePointer | null = null;
  let disposed = false;

  const isDisabled = (): boolean => Boolean(read(disabled, false));

  const createDetail = (event: PointerEvent): PointerSessionDetail | null =>
    active
      ? {
          axis: active.axis,
          currentX: event.clientX,
          currentY: event.clientY,
          event,
          pointerId: active.pointerId,
          pointerType: active.pointerType,
          startX: active.startX,
          startY: active.startY,
          target,
        }
      : null;

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

  const releaseCapture = (pointer: ActivePointer): void => {
    if (!pointer.captured || typeof target.releasePointerCapture !== 'function') return;
    try {
      if (typeof target.hasPointerCapture === 'function' && !target.hasPointerCapture(pointer.pointerId)) return;
      target.releasePointerCapture(pointer.pointerId);
    } catch {
      // Pointer ownership may already have ended or the target may have detached.
    }
  };

  const clearSession = (): void => {
    const previousActive = active;
    pending = null;
    active = null;
    removeTrackingListeners();
    if (previousActive) releaseCapture(previousActive);
  };

  const finish = (event: PointerEvent, reason: GestureEndReason): boolean => {
    if (!active) return false;
    active.event = event;
    const detail = createDetail(event);
    clearSession();
    if (detail) onEnd?.({ ...detail, reason });
    return true;
  };

  const cancel = (): boolean => {
    if (disposed) return false;
    if (active) return finish(active.event, 'cancel');
    if (!pending) return false;
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

  const matchesPointer = (event: PointerEvent): boolean => (active ?? pending)?.pointerId === event.pointerId;

  const startTracking = (): void => {
    trackingDocument = target.ownerDocument;
    trackingDocument.addEventListener('pointermove', onPointerMove, true);
    trackingDocument.addEventListener('pointerup', onPointerUp, true);
    trackingDocument.addEventListener('pointercancel', onPointerCancel, true);
    trackingDocument.addEventListener('visibilitychange', onVisibilityChange);
    trackingDocument.defaultView?.addEventListener('blur', onWindowBlur);
    target.addEventListener('lostpointercapture', onLostPointerCapture);
  };

  const activate = (event: PointerEvent): boolean => {
    if (!pending) return false;
    const deltaX = event.clientX - pending.startX;
    const deltaY = event.clientY - pending.startY;
    if (deltaX === 0 && deltaY === 0) return false;

    if (pending.axis === undefined) {
      if (Math.hypot(deltaX, deltaY) < activationDistance) return false;
    } else {
      const primaryDistance = pending.axis === 'x' ? Math.abs(deltaX) : Math.abs(deltaY);
      const crossDistance = pending.axis === 'x' ? Math.abs(deltaY) : Math.abs(deltaX);
      if (Math.max(primaryDistance, crossDistance) < activationDistance) return false;
      if (crossDistance > primaryDistance) {
        clearSession();
        return false;
      }
    }

    active = { ...pending, captured: false, event };
    pending = null;
    if (pointerCapture && typeof target.setPointerCapture === 'function') {
      try {
        target.setPointerCapture(event.pointerId);
        active.captured = typeof target.hasPointerCapture !== 'function' || target.hasPointerCapture(event.pointerId);
      } catch {
        active.captured = false;
      }
    }

    const detail = createDetail(event);
    if (detail) onStart?.(detail);
    return active?.pointerId === event.pointerId;
  };

  const handlePointerDown = (event: PointerEvent): boolean => {
    if (disposed || pending || active || isDisabled() || !event.isPrimary || event.button !== 0) return false;
    if (shouldStart && !shouldStart(event)) return false;
    pending = {
      axis: fixedAxis ?? resolveAxis(axis),
      event,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
    };
    startTracking();
    return true;
  };

  const handlePointerMove = (event: PointerEvent): boolean => {
    if (!matchesPointer(event)) return false;
    if (isDisabled()) {
      if (active) return finish(event, 'cancel');
      clearSession();
      return true;
    }
    if (!active && !activate(event)) return true;
    if (!active) return true;
    active.event = event;
    const detail = createDetail(event);
    if (detail) onMove?.(detail);
    return true;
  };

  const handlePointerUp = (event: PointerEvent): boolean => {
    if (!matchesPointer(event)) return false;
    if (!active) {
      clearSession();
      return true;
    }
    return finish(event, isDisabled() ? 'cancel' : 'release');
  };

  const handlePointerCancel = (event: PointerEvent): boolean => {
    if (!matchesPointer(event)) return false;
    if (!active) {
      clearSession();
      return true;
    }
    return finish(event, 'cancel');
  };

  const onPointerDown: EventListener = (event) => handlePointerDown(event as PointerEvent);
  const onPointerMove: EventListener = (event) => handlePointerMove(event as PointerEvent);
  const onPointerUp: EventListener = (event) => handlePointerUp(event as PointerEvent);
  const onPointerCancel: EventListener = (event) => handlePointerCancel(event as PointerEvent);
  const onLostPointerCapture: EventListener = (event) => handlePointerCancel(event as PointerEvent);
  const onWindowBlur: EventListener = () => cancel();
  const onVisibilityChange: EventListener = () => {
    if (trackingDocument?.visibilityState === 'hidden') cancel();
  };

  target.addEventListener('pointerdown', onPointerDown);
  if (signal?.aborted) dispose();
  else signal?.addEventListener('abort', dispose, { once: true });

  return {
    get active() {
      return active !== null;
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
