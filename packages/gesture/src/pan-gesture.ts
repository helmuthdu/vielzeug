export type PanAxis = 'x' | 'y';

export type PanEndReason = 'cancel' | 'release';

export type PanGestureDetail = {
  axis: PanAxis;
  current: number;
  distance: number;
  event: PointerEvent;
  pointerId: number;
  pointerType: string;
  start: number;
  target: Element;
};

export type PanGestureEndDetail = PanGestureDetail & {
  reason: PanEndReason;
};

export type PanGestureOptions = {
  axis?: PanAxis | (() => PanAxis);
  disabled?: boolean | (() => boolean | undefined);
  onEnd?: (detail: PanGestureEndDetail) => void;
  onMove?: (detail: PanGestureDetail) => void;
  onStart?: (detail: PanGestureDetail) => void;
  pointerCapture?: boolean;
  shouldStart?: (event: PointerEvent) => boolean;
};

export type PanGesture = {
  readonly active: boolean;
  [Symbol.dispose](): void;
  cancel(): boolean;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
};

type PendingPan = {
  axis: PanAxis;
  event: PointerEvent;
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
};

type ActivePan = PendingPan & {
  captured: boolean;
};

const ACTIVATION_DISTANCE = 6;

const read = <T>(value: T | (() => T) | undefined, fallback: T): T =>
  typeof value === 'function' ? (value as () => T)() : (value ?? fallback);

const isPrimaryPointer = (event: PointerEvent): boolean => {
  if (!event.isPrimary) return false;
  if (event.pointerType === 'mouse' && event.button !== 0) return false;

  return true;
};

const getCoordinate = (event: PointerEvent, axis: PanAxis): number => {
  return axis === 'x' ? event.clientX : event.clientY;
};

const getStartCoordinate = (pan: PendingPan, axis: PanAxis): number => {
  return axis === 'x' ? pan.startX : pan.startY;
};

export const createPanGesture = (target: Element, options: PanGestureOptions = {}): PanGesture => {
  const disposalController = new AbortController();
  const ownerDocument = target.ownerDocument;
  let pending: PendingPan | null = null;
  let active: ActivePan | null = null;
  let disposed = false;

  const isDisabled = (): boolean => Boolean(read(options.disabled, false));

  const createDetail = (event: PointerEvent): PanGestureDetail | null => {
    if (!active) return null;

    const start = getStartCoordinate(active, active.axis);
    const current = getCoordinate(event, active.axis);

    return {
      axis: active.axis,
      current,
      distance: current - start,
      event,
      pointerId: active.pointerId,
      pointerType: active.pointerType,
      start,
      target,
    };
  };

  const removeTrackingListeners = (): void => {
    ownerDocument.removeEventListener('pointermove', onPointerMove, true);
    ownerDocument.removeEventListener('pointerup', onPointerUp, true);
    ownerDocument.removeEventListener('pointercancel', onPointerCancel, true);
    target.removeEventListener('lostpointercapture', onLostPointerCapture);
  };

  const releaseCapture = (pan: ActivePan): void => {
    if (!pan.captured || typeof target.releasePointerCapture !== 'function') return;
    if (typeof target.hasPointerCapture === 'function' && !target.hasPointerCapture(pan.pointerId)) return;

    target.releasePointerCapture(pan.pointerId);
  };

  const clearSession = (): void => {
    const previousActive = active;

    pending = null;
    active = null;
    removeTrackingListeners();

    if (previousActive) releaseCapture(previousActive);
  };

  const finish = (event: PointerEvent, reason: PanEndReason): boolean => {
    if (!active) return false;

    active.event = event;
    const detail = createDetail(event);

    clearSession();

    if (detail) options.onEnd?.({ ...detail, reason });

    return true;
  };

  const cancel = (): boolean => {
    if (active) return finish(active.event, 'cancel');
    if (!pending) return false;

    clearSession();

    return true;
  };

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;
    disposalController.abort();
    clearSession();
    target.removeEventListener('pointerdown', onPointerDown);
  };

  const matchesPointer = (event: PointerEvent): boolean => {
    return (active ?? pending)?.pointerId === event.pointerId;
  };

  const startTracking = (): void => {
    ownerDocument.addEventListener('pointermove', onPointerMove, true);
    ownerDocument.addEventListener('pointerup', onPointerUp, true);
    ownerDocument.addEventListener('pointercancel', onPointerCancel, true);
    target.addEventListener('lostpointercapture', onLostPointerCapture);
  };

  const activate = (event: PointerEvent): boolean => {
    if (!pending) return false;

    const deltaX = event.clientX - pending.startX;
    const deltaY = event.clientY - pending.startY;
    const primaryDistance = pending.axis === 'x' ? Math.abs(deltaX) : Math.abs(deltaY);
    const crossDistance = pending.axis === 'x' ? Math.abs(deltaY) : Math.abs(deltaX);

    if (Math.max(primaryDistance, crossDistance) < ACTIVATION_DISTANCE) return false;

    if (crossDistance > primaryDistance) {
      clearSession();

      return false;
    }

    active = { ...pending, captured: false, event };
    pending = null;

    if (options.pointerCapture !== false && typeof target.setPointerCapture === 'function') {
      target.setPointerCapture(event.pointerId);
      active.captured = true;
    }

    const detail = createDetail(event);

    if (detail) options.onStart?.(detail);

    return active?.pointerId === event.pointerId;
  };

  const handlePointerDown = (event: PointerEvent): boolean => {
    if (disposed || pending || active || isDisabled()) return false;
    if (!isPrimaryPointer(event)) return false;
    if (options.shouldStart && !options.shouldStart(event)) return false;

    pending = {
      axis: read(options.axis, 'x'),
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

    if (detail) options.onMove?.(detail);

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

  const onPointerDown: EventListener = (event) => {
    if (event instanceof PointerEvent) handlePointerDown(event);
  };

  const onPointerMove: EventListener = (event) => {
    if (event instanceof PointerEvent) handlePointerMove(event);
  };

  const onPointerUp: EventListener = (event) => {
    if (event instanceof PointerEvent) handlePointerUp(event);
  };

  const onPointerCancel: EventListener = (event) => {
    if (event instanceof PointerEvent) handlePointerCancel(event);
  };

  const onLostPointerCapture: EventListener = (event) => {
    if (event instanceof PointerEvent) handlePointerCancel(event);
  };

  target.addEventListener('pointerdown', onPointerDown);

  return {
    get active() {
      return active != null;
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
};
