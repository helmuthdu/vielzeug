export type ScrollTarget = HTMLElement | Window;

export type VirtualKey = number | string;

/** Shared measurement cache. Pass the same instance to multiple virtualizers
 *  for scroll restoration or SSR pre-measurement. */
export type MeasurementCache = Map<VirtualKey, number>;

export type Overscan = { end?: number; start?: number };

export const DEFAULT_ESTIMATE_SIZE = 36;
export const DEFAULT_OVERSCAN = 3;

// ─── Scroll adapter ────────────────────────────────────────────────────────────

/** Single-axis read/write interface for either horizontal or vertical scroll. */
export type Axis = {
  readOffset: () => number;
  readViewportSize: () => number;
  writeOffset: (offset: number, behavior: ScrollBehavior) => void;
};

/** Unified two-axis scroll adapter returned by `createScrollAdapter`. */
export type ScrollAdapter = {
  /** Detach all listeners (scroll + resize). Call in destroy(). */
  detach: () => void;
  /** Write both axes at once (avoids double scrollTo call). */
  scrollTo: (left: number, top: number, behavior: ScrollBehavior) => void;
  x: Axis;
  y: Axis;
};

/**
 * Attach scroll and resize listeners on a `ScrollTarget` and return a
 * two-axis `ScrollAdapter`. Handles both `Window` and `HTMLElement` targets.
 */
export function createScrollAdapter(target: ScrollTarget, onScroll: () => void, onResize: () => void): ScrollAdapter {
  if (isWindowTarget(target)) {
    target.addEventListener('scroll', onScroll, { passive: true });
    target.addEventListener('resize', onResize, { passive: true });

    return {
      detach() {
        target.removeEventListener('scroll', onScroll);
        target.removeEventListener('resize', onResize);
      },
      scrollTo: (left, top, behavior) => target.scrollTo({ behavior, left, top }),
      x: {
        readOffset: () => target.scrollX,
        readViewportSize: () => target.innerWidth,
        writeOffset: (offset, behavior) => target.scrollTo({ behavior, left: offset }),
      },
      y: {
        readOffset: () => target.scrollY,
        readViewportSize: () => target.innerHeight,
        writeOffset: (offset, behavior) => target.scrollTo({ behavior, top: offset }),
      },
    };
  }

  const resizeObserver = new ResizeObserver(onResize);

  target.addEventListener('scroll', onScroll, { passive: true });
  resizeObserver.observe(target);

  return {
    detach() {
      target.removeEventListener('scroll', onScroll);
      resizeObserver.disconnect();
    },
    scrollTo: (left, top, behavior) => target.scrollTo({ behavior, left, top }),
    x: {
      readOffset: () => target.scrollLeft,
      readViewportSize: () => target.clientWidth,
      writeOffset: (offset, behavior) => target.scrollTo({ behavior, left: offset }),
    },
    y: {
      readOffset: () => target.scrollTop,
      readViewportSize: () => target.clientHeight,
      writeOffset: (offset, behavior) => target.scrollTo({ behavior, top: offset }),
    },
  };
}

// ─── Numeric helpers ───────────────────────────────────────────────────────────

export function toNonNegativeInt(value: number, fallback = 0): number {
  if (!Number.isFinite(value)) return fallback;

  return Math.max(0, Math.floor(value));
}

export function toPositiveNumber(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) return fallback;

  return value;
}

export function isWindowTarget(target: ScrollTarget): target is Window {
  return (
    (typeof Window !== 'undefined' && target instanceof Window) ||
    (typeof (target as Window).innerHeight === 'number' && typeof (target as Window).document === 'object')
  );
}

export function normalizeOverscan(overscan: Overscan | undefined, defaultVal: number): { end: number; start: number } {
  return {
    end: toNonNegativeInt(overscan?.end ?? defaultVal),
    start: toNonNegativeInt(overscan?.start ?? defaultVal),
  };
}

export function resolveEstimateFn(
  estimate: number | ((index: number) => number) | undefined,
  defaultSize: number,
): (index: number) => number {
  if (typeof estimate === 'function') {
    return (index: number) => toPositiveNumber(estimate(index), defaultSize);
  }

  const size = typeof estimate === 'number' ? toPositiveNumber(estimate, defaultSize) : defaultSize;

  return () => size;
}
