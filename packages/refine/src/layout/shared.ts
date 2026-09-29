/**
 * Private helpers shared by the responsive layout components (`ore-sidebar`,
 * `ore-navbar`). Deliberately not re-exported from the layout barrel: these
 * encode internal container behavior, not a public API.
 */

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
