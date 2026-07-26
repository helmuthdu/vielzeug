/**
 * DOM query helpers for test environments.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** Scoped query helpers for any DOM element — see {@link within} */
export interface QueryScope {
  query<E extends Element = Element>(selector: string): E | null;
  queryAll<E extends Element = Element>(selector: string): E[];
  queryByText<E extends Element = Element>(text: string, selector?: string): E | null;
  queryAllByText<E extends Element = Element>(text: string, selector?: string): E[];
  queryByTestId<E extends Element = Element>(testId: string): E | null;
  queryAllByTestId<E extends Element = Element>(testId: string): E[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Query a single element within `root`. Equivalent to `root.querySelector(selector)`. */
export function query<E extends Element = Element>(root: Element | ShadowRoot, selector: string): E | null {
  return root.querySelector<E>(selector);
}

/** Query every element within `root` matching `selector`. */
export function queryAll<E extends Element = Element>(root: Element | ShadowRoot, selector: string): E[] {
  return Array.from(root.querySelectorAll<E>(selector));
}

/** Query a single element within `root` by its `data-testid` attribute. */
export function queryByTestId<E extends Element = Element>(root: Element | ShadowRoot, testId: string): E | null {
  return root.querySelector<E>(`[data-testid="${testId}"]`);
}

/** Query every element within `root` matching a `data-testid` attribute. */
export function queryAllByTestId<E extends Element = Element>(root: Element | ShadowRoot, testId: string): E[] {
  return Array.from(root.querySelectorAll<E>(`[data-testid="${testId}"]`));
}

export function queryByText<E extends Element = Element>(
  root: Element | ShadowRoot,
  text: string,
  selector: string,
): E | null {
  for (const el of root.querySelectorAll<E>(selector)) {
    if (el.textContent?.trim() === text) return el;
  }

  return null;
}

export function queryAllByText<E extends Element = Element>(
  root: Element | ShadowRoot,
  text: string,
  selector: string,
): E[] {
  return Array.from(root.querySelectorAll<E>(selector)).filter((el) => el.textContent?.trim() === text);
}

/**
 * Queries the shadow root of a custom element for a matching CSS selector.
 * Returns `null` if the element has no shadow root or no match is found — safe to call on
 * both open-shadow custom elements and plain elements without checking `shadowRoot` first.
 */
export function queryInShadow<E extends Element = Element>(host: Element, selector: string): E | null {
  return host.shadowRoot?.querySelector<E>(selector) ?? null;
}

/** Queries all matching elements inside the shadow root of a custom element. */
export function queryAllInShadow<E extends Element = Element>(host: Element, selector: string): E[] {
  return Array.from(host.shadowRoot?.querySelectorAll<E>(selector) ?? []);
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
  return queryInShadow<E>(host, `[part="${part}"]`);
}

/**
 * Returns the light-DOM children assigned to a named slot, or every slotted child (elements
 * with no `slot` attribute) when no name is given.
 *
 * @example
 * const slides = getSlotted(carousel);
 * expect(slides).toHaveLength(3);
 */
export function getSlotted<E extends Element = Element>(host: Element, slotName?: string): E[] {
  const selector = slotName ? `[slot="${slotName}"]` : ':not([slot])';

  return Array.from(host.querySelectorAll<E>(`:scope > ${selector}`));
}

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Create query helpers scoped to any element — useful for slotted/light DOM content.
 *
 * @example
 * const panel = fixture.query('.panel')!;
 * const { query } = within(panel);
 * expect(query('.title')?.textContent).toBe('Hello');
 */
export function within(element: Element): QueryScope {
  return {
    query: <E extends Element = Element>(selector: string) => query<E>(element, selector),
    queryAll: <E extends Element = Element>(selector: string) => queryAll<E>(element, selector),
    queryAllByTestId: <E extends Element = Element>(testId: string) => queryAllByTestId<E>(element, testId),
    queryAllByText: <E extends Element = Element>(text: string, selector = '*') =>
      queryAllByText<E>(element, text, selector),
    queryByTestId: <E extends Element = Element>(testId: string) => queryByTestId<E>(element, testId),
    queryByText: <E extends Element = Element>(text: string, selector = '*') => queryByText<E>(element, text, selector),
  };
}
