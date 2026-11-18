/**
 * Keeps the shared info badge clear of the floating bottom dock.
 *
 * The dock capsule's height is content-driven (tool groups wrap on narrow
 * viewports, and the zoom cluster joins the row), so the badge cannot assume
 * a fixed clearance. Observing the dock's box and publishing its height as
 * `--dock-height` lets `.studio-badge` sit a constant gap above whatever the
 * dock actually occupies.
 */
export function trackDockHeight(dock: HTMLElement, scope: HTMLElement): () => void {
  const publish = (height: number): void => {
    if (height > 0) scope.style.setProperty('--dock-height', `${Math.round(height)}px`);
  };
  // Measure now as well as on resize: the observer's first callback waits for
  // the next rendered frame, which can be deferred (background tab), and the
  // badge must not sit under the dock in the meantime.
  publish(dock.getBoundingClientRect().height);
  const observer = new ResizeObserver(([entry]) => {
    publish(entry?.borderBoxSize?.[0]?.blockSize ?? entry?.contentRect.height ?? 0);
  });
  observer.observe(dock);
  return () => observer.disconnect();
}
