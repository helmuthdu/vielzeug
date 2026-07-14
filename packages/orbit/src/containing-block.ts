/**
 * @vielzeug/orbit — containing-block detection for `position: fixed` elements.
 */

import { flatTreeParent } from './utils';

const WILL_CHANGE_TRAPS = ['transform', 'perspective', 'filter'];
const CONTAIN_TRAPS = ['layout', 'paint', 'strict', 'content'];

/**
 * True if `style` makes its element a containing block for `position: fixed` descendants, per
 * the CSS Transforms spec: a non-`none` `transform`, `perspective`, or `filter`; a non-`none`
 * `backdrop-filter`; a `will-change` naming one of those three properties; or a `contain` value
 * that affects layout or paint.
 */
function establishesFixedContainingBlock(style: CSSStyleDeclaration): boolean {
  if (style.transform !== 'none') return true;

  if (style.perspective !== 'none') return true;

  if (style.filter !== 'none') return true;

  if (style.backdropFilter && style.backdropFilter !== 'none') return true;

  if (style.willChange !== 'auto' && WILL_CHANGE_TRAPS.some((prop) => style.willChange.includes(prop))) return true;

  return style.contain !== 'none' && CONTAIN_TRAPS.some((keyword) => style.contain.includes(keyword));
}

/**
 * Walks up from `element` (crossing shadow boundaries via the flat tree) to find the nearest
 * ancestor that establishes a containing block for `position: fixed` descendants. Returns `null`
 * when none is found — the common case, meaning the true viewport is the containing block.
 *
 * `Element.offsetParent` can't answer this: browsers report it as `null` unconditionally for
 * `position: fixed` elements, without accounting for a transformed ancestor — even though the
 * CSS Transforms spec says that ancestor *does* become the containing block once it has a
 * non-`none` `transform`/`filter`/`perspective`/`backdrop-filter` (even a visually-identity one,
 * e.g. `transform: scale(1)` left over from an entrance transition that never resets to `none` at
 * rest). A `position: fixed` floating element nested inside such an ancestor — a modal dialog's
 * panel is the classic case — has its `left`/`top` resolved against *that* ancestor's box instead
 * of the viewport, silently mispositioning it even though the coordinates computed for it were
 * correct viewport-relative values.
 *
 * Pass the result as `containingBlock` to `computePosition()` to correct for this.
 *
 * @example
 * ```ts
 * const containingBlock = getContainingBlock(floatingEl);
 * computePosition(reference, floating, { containingBlock, placement: 'bottom-start' });
 * ```
 */
export function getContainingBlock(element: Element): Element | null {
  let node = flatTreeParent(element);

  while (node) {
    if (establishesFixedContainingBlock(getComputedStyle(node))) return node;

    node = flatTreeParent(node);
  }

  return null;
}
