import { onCleanup } from '../runtime';

import { signal, type ReadonlySignal } from '@vielzeug/ripple';

/**
 * Observes an element's intersection with the viewport (or a given root) via
 * `IntersectionObserver`. Returns a `ReadonlySignal` that updates whenever the
 * intersection ratio changes.
 * Must be called inside a `mount()` callback.
 */
export const intersectionObserver = (
  el: Element,
  options?: IntersectionObserverInit,
): ReadonlySignal<IntersectionObserverEntry | null> => {
  const entry = signal<IntersectionObserverEntry | null>(null);
  const io = new IntersectionObserver(([nextEntry]) => {
    if (nextEntry) entry.value = nextEntry;
  }, options);

  io.observe(el);
  onCleanup(() => io.disconnect());

  return entry;
};
