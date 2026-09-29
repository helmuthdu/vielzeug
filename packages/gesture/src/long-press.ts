import type { GestureHandle } from './_gesture.js';
import { GestureConfigError } from './errors.js';

export type LongPressDetail = Readonly<{
  /** The pointerdown that started the hold; its `target` is the pressed element. */
  event: PointerEvent;
  pointerId: number;
  pointerType: string;
  /** The element the recognizer is bound to. */
  target: Element;
}>;

export type LongPressOptions = Readonly<{
  /** Hold time in milliseconds. Default 500. */
  durationMs?: number;
  disabled?: boolean | (() => boolean | undefined);
  onLongPress?: (detail: LongPressDetail) => void;
  /** Restrict which pointers may start a hold (for example, excluding `mouse`). */
  shouldStart?: (event: PointerEvent) => boolean;
  /** Movement beyond this distance in pixels cancels the hold. Default 8. */
  slopPx?: number;
  signal?: AbortSignal;
}>;

export type LongPress = GestureHandle;

const DEFAULT_DURATION_MS = 500;
const DEFAULT_SLOP_PX = 8;

export function resolveDurationMs(value: number | undefined): number {
  if (value === undefined) return DEFAULT_DURATION_MS;
  if (!Number.isFinite(value) || value <= 0) {
    throw new GestureConfigError(`durationMs must be a positive finite number, got: ${value}`);
  }
  return value;
}

export function resolveSlopPx(value: number | undefined): number {
  if (value === undefined) return DEFAULT_SLOP_PX;
  if (!Number.isFinite(value) || value < 0) {
    throw new GestureConfigError(`slopPx must be a non-negative finite number, got: ${value}`);
  }
  return value;
}

type PendingHold = {
  event: PointerEvent;
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
};

/**
 * Long-press recognition over an element: a primary pointer held past `durationMs` fires
 * `onLongPress` with the originating pointerdown, movement beyond `slopPx` cancels back to
 * a normal press, and the click that follows a fired hold is swallowed (capture phase) so
 * releasing never commits what the hold opened. Focus moves and page hides cancel the hold.
 */
export function createLongPress(target: Element, options: LongPressOptions = {}): LongPress {
  const { disabled, durationMs, onLongPress, shouldStart, signal, slopPx } = options;
  const duration = resolveDurationMs(durationMs);
  const slop = resolveSlopPx(slopPx);
  const disposalController = new AbortController();
  let trackingDocument: Document | null = null;
  let pending: PendingHold | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let swallowClick = false;
  let disposed = false;

  const isDisabled = (): boolean => Boolean(typeof disabled === 'function' ? disabled() : disabled);

  const removeTracking = (): void => {
    if (!trackingDocument) return;
    trackingDocument.removeEventListener('pointermove', onPointerMove, true);
    trackingDocument.removeEventListener('pointerup', onPointerUp, true);
    trackingDocument.removeEventListener('pointercancel', onPointerCancel, true);
    trackingDocument.removeEventListener('visibilitychange', onVisibilityChange);
    trackingDocument.defaultView?.removeEventListener('blur', onWindowBlur);
    trackingDocument = null;
  };

  const clearHold = (): void => {
    if (timer) clearTimeout(timer);
    timer = null;
    pending = null;
    removeTracking();
  };

  const fire = (): void => {
    const hold = pending;
    timer = null;
    pending = null;
    removeTracking();
    if (!hold) return;
    swallowClick = true;
    onLongPress?.({
      event: hold.event,
      pointerId: hold.pointerId,
      pointerType: hold.pointerType,
      target,
    });
  };

  const cancel = (): boolean => {
    if (disposed) return false;
    if (!pending && !timer) return false;
    clearHold();
    return true;
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    signal?.removeEventListener('abort', dispose);
    disposalController.abort();
    clearHold();
    target.removeEventListener('pointerdown', onPointerDown);
    target.removeEventListener('click', onClickCapture, true);
  };

  const matchesPointer = (event: PointerEvent): boolean => pending?.pointerId === event.pointerId;

  const onVisibilityChange = (): void => {
    if (trackingDocument?.visibilityState === 'hidden') cancel();
  };

  const onWindowBlur = (): void => {
    cancel();
  };

  const onClickCapture = (event: Event): void => {
    if (!swallowClick) return;
    swallowClick = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const handlePointerDown = (event: PointerEvent): void => {
    if (disposed || pending || isDisabled() || !event.isPrimary || event.button !== 0) return;
    if (shouldStart && !shouldStart(event)) return;

    // A fired hold whose click never arrived (the press opened a context menu, the
    // pointer was released off-element) must not swallow an unrelated later click.
    swallowClick = false;

    pending = {
      event,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
    };
    trackingDocument = target.ownerDocument;
    trackingDocument.addEventListener('pointermove', onPointerMove, true);
    trackingDocument.addEventListener('pointerup', onPointerUp, true);
    trackingDocument.addEventListener('pointercancel', onPointerCancel, true);
    trackingDocument.addEventListener('visibilitychange', onVisibilityChange);
    trackingDocument.defaultView?.addEventListener('blur', onWindowBlur);
    timer = setTimeout(fire, duration);
  };

  const handlePointerMove = (event: PointerEvent): void => {
    if (!pending || !matchesPointer(event)) return;
    if (Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY) > slop) clearHold();
  };

  const handlePointerUp = (event: PointerEvent): void => {
    if (!matchesPointer(event)) return;
    clearHold();
  };

  const handlePointerCancel = (event: PointerEvent): void => {
    if (!matchesPointer(event)) return;
    clearHold();
  };

  const onPointerDown: EventListener = (event) => handlePointerDown(event as PointerEvent);
  const onPointerMove: EventListener = (event) => handlePointerMove(event as PointerEvent);
  const onPointerUp: EventListener = (event) => handlePointerUp(event as PointerEvent);
  const onPointerCancel: EventListener = (event) => handlePointerCancel(event as PointerEvent);

  target.addEventListener('pointerdown', onPointerDown);
  target.addEventListener('click', onClickCapture, true);
  if (signal?.aborted) dispose();
  else signal?.addEventListener('abort', dispose, { once: true });

  return {
    get active() {
      return pending !== null || timer !== null;
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
