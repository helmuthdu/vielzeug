import { isStaticTarget, targetAvailable, targetElement } from './target';
import type { BeaconTarget } from './types';

/**
 * @internal Calls `onChange` whenever a target's availability flips: element
 * added, removed, or a resolver's result changing. Selector and resolver targets
 * are polled on DOM mutations; static element and rect targets never change
 * availability, so there is nothing to observe and this returns `null`.
 */
export function observeTarget(target: BeaconTarget, onChange: () => void, signal: AbortSignal): (() => void) | null {
  if (isStaticTarget(target)) return null;
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return null;

  let lastAvailable = targetAvailable(target);
  const observer = new MutationObserver(() => {
    const next = targetAvailable(target);
    if (next !== lastAvailable) {
      lastAvailable = next;
      onChange();
    }
  });

  observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
  const stop = (): void => {
    observer.disconnect();
    signal.removeEventListener('abort', stop);
  };
  signal.addEventListener('abort', stop, { once: true });

  return stop;
}

/**
 * @internal Calls `onChange` whenever a target's box moves or resizes without a
 * window scroll or resize: content added above it, a grid reflow, a collapsing
 * menu. Watches the resolved element itself and `document.body`, so both the
 * element's own size changes and sibling/parent growth that pushes it around
 * report. Rect targets have no element to watch and return `null`; they stay
 * scroll/resize-only.
 */
export function observeTargetLayout(
  target: BeaconTarget,
  onChange: () => void,
  signal: AbortSignal,
): (() => void) | null {
  const element = targetElement(target);

  if (!element || typeof document === 'undefined' || typeof ResizeObserver === 'undefined') return null;

  const observer = new ResizeObserver(onChange);

  observer.observe(element);
  // The body watch is the sibling-growth catch: adding a tile below a target
  // does not resize the target, but it resizes the page.
  observer.observe(document.body);

  const stop = (): void => {
    observer.disconnect();
    signal.removeEventListener('abort', stop);
  };
  signal.addEventListener('abort', stop, { once: true });

  return stop;
}
