export type SwipeAxis = 'x' | 'y';

export type MaybeGetter<T> = T | (() => T);
export type SwipeDisabledBehavior = 'block-start' | 'cancel-active';

export type SwipeGestureDetail = {
  axis: SwipeAxis;
  current: number;
  distance: number;
  event: PointerEvent;
  pointerId: number;
  pointerType: string;
  progress: number;
  start: number;
  threshold: number;
};

export type SwipeGestureOptions = {
  axis?: MaybeGetter<SwipeAxis>;
  captureTarget?: (event: PointerEvent) => Element | null;
  disabledBehavior?: MaybeGetter<SwipeDisabledBehavior>;
  disabled?: MaybeGetter<boolean | undefined>;
  onCancel?: (detail: SwipeGestureDetail) => void;
  onCommit?: (detail: SwipeGestureDetail) => void;
  onMove?: (detail: SwipeGestureDetail) => void;
  onRelease?: (detail: SwipeGestureDetail) => void;
  onStart?: (detail: SwipeGestureDetail) => void;
  shouldCommit?: (detail: SwipeGestureDetail) => boolean;
  shouldStart?: (event: PointerEvent) => boolean;
  threshold?: MaybeGetter<number>;
};

export type SwipeGesture = {
  [Symbol.dispose](): void;
  cancel(): boolean;
  readonly disposalSignal: AbortSignal;
  dispose: () => void;
  readonly disposed: boolean;
  isActive: () => boolean;
  mount(target: Element): () => void;
};

type ActiveSwipe = {
  axis: SwipeAxis;
  captureTarget: Element | null;
  event: PointerEvent;
  pointerId: number;
  pointerType: string;
  start: number;
  threshold: number;
};

const read = <T>(value: MaybeGetter<T> | undefined, fallback: T): T =>
  typeof value === 'function' ? (value as () => T)() : (value ?? fallback);

const resolveThreshold = (options: SwipeGestureOptions): number => {
  const threshold = read(options.threshold, 48);

  return Number.isFinite(threshold) && threshold > 0 ? threshold : 1;
};

const resolveDisabledBehavior = (options: SwipeGestureOptions): SwipeDisabledBehavior => {
  return read(options.disabledBehavior, 'block-start');
};

const isPrimaryPointer = (event: PointerEvent): boolean => {
  if (event.pointerType === 'mouse' && event.button !== 0) return false;

  // JSDOM pointer events default `pointerType` to an empty string and `isPrimary`
  // to false; treat that synthetic shape as primary so behavior tests remain portable.
  if (event.pointerType !== '' && event.isPrimary === false) return false;

  return true;
};

const getCoordinate = (event: PointerEvent, axis: SwipeAxis): number => {
  return axis === 'x' ? event.clientX : event.clientY;
};

const defaultCaptureTarget = (event: PointerEvent): Element | null => {
  if (event.currentTarget instanceof Element) return event.currentTarget;

  if (event.target instanceof Element) return event.target;

  return null;
};

const releasePointerCapture = (target: Element | null, pointerId: number): void => {
  if (!(target instanceof Element)) return;
  if (typeof target.releasePointerCapture !== 'function') return;
  if (typeof target.hasPointerCapture === 'function' && !target.hasPointerCapture(pointerId)) return;
  target.releasePointerCapture(pointerId);
};

