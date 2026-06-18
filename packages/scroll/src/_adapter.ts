import { type ScrollTarget, isWindowTarget } from './utils';

/** Single-axis read/write interface for either horizontal or vertical scroll. */
export type Axis = {
  readOffset: () => number;
  readViewportSize: () => number;
  writeOffset: (offset: number, behavior: ScrollBehavior) => void;
};

/** Unified two-axis scroll adapter returned by `createScrollAdapter`. */
export type ScrollAdapter = {
  /** Detach all listeners (scroll + resize). Call in _dispose(). */
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

  // ⚠️ ResizeObserver is assumed to exist (supported in all modern browsers).
  // In SSR or older environments, callers must polyfill before constructing a virtualizer.
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
