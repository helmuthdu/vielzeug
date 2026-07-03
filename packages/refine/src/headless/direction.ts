/**
 * Resolves the effective text direction for an element.
 *
 * The closest ancestor with an explicit `dir="ltr"` or `dir="rtl"` attribute wins — this
 * supports locally-scoped RTL sections (e.g. a single `dir="rtl"` panel inside an otherwise
 * LTR page). When no explicit `dir` attribute is found up the tree, falls back to the
 * computed `direction` CSS property (e.g. set via a `direction: rtl` style rule with no
 * `dir` attribute). Defaults to `'ltr'` when `el` is `null`.
 */
export function elementDirection(el: Element | null): 'ltr' | 'rtl' {
  let node: Element | null = el;

  while (node) {
    const dir = node.getAttribute('dir');

    if (dir === 'rtl' || dir === 'ltr') return dir;

    node = node.parentElement;
  }

  return el !== null && getComputedStyle(el).direction === 'rtl' ? 'rtl' : 'ltr';
}
