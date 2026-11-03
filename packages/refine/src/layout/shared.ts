/**
 * Private helpers shared by the responsive layout components (`ore-sidebar`,
 * `ore-navbar`, `ore-dock`). Deliberately not re-exported from the layout barrel:
 * these encode internal container behavior, not a public API.
 */

/**
 * Subscribe to an event and return its teardown. Returns a no-op for a missing
 * target so callers can pass an optional element without branching.
 */
export const listen = <E extends Event = Event>(
  el: EventTarget | null | undefined,
  name: string,
  handler: (e: E) => void,
  options?: AddEventListenerOptions,
): (() => void) => {
  if (!el) return () => {};

  el.addEventListener(name, handler as EventListener, options);

  return () => el.removeEventListener(name, handler as EventListener, options);
};

/**
 * The nearest scrollable ancestor, so a component pinned to the viewport can
 * listen for the scroll that actually moves it: a bar inside a scrolling panel
 * never sees a `window` scroll event.
 */
export const findScrollContainer = (start: HTMLElement): HTMLElement | null => {
  let current: HTMLElement | null = start.parentElement;

  while (current) {
    const { overflowY } = window.getComputedStyle(current);

    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
      return current;
    }

    current = current.parentElement;
  }

  return null;
};

/** Parses the px value out of a container-query string like `(max-width: 768px)`. */
export const parseMaxWidthPx = (query: string | undefined): number | undefined => {
  const value = String(query ?? '').trim();

  if (!value) return undefined;

  const match = /max-width\s*:\s*([0-9]+(?:\.[0-9]+)?)px/i.exec(value);

  if (!match) return undefined;

  const parsed = Number.parseFloat(match[1]);

  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * The element whose width the component measures against, skipping transparent
 * `ore-grid-item` wrappers so a component inside a grid still sees its real container.
 */
export const resolveContainerElement = (el: HTMLElement): HTMLElement | null => {
  let container = el.parentElement;

  while (container?.tagName.toLowerCase() === 'ore-grid-item') {
    container = container.parentElement;
  }

  return container;
};

/** The container width to test against a breakpoint, falling back to the element itself. */
export const readContainerWidth = (el: HTMLElement): number => {
  const parentWidth = resolveContainerElement(el)?.clientWidth ?? 0;

  if (parentWidth > 0) return parentWidth;

  return el.offsetWidth;
};
