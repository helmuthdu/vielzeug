import { signal, type ReadonlySignal } from '@vielzeug/stateit';

import { onCleanup } from './runtime';

/**
 * Observes an element's content-box size via `ResizeObserver`.
 * Returns a `ReadonlySignal` that updates whenever the dimensions change.
 * Must be called inside an {@link onMount} callback.
 *
 * @example
 * onMount(() => {
 *   const size = observeResize(containerRef.value!);
 *   effect(() => console.log(size.value.width, size.value.height));
 * });
 */
export const observeResize = (el: Element): ReadonlySignal<{ height: number; width: number }> => {
  const size = signal({ height: 0, width: 0 });
  const ro = new ResizeObserver(([entry]) => {
    if (!entry) return;

    const box = entry.contentBoxSize[0];

    if (box) size.value = { height: box.blockSize, width: box.inlineSize };
  });

  ro.observe(el);
  onCleanup(() => ro.disconnect());

  return size;
};

/**
 * Observes an element's intersection with the viewport (or a given root) via
 * `IntersectionObserver`. Returns a `ReadonlySignal` that updates whenever the
 * intersection ratio changes.
 * Must be called inside an {@link onMount} callback.
 *
 * @example
 * onMount(() => {
 *   const entry = observeIntersection(cardRef.value!);
 *   effect(() => console.log(entry.value.isIntersecting));
 * });
 */
export const observeIntersection = (
  el: Element,
  options?: IntersectionObserverInit,
): ReadonlySignal<IntersectionObserverEntry | null> => {
  const entry = signal<IntersectionObserverEntry | null>(null);
  const io = new IntersectionObserver(([e]) => {
    if (e) entry.value = e;
  }, options);

  io.observe(el);
  onCleanup(() => io.disconnect());

  return entry;
};

/**
 * Observes a CSS media query via `window.matchMedia`. Returns a `ReadonlySignal`
 * that is `true` when the query matches and `false` when it does not.
 * Must be called inside an {@link onMount} callback.
 *
 * @example
 * onMount(() => {
 *   const prefersReducedMotion = observeMedia('(prefers-reduced-motion: reduce)');
 *   effect(() => console.log(prefersReducedMotion.value));
 * });
 */
export const observeMedia = (query: string): ReadonlySignal<boolean> => {
  const mql = window.matchMedia(query);
  const matches = signal(mql.matches);
  const handler = (e: MediaQueryListEvent) => {
    matches.value = e.matches;
  };

  mql.addEventListener('change', handler);
  onCleanup(() => mql.removeEventListener('change', handler));

  return matches;
};
