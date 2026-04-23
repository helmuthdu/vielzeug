import { signal, type ReadonlySignal } from '@vielzeug/stateit';

import { onCleanup } from '../runtime';

/**
 * Observes an element's content-box size via `ResizeObserver`.
 * Returns a `ReadonlySignal` that updates whenever the dimensions change.
 * Must be called inside a `mount()` callback.
 */
export const resizeObserver = (el: Element): ReadonlySignal<{ height: number; width: number }> => {
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
