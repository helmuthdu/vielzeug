import { createIntersection, type IntersectionState, type Sentinel } from '@vielzeug/sentinel';

/**
 * Scroll-spy: keeps the in-page `ore-navbar-item`s honest about which section
 * you are reading. A one-pixel observation line across the viewport (via
 * `rootMargin`) is intersected against each nav-target section;
 * whichever section spans the line becomes `active` on every navbar item that
 * links to it (which renders `aria-current="page"`). A guard on the leave
 * handler keeps a section from clearing the flag after the next section has
 * already claimed it, so scrolling never flickers. If IntersectionObserver is
 * unavailable the spy simply stays off. Returns a cleanup function.
 */
export function observeActiveSections(root: ParentNode): () => void {
  const itemsBySection = new Map<string, HTMLElement[]>();
  for (const item of root.querySelectorAll<HTMLElement>('ore-navbar-item[href^="#"], [data-scroll-link][href^="#"]')) {
    const id = (item.getAttribute('href') ?? '').slice(1);
    if (!id) continue;
    const items = itemsBySection.get(id);
    if (items) items.push(item);
    else itemsBySection.set(id, [item]);
  }

  let current: string | null = null;
  const setActive = (id: string | null): void => {
    if (id === current) return;
    current = id;
    for (const [sectionId, items] of itemsBySection) {
      for (const item of items) {
        if (item.localName === 'ore-navbar-item') {
          if (sectionId === id) item.setAttribute('active', '');
          else item.removeAttribute('active');
        } else if (sectionId === id) {
          item.setAttribute('aria-current', 'location');
        } else {
          item.removeAttribute('aria-current');
        }
      }
    }
  };

  const document_ = root instanceof Document ? root : root.ownerDocument;
  const view = document_?.defaultView;
  if (!document_ || !view) return () => {};

  let observerController: AbortController | null = null;
  const observeSections = (): void => {
    observerController?.abort();
    observerController = new AbortController();

    const lineTop = Math.floor(view.innerHeight * 0.45);
    const lineBottom = Math.max(0, view.innerHeight - lineTop - 1);
    const rootMargin = `-${lineTop}px 0px -${lineBottom}px 0px`;

    for (const id of itemsBySection.keys()) {
      const section = document_.getElementById(id);
      if (!section) continue;
      let sentinel: Sentinel<IntersectionState | null>;
      try {
        sentinel = createIntersection(section, { rootMargin, signal: observerController.signal });
      } catch {
        continue;
      }
      const unsubscribe = sentinel.subscribe(() => {
        if (sentinel.getSnapshot()?.isIntersecting) setActive(id);
        else if (current === id) setActive(null);
      });
      observerController.signal.addEventListener('abort', unsubscribe, { once: true });
    }
  };

  observeSections();
  view.addEventListener('resize', observeSections);

  return () => {
    view.removeEventListener('resize', observeSections);
    observerController?.abort();
  };
}
