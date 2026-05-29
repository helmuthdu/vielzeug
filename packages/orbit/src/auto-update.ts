import type { Cleanup, ReferenceElement } from './types';

import { isElement } from './utils';

export interface AutoUpdateOptions {
  /** Watch the floating element for size changes. Default: `true`. */
  observeFloating?: boolean;
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

function createThrottled(fn: () => void, ms: number): [call: () => void, cancel: () => void] {
  let last = 0;
  let pending: ReturnType<typeof setTimeout> | undefined;

  const call = (): void => {
    const now = Date.now();
    const elapsed = now - last;

    if (elapsed >= ms) {
      clearTimeout(pending);
      pending = undefined;
      last = now;
      fn();
    } else if (!pending) {
      pending = setTimeout(() => {
        pending = undefined;
        last = Date.now();
        fn();
      }, ms - elapsed);
    }
  };

  const cancel = (): void => {
    clearTimeout(pending);
    pending = undefined;
  };

  return [call, cancel];
}

/**
 * Calls `update` immediately and re-calls it whenever the reference or floating element
 * could have changed position: scroll, resize, ResizeObserver, or animation frames.
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
    observeFloating = true,
    observeVisualViewport = true,
    throttle = 0,
  }: AutoUpdateOptions = {},
): Cleanup {
  const [notify, cancelThrottle] = throttle > 0 ? createThrottled(update, throttle) : [update, (): void => {}];

  notify();

  const scrollHandler = (e: Event): void => {
    if (e.composedPath().includes(floating)) return;

    notify();
  };

  window.addEventListener('scroll', scrollHandler, { capture: true, passive: true });
  window.addEventListener('resize', notify, { passive: true });

  const vv = observeVisualViewport ? window.visualViewport : null;

  vv?.addEventListener('resize', notify, { passive: true });
  vv?.addEventListener('scroll', notify, { passive: true });

  const ro = new ResizeObserver(notify);

  if (isElement(reference)) ro.observe(reference);

  if (observeFloating) ro.observe(floating);

  let frameId = 0;

  if (animationFrame) {
    const frameLoop = (): void => {
      notify();
      frameId = window.requestAnimationFrame(frameLoop);
    };

    frameId = window.requestAnimationFrame(frameLoop);
  }

  return (): void => {
    cancelThrottle();
    window.removeEventListener('scroll', scrollHandler, { capture: true });
    window.removeEventListener('resize', notify);
    vv?.removeEventListener('resize', notify);
    vv?.removeEventListener('scroll', notify);
    ro.disconnect();

    if (frameId) window.cancelAnimationFrame(frameId);
  };
}
