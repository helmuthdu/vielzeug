import { AssayQueryError } from './errors';

/** DOM query helpers for test environments. */

// ─── Types ───────────────────────────────────────────────────────────────────

/** Scoped query helpers for any queryable DOM root — see {@link within}. */
export interface QueryScope {
  get<E extends Element = Element>(selector: string): E;
  getByTestId<E extends Element = Element>(testId: string): E;
  getByText<E extends Element = Element>(text: string, selector?: string): E;
  query<E extends Element = Element>(selector: string): E | null;
  queryAll<E extends Element = Element>(selector: string): E[];
  queryAllByTestId<E extends Element = Element>(testId: string): E[];
  queryAllByText<E extends Element = Element>(text: string, selector?: string): E[];
  queryByTestId<E extends Element = Element>(testId: string): E | null;
  queryByText<E extends Element = Element>(text: string, selector?: string): E | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type QueryRoot = ParentNode;

const describeRoot = (root: QueryRoot): string => {
  if (root instanceof Element) return root.outerHTML.slice(0, 500);

  if (root instanceof ShadowRoot) return `<shadow-root>${root.innerHTML.slice(0, 500)}</shadow-root>`;

  return root.nodeName;
};

const requireMatch = <E extends Element>(element: E | null, description: string, root: QueryRoot): E => {
  if (element) return element;

  throw new AssayQueryError(`Unable to find ${description} within ${describeRoot(root)}.`);
};

const query = <E extends Element = Element>(root: QueryRoot, selector: string): E | null =>
  root.querySelector<E>(selector);

const queryAll = <E extends Element = Element>(root: QueryRoot, selector: string): E[] => {
  return Array.from(root.querySelectorAll<E>(selector));
};

const queryByTestId = <E extends Element = Element>(root: QueryRoot, testId: string): E | null =>
  queryAll<E>(root, '[data-testid]').find((element) => element.getAttribute('data-testid') === testId) ?? null;

const queryAllByTestId = <E extends Element = Element>(root: QueryRoot, testId: string): E[] =>
  queryAll<E>(root, '[data-testid]').filter((element) => element.getAttribute('data-testid') === testId);

const queryByText = <E extends Element = Element>(root: QueryRoot, text: string, selector = '*'): E | null => {
  for (const el of root.querySelectorAll<E>(selector)) {
    if (el.textContent?.trim() === text) return el;
  }

  return null;
};

const queryAllByText = <E extends Element = Element>(root: QueryRoot, text: string, selector = '*'): E[] => {
  return Array.from(root.querySelectorAll<E>(selector)).filter((el) => el.textContent?.trim() === text);
};

/**
 * Queries the shadow root of a custom element for a matching CSS selector.
 * Returns `null` if the element has no shadow root or no match is found — safe to call on
 * both open-shadow custom elements and plain elements without checking `shadowRoot` first.
 */
export function queryInShadow<E extends Element = Element>(host: Element, selector: string): E | null {
  return host.shadowRoot ? query<E>(host.shadowRoot, selector) : null;
}

/** Queries all matching elements inside the shadow root of a custom element. */
export function queryAllInShadow<E extends Element = Element>(host: Element, selector: string): E[] {
  return host.shadowRoot ? queryAll<E>(host.shadowRoot, selector) : [];
}

/**
 * Queries a shadow DOM element by its CSS `part` attribute — shorthand for
 * `queryInShadow(host, '[part="name"]')`.
 *
 * @example
 * const btn = queryPart(carousel, 'prev-btn');
 * expect(btn).not.toBeNull();
 */
export function queryPart<E extends Element = Element>(host: Element, part: string): E | null {
  return (
    queryAllInShadow<E>(host, '[part]').find((element) => element.getAttribute('part')?.split(/\s+/).includes(part)) ??
    null
  );
}

/**
 * Returns the light-DOM children assigned to a named slot, or every child assigned to the
 * default slot when no name is given.
 *
 * @example
 * const slides = getSlotted(carousel);
 * expect(slides).toHaveLength(3);
 */
export function getSlotted<E extends Element = Element>(host: Element, slotName?: string): E[] {
  return Array.from(host.children).filter((element) =>
    slotName === undefined ? !element.getAttribute('slot') : element.getAttribute('slot') === slotName,
  ) as E[];
}

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Create query helpers scoped to a DOM root — useful for light DOM and shadow roots.
 *
 * @example
 * const view = within(fixture.shadow!);
 * expect(view.get('.title').textContent).toBe('Hello');
 */
export function within(root: QueryRoot): QueryScope {
  return {
    get: <E extends Element = Element>(selector: string) =>
      requireMatch(query<E>(root, selector), `"${selector}"`, root),
    getByTestId: <E extends Element = Element>(testId: string) =>
      requireMatch(queryByTestId<E>(root, testId), `data-testid "${testId}"`, root),
    getByText: <E extends Element = Element>(text: string, selector = '*') =>
      requireMatch(queryByText<E>(root, text, selector), `text "${text}" matching "${selector}"`, root),
    query: <E extends Element = Element>(selector: string) => query<E>(root, selector),
    queryAll: <E extends Element = Element>(selector: string) => queryAll<E>(root, selector),
    queryAllByTestId: <E extends Element = Element>(testId: string) => queryAllByTestId<E>(root, testId),
    queryAllByText: <E extends Element = Element>(text: string, selector = '*') =>
      queryAllByText<E>(root, text, selector),
    queryByTestId: <E extends Element = Element>(testId: string) => queryByTestId<E>(root, testId),
    queryByText: <E extends Element = Element>(text: string, selector = '*') => queryByText<E>(root, text, selector),
  };
}
