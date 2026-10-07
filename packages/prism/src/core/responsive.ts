export function observeResize(el: HTMLElement, callback: (width: number, height: number) => void): () => void {
  // Environments without ResizeObserver (jsdom, SSR) get a no-op subscription: the chart
  // keeps its initial getBoundingClientRect size and never observes, instead of throwing.
  if (typeof ResizeObserver === 'undefined') return () => {};

  let rafId: number | null = null;

  const observer = new ResizeObserver((entries) => {
    if (rafId !== null) cancelAnimationFrame(rafId);

    rafId = requestAnimationFrame(() => {
      rafId = null;

      const entry = entries[0];

      if (entry) {
        const { height, width } = entry.contentRect;

        callback(width, height);
      }
    });
  });

  observer.observe(el);

  return () => {
    if (rafId !== null) cancelAnimationFrame(rafId);

    observer.disconnect();
  };
}
