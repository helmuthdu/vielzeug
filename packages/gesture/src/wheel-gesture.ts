export type WheelDetail = Readonly<{
  /** Horizontal scroll delta normalized to CSS pixels (positive is rightward content movement). */
  deltaX: number;
  /** Vertical scroll delta normalized to CSS pixels (positive is downward content movement). */
  deltaY: number;
  /** `true` when `ctrlKey` is set: the platform reports trackpad pinch-zoom as a wheel event. */
  pinch: boolean;
  event: WheelEvent;
  target: Element;
}>;

export type WheelOptions = Readonly<{
  /**
   * Call `preventDefault()` on handled wheel events. Pass `true` to always prevent, or a
   * predicate to decide per event. Default `false`: the recognizer never prevents silently,
   * because passive scroll blocking surprises page owners.
   */
  preventDefault?: boolean | ((event: WheelEvent) => boolean);
  disabled?: boolean | (() => boolean | undefined);
  onWheel?: (detail: WheelDetail) => void;
  signal?: AbortSignal;
}>;

export type WheelGesture = Readonly<{
  dispose(): void;
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
  [Symbol.dispose]: () => void;
}>;

/** CSS pixels per `deltaMode === 1` (line) unit. Matches the common browser line granularity. */
const LINE_PX = 16;

/**
 * Normalize a wheel event's deltas to CSS pixels across `deltaMode` (pixels, lines, pages).
 * Page-mode deltas scale by the target's own client box, falling back to the window.
 */
export function normalizeWheel(event: WheelEvent, target: Element): { deltaX: number; deltaY: number } {
  const multiplier = event.deltaMode === 1 ? LINE_PX : event.deltaMode === 2 ? pagePx(target) : 1;
  return { deltaX: event.deltaX * multiplier, deltaY: event.deltaY * multiplier };
}

function pagePx(target: Element): number {
  const view = target.ownerDocument.defaultView;
  const width = target.clientWidth || view?.innerWidth || 0;
  const height = target.clientHeight || view?.innerHeight || 0;
  // Deltas are per-axis, but a single multiplier keeps diagonal scroll proportional.
  return Math.max(width, height, 1);
}

/**
 * Wheel recognition over an element: reports every wheel event with deltas normalized to
 * CSS pixels and a `pinch` flag for the trackpad pinch-zoom gesture (macOS reports it as a
 * ctrl-key wheel). The listener is registered non-passive so `preventDefault` can work, but
 * prevention only happens when the `preventDefault` option opts in. Set
 * `touch-action: none` on the target when the surface also owns touch gestures.
 */
export function createWheelGesture(target: Element, options: WheelOptions = {}): WheelGesture {
  const { disabled, onWheel, preventDefault = false, signal } = options;
  const disposalController = new AbortController();
  let disposed = false;

  const isDisabled = (): boolean => Boolean(typeof disabled === 'function' ? disabled() : disabled);

  const shouldPrevent = (event: WheelEvent): boolean =>
    typeof preventDefault === 'function' ? preventDefault(event) : preventDefault;

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    signal?.removeEventListener('abort', dispose);
    disposalController.abort();
  };

  const onWheelEvent = (event: Event): void => {
    const wheel = event as WheelEvent;
    if (disposed || isDisabled()) return;
    if (shouldPrevent(wheel)) wheel.preventDefault();
    if (!onWheel) return;
    const { deltaX, deltaY } = normalizeWheel(wheel, target);
    onWheel({ deltaX, deltaY, event: wheel, pinch: wheel.ctrlKey, target });
  };

  target.addEventListener('wheel', onWheelEvent, { passive: false, signal: disposalController.signal });
  if (signal?.aborted) dispose();
  else signal?.addEventListener('abort', dispose, { once: true });

  return {
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
