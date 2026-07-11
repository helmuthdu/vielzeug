/**
 * DOM traversal helpers for tests running under jsdom, which only implements the *light* DOM
 * tree — `Element.children`/`querySelectorAll()` never cross a `<slot>` into its assigned
 * elements. Real browsers use the *flat tree* (light DOM with each `<slot>` transparently
 * replaced by what's actually assigned to it) for this — it's what "form owner" resolution,
 * `:has()`, and plenty of other DOM algorithms are specified against.
 */

/**
 * Walks the flat tree starting at `root`, calling `visit` for every element encountered —
 * expanding each `<slot>` via `assignedElements()` instead of descending into its (always
 * empty, in jsdom) literal children.
 *
 * @example
 * ```ts
 * // Find every form-associated element slotted (possibly through nested slots) under `form`,
 * // something `form.querySelectorAll('[name]')` can't do once a shadow boundary is involved.
 * const named: HTMLElement[] = [];
 * walkFlatTree(form, (el) => { if (el.hasAttribute('name')) named.push(el); });
 * ```
 */
export const walkFlatTree = (root: Element, visit: (element: HTMLElement) => void): void => {
  const children = root instanceof HTMLSlotElement ? root.assignedElements({ flatten: true }) : root.children;

  for (const child of Array.from(children)) {
    if (!(child instanceof HTMLSlotElement)) visit(child as HTMLElement);

    walkFlatTree(child, visit);
  }
};
