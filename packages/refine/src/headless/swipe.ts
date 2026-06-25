export type SwipeAxis = 'x' | 'y';

export type SwipeControlDetail = {
  axis: SwipeAxis;
  current: number;
  distance: number;
  event: PointerEvent;
  pointerId: number;
  progress: number;
  start: number;
  threshold: number;
};

export type SwipeControlOptions = {
  axis?: () => SwipeAxis;
  captureTarget?: (event: PointerEvent) => HTMLElement | null;
  disabled?: () => boolean;
  onCancel?: (detail: SwipeControlDetail) => void;
  onCommit?: (detail: SwipeControlDetail) => void;
  onMove?: (detail: SwipeControlDetail) => void;
  onStart?: (detail: SwipeControlDetail) => void;
  shouldCommit?: (detail: SwipeControlDetail) => boolean;
  threshold?: () => number;
};

export type SwipeControl = {
  [Symbol.dispose](): void;
  /** Cancel any in-flight swipe and clean up internal state. */
  dispose: () => void;
  handlePointerCancel: (event: PointerEvent) => boolean;
  handlePointerDown: (event: PointerEvent) => boolean;
  handlePointerMove: (event: PointerEvent) => boolean;
  handlePointerUp: (event: PointerEvent) => boolean;
  isActive: () => boolean;
};

type ActiveSwipe = {
  axis: SwipeAxis;
  pointerId: number;
  start: number;
  threshold: number;
};

const resolveAxis = (options: SwipeControlOptions): SwipeAxis => options.axis?.() ?? 'x';

const resolveThreshold = (options: SwipeControlOptions): number => {
  const threshold = options.threshold?.() ?? 48;

  return Number.isFinite(threshold) && threshold > 0 ? threshold : 1;
};

const getCoordinate = (event: PointerEvent, axis: SwipeAxis): number => {
  return axis === 'x' ? event.clientX : event.clientY;
};

const defaultCaptureTarget = (event: PointerEvent): HTMLElement | null => {
  if (event.currentTarget instanceof HTMLElement) return event.currentTarget;

  if (event.target instanceof HTMLElement) return event.target;

  return null;
};

export const createSwipeControl = (options: SwipeControlOptions): SwipeControl => {
  let active: ActiveSwipe | null = null;

  const isDisabled = (): boolean => Boolean(options.disabled?.());

  const reset = (): void => {
    active = null;
  };

  const matchesPointer = (event: PointerEvent): boolean => {
    return active?.pointerId === event.pointerId;
  };

  const createDetail = (event: PointerEvent): SwipeControlDetail | null => {
    if (!active) return null;

    const current = getCoordinate(event, active.axis);
    const distance = current - active.start;

    return {
      axis: active.axis,
      current,
      distance,
      event,
      pointerId: active.pointerId,
      progress: Math.min(Math.abs(distance) / active.threshold, 1),
      start: active.start,
      threshold: active.threshold,
    };
  };

  const handlePointerDown = (event: PointerEvent): boolean => {
    if (active || isDisabled()) return false;

    const axis = resolveAxis(options);

    active = {
      axis,
      pointerId: event.pointerId,
      start: getCoordinate(event, axis),
      threshold: resolveThreshold(options),
    };

    const captureTarget =
      typeof options.captureTarget === 'function' ? options.captureTarget(event) : defaultCaptureTarget(event);

    captureTarget?.setPointerCapture?.(event.pointerId);

    const detail = createDetail(event);

    if (detail) options.onStart?.(detail);

    return true;
  };

  const handlePointerMove = (event: PointerEvent): boolean => {
    if (!active || !matchesPointer(event)) return false;

    const detail = createDetail(event);

    if (!detail) return false;

    options.onMove?.(detail);

    const shouldCommit = options.shouldCommit?.(detail) ?? Math.abs(detail.distance) >= detail.threshold;

    if (!shouldCommit) return true;

    reset();
    options.onCommit?.(detail);

    return true;
  };

  const handlePointerUp = (event: PointerEvent): boolean => {
    if (!active || !matchesPointer(event)) return false;

    const detail = createDetail(event);

    reset();

    if (detail) options.onCancel?.(detail);

    return true;
  };

  const handlePointerCancel = (event: PointerEvent): boolean => {
    if (!active || !matchesPointer(event)) return false;

    const detail = createDetail(event);

    reset();

    if (detail) options.onCancel?.(detail);

    return true;
  };

  return {
    dispose: reset,
    handlePointerCancel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isActive: () => active != null,
    [Symbol.dispose]: reset,
  };
};
