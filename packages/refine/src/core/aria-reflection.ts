/**
 * Cross-shadow-root ARIA relationship helper.
 *
 * Plain IDREF attributes (`aria-controls`, `aria-activedescendant`, `aria-describedby`,
 * `aria-labelledby`, …) cannot resolve across shadow-tree boundaries: the browser only looks
 * up an `id` within the same root as the referencing element, so a target inside one
 * component's shadow root is invisible to an attribute set inside another component's root.
 * This is a platform limitation, not a bug; see the WICG "reference target" explainer.
 *
 * Modern browsers instead expose element-reflection IDL properties
 * (`ariaControlsElements`, `ariaActiveDescendantElement`, `ariaDescribedByElements`,
 * `ariaLabelledByElements`, …) that accept
 * live `Element` references directly, sidestepping ID lookup entirely: these work across
 * shadow roots by design. Where unsupported, this falls back to the plain IDREF attribute,
 * which is still correct for same-root pairings and degrades gracefully (no relationship)
 * for cross-root ones instead of throwing.
 */

export type AriaReflectionProperty =
  | 'ariaActiveDescendantElement'
  | 'ariaControlsElements'
  | 'ariaDescribedByElements'
  | 'ariaLabelledByElements';

const ATTR_BY_PROPERTY: Record<AriaReflectionProperty, string> = {
  ariaActiveDescendantElement: 'aria-activedescendant',
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
    if (property === 'ariaActiveDescendantElement') {
      const reflection = el as unknown as { ariaActiveDescendantElement: Element | null };
      const target = targets[0] ?? null;
      reflection.ariaActiveDescendantElement = target;
      if (reflection.ariaActiveDescendantElement === target) return;
    } else {
      const reflection = el as unknown as Record<
        Exclude<AriaReflectionProperty, 'ariaActiveDescendantElement'>,
        readonly Element[] | null
      >;
      const targetList = targets.length > 0 ? targets : null;
      reflection[property] = targetList;

      const current = reflection[property];
      if (
        targets.length === 0
          ? !current || current.length === 0
          : current?.length === targets.length && targets.every((target, index) => current[index] === target)
      ) {
        return;
      }
    }
  }

  const attr = ATTR_BY_PROPERTY[property];
  const ids = targets.map((target) => target.id).filter(Boolean);

  if (ids.length === 0) el.removeAttribute(attr);
  else el.setAttribute(attr, ids.join(' '));
}
