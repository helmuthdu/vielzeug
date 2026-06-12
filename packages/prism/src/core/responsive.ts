export function observeResize(el: HTMLElement, callback: (width: number, height: number) => void): () => void {
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
