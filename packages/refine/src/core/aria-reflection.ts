/**
 * Cross-shadow-root ARIA relationship helper.
 *
 * Plain IDREF attributes (`aria-controls`, `aria-describedby`, `aria-labelledby`, …) cannot
 * resolve across shadow-tree boundaries — the browser only looks up an `id` within the same
 * root as the referencing element, so `<div id="x">` inside one component's shadow root is
 * invisible to `aria-controls="x"` set inside another component's shadow root, even when both
 * custom elements are siblings in the light DOM. This is a platform limitation, not a bug —
 * see the WICG "reference target" explainer for the full rationale.
 *
 * Modern browsers instead expose element-reflection IDL properties
 * (`ariaControlsElements`, `ariaDescribedByElements`, `ariaLabelledByElements`, …) that accept
 * live `Element` references directly, sidestepping ID lookup entirely — these work across
 * shadow roots by design. Where unsupported, this falls back to the plain IDREF attribute,
 * which is still correct for same-root pairings and degrades gracefully (no relationship)
 * for cross-root ones instead of throwing.
 */

export type AriaReflectionProperty = 'ariaControlsElements' | 'ariaDescribedByElements' | 'ariaLabelledByElements';

const ATTR_BY_PROPERTY: Record<AriaReflectionProperty, string> = {
  ariaControlsElements: 'aria-controls',
  ariaDescribedByElements: 'aria-describedby',
  ariaLabelledByElements: 'aria-labelledby',
};

/**
 * Associates `el` with `targets` via the given ARIA relationship. Prefers the
 * cross-shadow-root-safe element-reflection property; falls back to a plain IDREF attribute
 * built from `targets`' own `id`s when the browser doesn't support element reflection yet.
 *
 * Pass an empty array to clear the relationship.
 */
export function setAriaReflection(el: Element, property: AriaReflectionProperty, targets: readonly Element[]): void {
  if (property in el) {
    (el as unknown as Record<AriaReflectionProperty, readonly Element[] | null>)[property] =
      targets.length > 0 ? targets : null;

    return;
  }

  const attr = ATTR_BY_PROPERTY[property];
  const ids = targets.map((target) => target.id).filter(Boolean);

  if (ids.length === 0) el.removeAttribute(attr);
  else el.setAttribute(attr, ids.join(' '));
}
