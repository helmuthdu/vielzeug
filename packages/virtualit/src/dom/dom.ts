import {
  DEFAULT_ESTIMATE_SIZE,
  DEFAULT_OVERSCAN,
  type Overscan,
  type ScrollToIndexOptions,
  type VirtualItem,
  type Virtualizer,
  createVirtualizer,
} from '../virtualit';

export * from '../virtualit';

export type DomVirtualListRenderArgs<T> = {
  items: T[];
  listEl: HTMLElement;
  totalSize: number;
  virtualItems: VirtualItem[];
};

export type DomVirtualListOptions<T> = {
  clear?: (listEl: HTMLElement) => void;
  estimateSize: number | ((index: number, item: T) => number);
  gap?: number;
  getItemKey?: (item: T, index: number) => number | string;
  getListElement: () => HTMLElement | null;
  getScrollElement: () => HTMLElement | Window | null;
  horizontal?: boolean;
  overscan?: Overscan;
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
  let scrollElRef: HTMLElement | Window | null = null;
  let virtualizer: Virtualizer | null = null;

  const resolveEstimate = (index: number): number => {
    if (typeof options.estimateSize === 'number') return options.estimateSize;

    const item = currentItems[index];

    if (!item) return DEFAULT_ESTIMATE_SIZE;

    return options.estimateSize(index, item);
  };

  const getCoreItemKey = options.getItemKey
    ? (index: number) => {
        const item = currentItems[index];

        return item ? options.getItemKey!(item, index) : index;
      }
    : undefined;

  const clearAndReset = () => {
    if (!listElRef) return;

    if (options.clear) options.clear(listElRef);
    else listElRef.textContent = '';

    listElRef.style.height = '';
    listElRef.style.width = '';
    listElRef.style.position = '';
    listElRef.style.contain = '';
  };

  const applyListSize = (totalSize: number) => {
    if (!listElRef) return;

    if (options.horizontal) {
      listElRef.style.width = `${totalSize}px`;
      listElRef.style.height = '';
    } else {
      listElRef.style.height = `${totalSize}px`;
      listElRef.style.width = '';
    }
  };

  const renderFromChange = (virtualItems: VirtualItem[], totalSize: number) => {
    if (!listElRef) return;

    applyListSize(totalSize);
    options.render({
      items: currentItems,
      listEl: listElRef,
      totalSize,
      virtualItems,
    });
  };

  const syncVirtualizer = (remeasure: boolean) => {
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
        gap: options.gap,
        getItemKey: getCoreItemKey,
        horizontal: options.horizontal,
        onChange: (virtualItems, totalSize) => renderFromChange(virtualItems, totalSize),
        overscan: options.overscan ?? { end: DEFAULT_OVERSCAN, start: DEFAULT_OVERSCAN },
      });

      listElRef.style.position = 'relative';
      listElRef.style.contain = 'layout';

      return;
    }

    virtualizer.update({
      count: currentItems.length,
      estimateSize: (index) => resolveEstimate(index),
      getItemKey: getCoreItemKey,
      horizontal: options.horizontal,
      overscan: options.overscan,
    });

    if (remeasure) virtualizer.invalidate();
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
      syncVirtualizer(false);
    },
    setItems(items, setItemsOptions = {}) {
      currentItems = items;
      syncVirtualizer(!!setItemsOptions.remeasure);
    },
  };
}
