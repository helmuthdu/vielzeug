import {
  type Overscan,
  type ScrollToIndexOptions,
  type VirtualItem,
  type VirtualKey,
  type Virtualizer,
  createVirtualizer,
} from '../scroll';

export * from '../scroll';

const DEFAULT_ESTIMATE_SIZE = 36;
const DEFAULT_OVERSCAN = 3;

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
  getItemKey?: (index: number, item: T) => VirtualKey;
  getListElement: () => HTMLElement | null;
  getScrollElement: () => HTMLElement | Window | null;
  horizontal?: boolean;
  overscan?: Overscan;
  render: (args: DomVirtualListRenderArgs<T>) => void;
};

export type DomVirtualListController<T> = {
  destroy: () => void;
  invalidate: () => void;
  measure: (index: number, size: number) => void;
  scrollToIndex: (index: number, options?: ScrollToIndexOptions) => void;
  setActive: (active: boolean) => void;
  setItems: (items: T[]) => void;
};

type MeasurementSyncMode = 'invalidate' | 'refresh' | null;

export function createDomVirtualList<T>(options: DomVirtualListOptions<T>): DomVirtualListController<T> {
  let currentItems: T[] = [];
  let isActive = true;
  let listElRef: HTMLElement | null = null;
  let scrollElRef: HTMLElement | Window | null = null;
  let virtualizer: Virtualizer | null = null;
  let itemKeyRevision = 0;

  const resolveItemKey = (index: number): VirtualKey => {
    const item = currentItems[index];

    if (item && options.getItemKey) return options.getItemKey(index, item);

    return `${itemKeyRevision}:${index}`;
  };

  const resolveEstimate = (index: number): number => {
    if (typeof options.estimateSize === 'number') return options.estimateSize;

    const item = currentItems[index];

    if (!item) return DEFAULT_ESTIMATE_SIZE;

    return options.estimateSize(index, item);
  };

  const clearAndReset = (listEl: HTMLElement | null = listElRef) => {
    if (!listEl) return;

    if (options.clear) options.clear(listEl);
    else listEl.textContent = '';

    listEl.style.height = '';
    listEl.style.width = '';
    listEl.style.position = '';
    listEl.style.contain = '';
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

  const syncVirtualizer = (measurementSync: MeasurementSyncMode) => {
    const nextScroll = options.getScrollElement();
    const nextList = options.getListElement();
    const previousList = listElRef;

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
      const shouldClearForTargetSwap = !!virtualizer && targetChanged;

      virtualizer?.destroy();

      if (shouldClearForTargetSwap) clearAndReset(previousList);

      virtualizer = createVirtualizer(scrollElRef, {
        count: currentItems.length,
        estimateSize: resolveEstimate,
        gap: options.gap,
        getItemKey: resolveItemKey,
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
      estimateSize: resolveEstimate,
      gap: options.gap,
      getItemKey: resolveItemKey,
      overscan: options.overscan,
    });

    if (measurementSync === 'invalidate') {
      virtualizer.invalidate();

      return;
    }

    if (measurementSync === 'refresh') virtualizer.refresh();
  };

  return {
    destroy() {
      virtualizer?.destroy();
      virtualizer = null;
      clearAndReset();
    },
    invalidate() {
      virtualizer?.invalidate();
    },
    measure(index, size) {
      virtualizer?.measure(index, size);
    },
    scrollToIndex(index, scrollOptions) {
      virtualizer?.scrollToIndex(index, scrollOptions);
    },
    setActive(active) {
      isActive = active;
      syncVirtualizer(null);
    },
    setItems(items) {
      currentItems = items;

      if (options.getItemKey) {
        syncVirtualizer('refresh');

        return;
      }

      itemKeyRevision += 1;
      syncVirtualizer('invalidate');
    },
  };
}