export const createSwipeGesture = (options: SwipeGestureOptions): SwipeGesture => {
  const disposalController = new AbortController();
  let mountedTarget: Element | null = null;
  let active: ActiveSwipe | null = null;
  let disposed = false;

  const isDisabled = (): boolean => Boolean(read(options.disabled, false));

  const createDetail = (event: PointerEvent): SwipeGestureDetail | null => {
    if (!active) return null;

    const current = getCoordinate(event, active.axis);
    const distance = current - active.start;

    return {
      axis: active.axis,
      current,
      distance,
      event,
      pointerId: active.pointerId,
      pointerType: active.pointerType,
      progress: Math.min(Math.abs(distance) / active.threshold, 1),
      start: active.start,
      threshold: active.threshold,
    };
  };

  const clearActive = (): void => {
    if (!active) return;

    releasePointerCapture(active.captureTarget, active.pointerId);
    active = null;
  };

  const cancelActiveWithEvent = (event: PointerEvent): boolean => {
    if (!active) return false;

    active.event = event;
    const detail = createDetail(event);

    clearActive();

    if (detail) options.onCancel?.(detail);

    return true;
  };

  const cancel = (): boolean => {
    if (!active) return false;

    const detail = createDetail(active.event);

    clearActive();

    if (detail) options.onCancel?.(detail);

    return true;
  };

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;
    disposalController.abort();
    clearActive();
    mountedTarget?.removeEventListener('pointerdown', onPointerDown);
    mountedTarget?.removeEventListener('pointermove', onPointerMove);
    mountedTarget?.removeEventListener('pointerup', onPointerUp);
    mountedTarget?.removeEventListener('pointercancel', onPointerCancel);
    mountedTarget = null;
  };

  const matchesPointer = (event: PointerEvent): boolean => {
    return active?.pointerId === event.pointerId;
  };

  const handlePointerDown = (event: PointerEvent): boolean => {
    if (disposed || active || isDisabled()) return false;

    if (!isPrimaryPointer(event)) return false;

    if (options.shouldStart && !options.shouldStart(event)) return false;

    const axis = read(options.axis, 'x');
    const captureTarget =
      typeof options.captureTarget === 'function' ? options.captureTarget(event) : defaultCaptureTarget(event);

    active = {
      axis,
      captureTarget,
      event,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      start: getCoordinate(event, axis),
      threshold: resolveThreshold(options),
    };

    if (captureTarget instanceof Element) {
      captureTarget.setPointerCapture?.(event.pointerId);
    }

    const detail = createDetail(event);

    if (detail) options.onStart?.(detail);

    return true;
  };

  const handlePointerMove = (event: PointerEvent): boolean => {
    if (!active || !matchesPointer(event)) return false;

    if (resolveDisabledBehavior(options) === 'cancel-active' && isDisabled()) return cancelActiveWithEvent(event);

    active.event = event;
    const detail = createDetail(event);

    if (!detail) return false;

    options.onMove?.(detail);

    const shouldCommit = options.shouldCommit?.(detail) ?? Math.abs(detail.distance) >= detail.threshold;

    if (!shouldCommit) return true;

    clearActive();
    options.onCommit?.(detail);

    return true;
  };

  const handlePointerUp = (event: PointerEvent): boolean => {
    if (!active || !matchesPointer(event)) return false;

    if (resolveDisabledBehavior(options) === 'cancel-active' && isDisabled()) return cancelActiveWithEvent(event);

    active.event = event;
    const detail = createDetail(event);

    clearActive();

    if (detail) options.onRelease?.(detail);

    return true;
  };

  const handlePointerCancel = (event: PointerEvent): boolean => {
    if (!active || !matchesPointer(event)) return false;

    if (resolveDisabledBehavior(options) === 'cancel-active' && isDisabled()) return cancelActiveWithEvent(event);

    active.event = event;
    const detail = createDetail(event);

    clearActive();

    if (detail) options.onCancel?.(detail);

    return true;
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

  const mount = (target: Element): (() => void) => {
    if (disposed) throw new Error('Swipe gesture is disposed');
    if (mountedTarget) throw new Error('Swipe gesture is already mounted');

    mountedTarget = target;
    target.addEventListener('pointerdown', onPointerDown);
    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('pointerup', onPointerUp);
    target.addEventListener('pointercancel', onPointerCancel);

    let unmounted = false;

    return () => {
      if (unmounted) return;
      unmounted = true;
      if (mountedTarget !== target) return;
      target.removeEventListener('pointerdown', onPointerDown);
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', onPointerUp);
      target.removeEventListener('pointercancel', onPointerCancel);
      mountedTarget = null;
    };
  };

  return {
    cancel,
    get disposalSignal() {
      return disposalController.signal;
    },
    dispose,
    get disposed() {
      return disposed;
    },
    isActive: () => active != null,
    mount,
    [Symbol.dispose]: dispose,
  };
};
