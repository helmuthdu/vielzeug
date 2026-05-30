import { throttle } from '@vielzeug/arsenal';

import type { ReferenceElement } from './types';

import { isElement } from './utils';

export interface AutoUpdateOptions {
  /** Watch the floating element for size changes. Default: `true`. */
  observeFloating?: boolean;
  /**
   * Listen to scroll events on ancestor scroll containers of the reference element,
   * rather than on the window (capture-phase). More efficient in deeply nested DOMs.
   * Default: `true`.
   */
  observeAncestors?: boolean;
  /** Track visual viewport scroll and resize (useful for pinch-zoom). Default: `true`. */
  observeVisualViewport?: boolean;
  /** Re-position on every animation frame. Use only when the reference itself animates. Default: `false`. */
  animationFrame?: boolean;
  /**
   * Throttle update calls to at most once every `throttle` milliseconds.
   * Uses a leading + trailing strategy: fires immediately, then once more after the interval.
   * Default: `0` (no throttling).
   */
  throttle?: number;
}

/**
 * Collects the ancestor scroll containers of an element (up to and including the
 * nearest scrollable ancestor). Used to scope scroll listeners to the minimal
 * set of elements rather than relying on a capture-phase window listener.
 */
function getScrollAncestors(el: Element): Element[] {
  const ancestors: Element[] = [];
  let current: Element | null = el.parentElement;

  while (current) {
    const style = getComputedStyle(current);
    const overflow = style.overflow + style.overflowX + style.overflowY;

    if (/auto|scroll|overlay/.test(overflow)) {
      ancestors.push(current);
    }

    current = current.parentElement;
  }

  return ancestors;
}

/**
 * Calls `update` immediately and re-calls it whenever the reference or floating element
 * could have changed position: scroll, resize, ResizeObserver, or animation frames.
 *
 * By default, scroll listeners are attached to ancestor scroll containers of the reference
 * element rather than the window, reducing overhead in deeply nested DOMs.
 * Set `observeAncestors: false` to fall back to a window capture-phase scroll listener.
 *
 * Returns a cleanup function that removes all listeners.
 *
 * @example
 * ```ts
 * const cleanup = autoUpdate(reference, floating, () => {
 *   const { x, y } = computePosition(reference, floating, options);
 *   floating.style.left = `${x}px`;
 *   floating.style.top  = `${y}px`;
 * });
 * // later:
 * cleanup();
 * ```
 */
export function autoUpdate(
  reference: ReferenceElement,
  floating: HTMLElement,
  update: () => void,
  {
    animationFrame = false,
    observeAncestors = true,
    observeFloating = true,
    observeVisualViewport = true,
    throttle: throttleMs = 0,
  }: AutoUpdateOptions = {},
): () => void {
  const throttled = throttleMs > 0 ? throttle(update, throttleMs, { leading: true, trailing: true }) : null;
  const notify = throttled ?? update;

  notify();

  const cleanups: Array<() => void> = [];

  if (isElement(reference) && observeAncestors) {
    // Targeted: listen on each ancestor scroll container.
    const ancestors = getScrollAncestors(reference);

    if (ancestors.length > 0) {
      for (const ancestor of ancestors) {
        ancestor.addEventListener('scroll', notify, { passive: true });
        cleanups.push(() => ancestor.removeEventListener('scroll', notify));
      }
    } else {
      // No scrollable ancestors (direct child of body) — fall back to window scroll.
      window.addEventListener('scroll', notify, { passive: true });
      cleanups.push(() => window.removeEventListener('scroll', notify));
    }
  } else {
    // VirtualReference or observeAncestors: false — capture-phase window listener.
    const scrollHandler = (e: Event): void => {
      if (e.composedPath().includes(floating)) return;

      notify();
    };

    window.addEventListener('scroll', scrollHandler, { capture: true, passive: true });
    cleanups.push(() => window.removeEventListener('scroll', scrollHandler, { capture: true }));
  }

  window.addEventListener('resize', notify, { passive: true });
  cleanups.push(() => window.removeEventListener('resize', notify));

  const vv = observeVisualViewport ? window.visualViewport : null;

  if (vv) {
    vv.addEventListener('resize', notify, { passive: true });
    vv.addEventListener('scroll', notify, { passive: true });
    cleanups.push(() => {
      vv.removeEventListener('resize', notify);
      vv.removeEventListener('scroll', notify);
    });
  }

  const ro = new ResizeObserver(notify);

  if (isElement(reference)) ro.observe(reference);

  if (observeFloating) ro.observe(floating);

  cleanups.push(() => ro.disconnect());

  let frameId = 0;

  if (animationFrame) {
    const frameLoop = (): void => {
      notify();
      frameId = window.requestAnimationFrame(frameLoop);
    };

    frameId = window.requestAnimationFrame(frameLoop);
    cleanups.push(() => window.cancelAnimationFrame(frameId));
  }

  return (): void => {
    throttled?.cancel();

    for (const fn of cleanups) fn();
  };
}
