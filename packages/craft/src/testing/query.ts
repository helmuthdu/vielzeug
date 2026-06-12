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
    query: <E extends Element = Element>(selector: string) => element.querySelector<E>(selector),
    queryAll: <E extends Element = Element>(selector: string) => Array.from(element.querySelectorAll<E>(selector)),
    queryAllByTestId: <E extends Element = Element>(testId: string) =>
      Array.from(element.querySelectorAll<E>(`[data-testid="${testId}"]`)),
    queryAllByText: <E extends Element = Element>(text: string, selector = '*') =>
      queryAllByText<E>(element, text, selector),
    queryByTestId: <E extends Element = Element>(testId: string) =>
      element.querySelector<E>(`[data-testid="${testId}"]`),
    queryByText: <E extends Element = Element>(text: string, selector = '*') => queryByText<E>(element, text, selector),
  };
}
