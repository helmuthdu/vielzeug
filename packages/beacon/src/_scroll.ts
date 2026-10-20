import { resolveTarget } from './target';
import type { BeaconTarget } from './types';

/** Options for {@link scrollTargetIntoView}. */
export interface ScrollIntoViewOptions {
  /** Scroll behavior. Default `'smooth'` when the user has not requested reduced motion, else `'auto'`. */
  readonly behavior?: 'auto' | 'instant' | 'smooth';
  /** Pixels reserved at the top of the viewport for sticky headers. Number or a function read at scroll time. Default `0`. */
  readonly offset?: number | (() => number);
}

const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Centers a target in the viewport, keeping it clear of a sticky header.
 * Returns whether the target was found. No-op without a DOM.
 */
export function scrollTargetIntoView(target: BeaconTarget, options: ScrollIntoViewOptions = {}): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;

  const before = resolveTarget(target);
  if (!before) return false;

  const behavior = options.behavior ?? (prefersReducedMotion() ? 'auto' : 'smooth');
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const reserved = typeof options.offset === 'function' ? options.offset() : (options.offset ?? 0);
  // The rect is viewport-space; scrolling answers in document space.
  const documentTop = before.y + (globalThis.scrollY ?? 0);

  // Center first: the cheapest correct default for tall and short targets alike.
  const idealTop = documentTop - (viewportHeight - before.height) / 2;
  // A sticky header covers the top `reserved` px: when the target's top edge
  // would land inside that band, sit it just below the reserved area instead.
  // One scrollTo: a second smooth scroll would interrupt the first mid-flight.
  const correctedTop = reserved > 0 && documentTop - idealTop < reserved ? documentTop - reserved : idealTop;
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - viewportHeight);
  const clampedTop = Math.min(Math.max(0, correctedTop), maxScroll);

  window.scrollTo({ behavior, top: clampedTop });

  return true;
}
