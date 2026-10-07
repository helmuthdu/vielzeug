import type { GridColumns } from './grid-navigation.js';
import { createGridNavigation } from './grid-navigation.js';
import type { MaybeGetter } from './list-navigation.js';

export type QuickLookGridOptions = {
  /**
   * Columns per row, resolved on every navigation. Defaults to the rendered row length at the
   * active item, which follows the grid's own responsive wrapping without a media query.
   */
  columns?: GridColumns;
  /** Suppresses every key: for grids the consumer has locked. */
  disabled?: MaybeGetter<boolean>;
  /** Reads the grid's items in display order, re-read on every key. */
  getItems: () => readonly HTMLElement[];
  /**
   * Reads the active index among the items when the event target is outside them, for grids
   * whose focus sits on a wrapper around the item. Defaults to the item that is (or contains)
   * `document.activeElement`.
   */
  getActiveIndex?: () => number;
  /** Key that opens the Quick Look. Default `' '` (Space), the platform preview key. */
  inspectKey?: string;
  /** Wrap moves around the grid's edges by flat index. Default clamps at the edges. */
  loop?: boolean;
  /**
   * Opens the Quick Look for one item. The keyboard path has already focused the item; the
   * consumer decides what "detail" means (a dialog, a zoom, a preview pane).
   */
  onInspect: (item: HTMLElement, index: number) => void;
};

export type QuickLookGrid = {
  /**
   * Route the grid's `keydown` here. Arrow keys and Home/End move focus through the items;
   * `inspectKey` opens the Quick Look for the item under the event (or the active item),
   * cancelling the key so the focused control never activates. Modifier chords pass through.
   */
  handleKeydown(event: KeyboardEvent): void;
};

const resolve = <V>(value: MaybeGetter<V> | undefined, fallback: V): V =>
  typeof value === 'function' ? (value as () => V)() : (value ?? fallback);

/**
 * Keyboard browsing over a tile grid with a Quick Look key: the pair every card picker needs,
 * where arrows walk the tiles and Space previews the focused card instead of activating it.
 *
 * Built on `createGridNavigation`: horizontal arrows step one item, vertical arrows step one
 * row, Home/End jump to the ends, and focus follows the reported change. `inspectKey` (Space by
 * default) resolves the item under the event target, calls `preventDefault()` and
 * `stopPropagation()` so the focused button never sees the press, and reports it through
 * `onInspect`. Long-press is the touch counterpart of the same callback; pair this with a
 * pointer recognizer (for example `@vielzeug/gesture`'s long press) at the call site.
 */
export const createQuickLookGrid = (options: QuickLookGridOptions): QuickLookGrid => {
  const activeIndex = (): number => options.getItems().indexOf(document.activeElement as HTMLElement);

  /** The rendered row length at the active item: items sharing its top edge. */
  const measuredColumns = (): number => {
    const items = options.getItems();
    const active = items.indexOf(document.activeElement as HTMLElement);
    if (active < 0) return 1;
    const top = items[active]?.getBoundingClientRect().top ?? 0;
    return Math.max(1, items.filter((item) => Math.abs(item.getBoundingClientRect().top - top) < 1).length);
  };

  const navigation = createGridNavigation<HTMLElement>({
    columns: options.columns ?? measuredColumns,
    getActiveIndex: options.getActiveIndex ?? activeIndex,
    getItems: options.getItems,
    loop: options.loop,
  });

  /** The item the key belongs to: the one containing the event target, else the active item. */
  const resolveItem = (event: KeyboardEvent): { index: number; item: HTMLElement | undefined } => {
    const items = options.getItems();
    const target = event.target instanceof HTMLElement ? event.target : null;
    const byTarget = target === null ? -1 : items.findIndex((item) => item === target || item.contains(target));
    if (byTarget >= 0) return { index: byTarget, item: items[byTarget] };
    const index = (options.getActiveIndex ?? activeIndex)();
    return { index, item: index >= 0 ? items[index] : undefined };
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.isComposing || resolve(options.disabled, false)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === (options.inspectKey ?? ' ')) {
      const { index, item } = resolveItem(event);
      if (!item) return;
      event.preventDefault();
      event.stopPropagation();
      options.onInspect(item, index);
      return;
    }

    const result = navigation.handleKeydown(event);
    if (result?.change) result.change.item.focus();
  };

  return { handleKeydown };
};
