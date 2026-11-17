export const SWIPE_EDITABLE_SELECTOR =
  'input, select, textarea, video, audio, iframe, ore-slider, ore-rating, ' +
  '[contenteditable]:not([contenteditable="false"]), [draggable="true"], ' +
  '[role="slider"], [role="spinbutton"], [role="textbox"], ' +
  '[role="checkbox"], [role="radio"], [role="switch"], [role="combobox"], [role="listbox"], ' +
  '[role="option"], [role^="menuitem"], [role="tab"]';

export const SWIPE_INTERACTIVE_SELECTOR = `a[href], button, summary, label, ore-button, ore-checkbox, [role="button"], [role="link"], ${SWIPE_EDITABLE_SELECTOR}`;

export const SWIPE_SURFACES =
  '[data-no-swipe], ore-carousel, ore-list-item, ore-pull-to-refresh, ore-sidebar, ore-toast, ore-drawer';

export const SWIPE_EXCLUSIONS = `${SWIPE_INTERACTIVE_SELECTOR}, ${SWIPE_SURFACES}`;

export function swipePath(event: Event, boundary: Element): HTMLElement[] {
  const path = event.composedPath();
  const end = path.indexOf(boundary);
  return (end < 0 ? [] : path.slice(0, end)).filter((node): node is HTMLElement => node instanceof HTMLElement);
}

export function canScrollInDirection(
  elements: readonly HTMLElement[],
  { axis, direction }: { axis: 'x' | 'y'; direction: number },
): boolean {
  return elements.some((element) => {
    const horizontal = axis === 'x';
    const max = horizontal ? element.scrollWidth - element.clientWidth : element.scrollHeight - element.clientHeight;
    if (max <= 0) return false;
    const style = getComputedStyle(element);
    if (!/^(auto|scroll|overlay)$/.test(horizontal ? style.overflowX : style.overflowY)) return false;
    const reversedFlex =
      style.display.includes('flex') && style.flexDirection === (horizontal ? 'row-reverse' : 'column-reverse');
    const reverseOrigin = horizontal ? (style.direction === 'rtl') !== reversedFlex : reversedFlex;
    const rawOffset = horizontal ? element.scrollLeft : element.scrollTop;
    const position = Math.min(max, Math.max(0, reverseOrigin ? max + rawOffset : rawOffset));
    return direction > 0 ? position > 1 : position < max - 1;
  });
}
