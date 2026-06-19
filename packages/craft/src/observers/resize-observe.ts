import { type Readable, signal, onCleanup } from '@vielzeug/ripple';

/**
 * Observes an element's content-box size via `ResizeObserver`.
 * Returns a `Reactive` that updates whenever the dimensions change.
 * Must be called inside a `mount()` callback.
 */
export const resizeObserver = (el: Element): Readable<{ height: number; width: number }> => {
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
