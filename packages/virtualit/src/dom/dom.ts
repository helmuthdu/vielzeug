import { type ScrollToIndexOptions, type VirtualItem, type Virtualizer, createVirtualizer } from '../virtualit';

export * from '../virtualit';

export type DomVirtualListRenderArgs<T> = {
  items: T[];
  listEl: HTMLElement;
  virtualItems: VirtualItem[];
};

export type DomVirtualListOptions<T> = {
  clear: (listEl: HTMLElement) => void;
  estimateSize: number | ((index: number, item: T) => number);
  getListElement: () => HTMLElement | null;
  getScrollElement: () => HTMLElement | null;
  overscan?: number;
  render: (args: DomVirtualListRenderArgs<T>) => void;
};

export type DomVirtualListController<T> = {
  destroy: () => void;
  scrollToIndex: (index: number, options?: ScrollToIndexOptions) => void;
  update: (items: T[], enabled: boolean) => void;
};

export function createDomVirtualList<T>(options: DomVirtualListOptions<T>): DomVirtualListController<T> {
  let currentItems: T[] = [];
  let listElRef: HTMLElement | null = null;
  let scrollElRef: HTMLElement | null = null;
  let virtualizer: Virtualizer | null = null;

  const resolveEstimate = (index: number): number => {
    if (typeof options.estimateSize === 'number') return options.estimateSize;

    return options.estimateSize(index, currentItems[index]!);
  };

  const applyListStyles = () => {
    if (!listElRef || !virtualizer) return;

    listElRef.style.height = `${virtualizer.getTotalSize()}px`;
    listElRef.style.position = 'relative';
    listElRef.style.contain = 'layout';
  };

  const clearAndReset = () => {
    if (!listElRef) return;

    options.clear(listElRef);
    listElRef.style.height = '';
    listElRef.style.position = '';
    listElRef.style.contain = '';
  };

  const ensureVirtualizer = () => {
    const nextScroll = options.getScrollElement();
    const nextList = options.getListElement();

    if (!nextScroll || !nextList || currentItems.length === 0) {
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
      virtualizer.count = currentItems.length;
      virtualizer.invalidate();
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
    update(items, enabled) {
      currentItems = items;

      if (!enabled || currentItems.length === 0) {
        virtualizer?.destroy();
        virtualizer = null;
        listElRef = options.getListElement();
        scrollElRef = options.getScrollElement();
        clearAndReset();

        return;
      }

      ensureVirtualizer();
    },
  };
}
