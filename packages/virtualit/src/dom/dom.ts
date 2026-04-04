import { type ScrollToIndexOptions, type VirtualItem, type Virtualizer, createVirtualizer } from '../virtualit';

export * from '../virtualit';

export type DomVirtualListRenderArgs<T> = {
  items: T[];
  listEl: HTMLElement;
  virtualItems: VirtualItem[];
};

export type DomVirtualListOptions<T> = {
  clear?: (listEl: HTMLElement) => void;
  estimateSize: number | ((index: number, item: T) => number);
  getListElement: () => HTMLElement | null;
  getScrollElement: () => HTMLElement | null;
  overscan?: number;
  render: (args: DomVirtualListRenderArgs<T>) => void;
};

export type DomVirtualListSetItemsOptions = {
  remeasure?: boolean;
};

export type DomVirtualListController<T> = {
  destroy: () => void;
  scrollToIndex: (index: number, options?: ScrollToIndexOptions) => void;
  setActive: (active: boolean) => void;
  setItems: (items: T[], options?: DomVirtualListSetItemsOptions) => void;
};

export function createDomVirtualList<T>(options: DomVirtualListOptions<T>): DomVirtualListController<T> {
  let currentItems: T[] = [];
  let isActive = true;
  let listElRef: HTMLElement | null = null;
  let scrollElRef: HTMLElement | null = null;
  let virtualizer: Virtualizer | null = null;

  const resolveEstimate = (index: number): number => {
    if (typeof options.estimateSize === 'number') return options.estimateSize;

    const item = currentItems[index];

    if (!item) return 36;

    return options.estimateSize(index, item);
  };

  const applyListStyles = () => {
    if (!listElRef || !virtualizer) return;

    listElRef.style.height = `${virtualizer.getTotalSize()}px`;
    listElRef.style.position = 'relative';
    listElRef.style.contain = 'layout';
  };

  const clearAndReset = () => {
    if (!listElRef) return;

    if (options.clear) options.clear(listElRef);
    else listElRef.textContent = '';

    listElRef.style.height = '';
    listElRef.style.position = '';
    listElRef.style.contain = '';
  };

  const ensureVirtualizer = (remeasure: boolean, lengthChanged: boolean) => {
    const nextScroll = options.getScrollElement();
    const nextList = options.getListElement();

    if (!isActive || !nextScroll || !nextList || currentItems.length === 0) {
      virtualizer?.destroy();
      virtualizer = null;
      listElRef = nextList;
      scrollElRef = nextScroll;
      clearAndReset();

      return;
    }

    const targetChanged = scrollElRef !== nextScroll || listElRef !== nextList;

    listElRef = nextList;
    scrollElRef = nextScroll;

    if (!virtualizer || targetChanged) {
      virtualizer?.destroy();
      virtualizer = createVirtualizer(scrollElRef, {
        count: currentItems.length,
        estimateSize: resolveEstimate,
        onChange: (virtualItems) => {
          if (!listElRef) return;

          options.render({ items: currentItems, listEl: listElRef, virtualItems });
        },
        overscan: options.overscan ?? 3,
      });
    } else {
      if (lengthChanged) virtualizer.count = currentItems.length;

      if (remeasure) virtualizer.invalidate();
    }

    applyListStyles();
  };

  return {
    destroy() {
      virtualizer?.destroy();
      virtualizer = null;
      clearAndReset();
    },
    scrollToIndex(index, scrollOptions) {
      virtualizer?.scrollToIndex(index, scrollOptions);
    },
    setActive(active) {
      isActive = active;

      ensureVirtualizer(false, false);
    },
    setItems(items, setItemsOptions = {}) {
      const lengthChanged = currentItems.length !== items.length;

      currentItems = items;

      ensureVirtualizer(!!setItemsOptions.remeasure, lengthChanged);
    },
  };
}
