import { createIntersection, type IntersectionState, type Sentinel } from '@vielzeug/sentinel';

/**
 * Adds `data-revealed` to every `[data-reveal]` element inside `root` once it
 * scrolls into view. Elements are revealed at most once; the sentinel is
 * disposed immediately after. If IntersectionObserver is unavailable the
 * content is revealed right away: the page never hides copy behind a missing
 * API. Returns a cleanup function.
 */
export function observeReveals(root: ParentNode): () => void {
  const controller = new AbortController();

  for (const element of root.querySelectorAll<HTMLElement>('[data-reveal]')) {
    const reveal = (): void => {
      element.toggleAttribute('data-revealed', true);
    };

    let sentinel: Sentinel<IntersectionState | null>;
    try {
      sentinel = createIntersection(element, { rootMargin: '0px 0px -10% 0px', signal: controller.signal });
    } catch {
      reveal();
      continue;
    }

    const unsubscribe = sentinel.subscribe(() => {
      if (!sentinel.getSnapshot()?.isIntersecting) return;
      reveal();
      sentinel.dispose();
    });
    controller.signal.addEventListener('abort', unsubscribe, { once: true });
  }

  return () => controller.abort();
}
