import {
  DEFAULT_ESTIMATE_SIZE,
  DEFAULT_OVERSCAN,
  type Overscan,
  type ScrollToIndexOptions,
  type VirtualItem,
  type VirtualKey,
  type Virtualizer,
  createVirtualizer,
} from '../scroll';

export * from '../scroll';

export type DomVirtualListRenderArgs<T> = {
  items: T[];
  listEl: HTMLElement;
  totalSize: number;
  virtualItems: VirtualItem[];
};

export type DomVirtualListOptions<T> = {
  clear?: (listEl: HTMLElement) => void;
  estimateSize?: number | ((index: number, item: T) => number);
  gap?: number;
  getItemKey?: (index: number, item: T) => VirtualKey;
  horizontal?: boolean;
  listElement: HTMLElement;
  overscan?: Overscan;
  render: (args: DomVirtualListRenderArgs<T>) => void;
  scrollElement: HTMLElement | Window;
};

export type DomVirtualListController<T> = {
  destroy: () => void;
  invalidate: () => void;
  measure: (index: number, size: number) => void;
  measureBatch: (entries: Array<{ index: number; size: number }>) => void;
  scrollToIndex: (index: number, options?: ScrollToIndexOptions) => void;
  setActive: (active: boolean) => void;
  setItems: (items: T[]) => void;
  setTarget: (scrollElement: HTMLElement | Window, listElement: HTMLElement) => void;
};

export function createDomVirtualList<T>(options: DomVirtualListOptions<T>): DomVirtualListController<T> {
  let currentItems: T[] = [];
  let isActive = true;
  let isDestroyed = false;
  let listElRef: HTMLElement = options.listElement;
  let scrollElRef: HTMLElement | Window = options.scrollElement;
  let virtualizer: Virtualizer | null = null;
  let itemKeyRevision = 0;

  const resolveItemKey = (index: number): VirtualKey => {
    const item = currentItems[index];

    if (item && options.getItemKey) return options.getItemKey(index, item);

    return `${itemKeyRevision}:${index}`;
  };

  const resolveEstimate = (index: number): number => {
    if (options.estimateSize === undefined) return DEFAULT_ESTIMATE_SIZE;

    if (typeof options.estimateSize === 'number') return options.estimateSize;

    const item = currentItems[index];

    if (!item) return DEFAULT_ESTIMATE_SIZE;

    return options.estimateSize(index, item);
  };

  const clearAndReset = (listEl: HTMLElement = listElRef) => {
    if (options.clear) options.clear(listEl);
    else listEl.textContent = '';

    listEl.style.height = '';
    listEl.style.width = '';
    listEl.style.position = '';
    listEl.style.contain = '';
  };

  const applyListSize = (totalSize: number) => {
    if (options.horizontal) {
      listElRef.style.width = `${totalSize}px`;
      listElRef.style.height = '';
    } else {
      listElRef.style.height = `${totalSize}px`;
      listElRef.style.width = '';
    }
  };

  const renderFromChange = (virtualItems: VirtualItem[], totalSize: number) => {
    applyListSize(totalSize);
    options.render({
      items: currentItems,
      listEl: listElRef,
      totalSize,
      virtualItems,
    });
  };

  const spawnVirtualizer = () => {
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
  };

  const syncItems = (keepMeasurements: boolean) => {
    if (!isActive || currentItems.length === 0) {
      virtualizer?.destroy();
      virtualizer = null;
      clearAndReset();

      return;
    }

    if (!virtualizer) {
      spawnVirtualizer();

      return;
    }

    virtualizer.update({
      count: currentItems.length,
      estimateSize: resolveEstimate,
      gap: options.gap,
      getItemKey: resolveItemKey,
      overscan: options.overscan,
    });

    if (keepMeasurements) {
      virtualizer.refresh();
    } else {
      virtualizer.invalidate();
    }
  };

  return {
    destroy() {
      if (isDestroyed) return;

      isDestroyed = true;
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
    measureBatch(entries) {
      virtualizer?.measureBatch(entries);
    },
    scrollToIndex(index, scrollOptions) {
      virtualizer?.scrollToIndex(index, scrollOptions);
    },
    setActive(active) {
      if (isDestroyed || isActive === active) return;

      isActive = active;

      if (!isActive) {
        virtualizer?.destroy();
        virtualizer = null;
        clearAndReset();
      } else if (currentItems.length > 0) {
        spawnVirtualizer();
      }
    },
    setItems(items) {
      if (isDestroyed) return;

      currentItems = items;
      itemKeyRevision += options.getItemKey ? 0 : 1;
      syncItems(!!options.getItemKey);
    },
    setTarget(scrollElement, listElement) {
      if (isDestroyed) return;

      if (scrollElement === scrollElRef && listElement === listElRef) return;

      const previousList = listElRef;

      virtualizer?.destroy();
      virtualizer = null;
      clearAndReset(previousList);

      scrollElRef = scrollElement;
      listElRef = listElement;

      if (isActive && currentItems.length > 0) {
        spawnVirtualizer();
      }
    },
  };
}
