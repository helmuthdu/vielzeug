import { throttle } from '@vielzeug/arsenal';

import type { ReferenceElement } from './types';

import { isElement } from './utils';

export interface AutoUpdateOptions {
  /** Watch the floating element for size changes. Default: `true`. */
  observeFloating?: boolean;
  /**
   * Listen to scroll events on ancestor scroll containers of the reference element
   * in addition to the window. More efficient in deeply nested DOMs.
   * Set to `false` to use only a capture-phase window listener.
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
  /**
   * Pause position updates while the reference element is scrolled out of the viewport.
   * Uses IntersectionObserver to detect visibility. When the reference becomes visible again,
   * one position update is fired immediately.
   * Default: `true`.
   */
  pauseWhenHidden?: boolean;
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
 * By default, scroll listeners are attached to both ancestor scroll containers of the reference
 * AND the window (for document scroll). The ancestor listeners fire for nested container scrolls;
 * the window listener fires for page-level scroll. Set `observeAncestors: false` to use only a
 * capture-phase window listener.
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
    pauseWhenHidden = true,
    throttle: throttleMs = 0,
  }: AutoUpdateOptions = {},
): () => void {
  const throttled = throttleMs > 0 ? throttle(update, throttleMs, { leading: true, trailing: true }) : null;
  const notify = throttled ?? update;

  // ── Visibility-aware wrapper (F2) ───────────────────────────────────────────
  let referenceVisible = true;
  const conditionalNotify = (): void => {
    if (referenceVisible) notify();
  };

  // Initial call always runs regardless of visibility state.
  notify();

  const cleanups: Array<() => void> = [];

  // IntersectionObserver: pause updates when reference is off-screen.
  if (pauseWhenHidden && isElement(reference) && typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver((entries) => {
      referenceVisible = entries.at(-1)?.isIntersecting ?? true;

      if (referenceVisible) notify(); // Re-position immediately when becoming visible.
    });

    io.observe(reference);
    cleanups.push(() => io.disconnect());
  }

  // ── Scroll listeners ────────────────────────────────────────────────────────
  if (isElement(reference) && observeAncestors) {
    // Targeted ancestor listeners for nested container scroll.
    const ancestors = getScrollAncestors(reference);

    for (const ancestor of ancestors) {
      ancestor.addEventListener('scroll', conditionalNotify, { passive: true });
      cleanups.push(() => ancestor.removeEventListener('scroll', conditionalNotify));
    }

    // Always add window scroll for document-level scroll (non-capture, doesn't fire for nested containers).
    window.addEventListener('scroll', conditionalNotify, { passive: true });
    cleanups.push(() => window.removeEventListener('scroll', conditionalNotify));
  } else {
    // VirtualReference or observeAncestors: false — capture-phase window listener catches all scrolls.
    const scrollHandler = (e: Event): void => {
      if (e.composedPath().includes(floating)) return;

      conditionalNotify();
    };

    window.addEventListener('scroll', scrollHandler, { capture: true, passive: true });
    cleanups.push(() => window.removeEventListener('scroll', scrollHandler, { capture: true }));
  }

  window.addEventListener('resize', conditionalNotify, { passive: true });
  cleanups.push(() => window.removeEventListener('resize', conditionalNotify));

  const vv = observeVisualViewport ? window.visualViewport : null;

  if (vv) {
    vv.addEventListener('resize', conditionalNotify, { passive: true });
    vv.addEventListener('scroll', conditionalNotify, { passive: true });
    cleanups.push(() => {
      vv.removeEventListener('resize', conditionalNotify);
      vv.removeEventListener('scroll', conditionalNotify);
    });
  }

  const ro = new ResizeObserver(conditionalNotify);

  if (isElement(reference)) ro.observe(reference);

  if (observeFloating) ro.observe(floating);

  cleanups.push(() => ro.disconnect());

  let frameId = 0;

  if (animationFrame) {
    const frameLoop = (): void => {
      conditionalNotify();
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
