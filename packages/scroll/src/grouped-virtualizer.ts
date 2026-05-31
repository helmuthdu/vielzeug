import {
  createVirtualizer,
  DEFAULT_ESTIMATE_SIZE,
  DEFAULT_OVERSCAN,
  type MeasurementCache,
  type Overscan,
  type ScrollTarget,
  type VirtualItem,
  type VirtualizerState,
  type VirtualKey,
} from './virtualizer';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GroupSection<T> {
  items: T[];
  label: string;
}

export interface GroupVirtualItem<T> extends VirtualItem {
  /** Item data. */
  data: T;
  /** Index within the section. */
  itemIndex: number;
  sectionIndex: number;
}

export interface GroupVirtualHeader extends VirtualItem {
  label: string;
  sectionIndex: number;
}

export interface GroupVirtualizerState<T> {
  readonly headers: GroupVirtualHeader[];
  readonly items: Array<GroupVirtualItem<T>>;
  readonly stickyHeader: GroupVirtualHeader | null;
  readonly totalSize: number;
}

export interface GroupVirtualizerOptions<T> {
  estimateHeaderSize?: number | ((section: GroupSection<T>, sectionIndex: number) => number);
  estimateItemSize?: number | ((item: T, itemIndex: number, sectionIndex: number) => number);
  getItemKey?: (item: T, itemIndex: number, sectionIndex: number) => VirtualKey;
  horizontal?: boolean;
  measurementCache?: MeasurementCache;
  onChange?: (state: GroupVirtualizerState<T>) => void;
  overscan?: Overscan;
  sections: Array<GroupSection<T>>;
  target: ScrollTarget;
}

export interface GroupVirtualizer<T> {
  destroy: () => void;
  scrollToItem: (
    sectionIndex: number,
    itemIndex: number,
    options?: { align?: 'auto' | 'center' | 'end' | 'start'; behavior?: ScrollBehavior },
  ) => void;
  scrollToSection: (sectionIndex: number, options?: { behavior?: ScrollBehavior }) => void;
  update: (sections: Array<GroupSection<T>>) => void;
  [Symbol.dispose]: () => void;
}

// ─── Flat entry map ───────────────────────────────────────────────────────────

interface FlatEntry<T> {
  isHeader: boolean;
  itemIndex: number;
  sectionIndex: number;
  item?: T;
  label?: string;
}

function buildFlatEntries<T>(sections: Array<GroupSection<T>>): FlatEntry<T>[] {
  const flat: FlatEntry<T>[] = [];

  for (let s = 0; s < sections.length; s++) {
    const section = sections[s]!;

    flat.push({ isHeader: true, itemIndex: -1, label: section.label, sectionIndex: s });

    for (let i = 0; i < section.items.length; i++) {
      flat.push({ isHeader: false, item: section.items[i]!, itemIndex: i, sectionIndex: s });
    }
  }

  return flat;
}

// ─── Implementation ───────────────────────────────────────────────────────────

export function createGroupedVirtualizer<T>(options: GroupVirtualizerOptions<T>): GroupVirtualizer<T> {
  let sections = options.sections;
  let flat = buildFlatEntries(sections);

  const estimateHeader =
    typeof options.estimateHeaderSize === 'function'
      ? options.estimateHeaderSize
      : () => (typeof options.estimateHeaderSize === 'number' ? options.estimateHeaderSize : DEFAULT_ESTIMATE_SIZE);

  const estimateItem =
    typeof options.estimateItemSize === 'function'
      ? options.estimateItemSize
      : () => (typeof options.estimateItemSize === 'number' ? options.estimateItemSize : DEFAULT_ESTIMATE_SIZE);

  function estimateFn(globalIndex: number): number {
    const entry = flat[globalIndex];

    if (!entry) return DEFAULT_ESTIMATE_SIZE;

    if (entry.isHeader) return estimateHeader(sections[entry.sectionIndex]!, entry.sectionIndex);

    return estimateItem(entry.item as T, entry.itemIndex, entry.sectionIndex);
  }

  function getItemKey(globalIndex: number): VirtualKey {
    const entry = flat[globalIndex];

    if (!entry) return globalIndex;

    if (entry.isHeader) return `__header_${entry.sectionIndex}`;

    if (options.getItemKey) return options.getItemKey(entry.item as T, entry.itemIndex, entry.sectionIndex);

    return globalIndex;
  }

  function mapState(state: VirtualizerState): GroupVirtualizerState<T> {
    const items: Array<GroupVirtualItem<T>> = [];
    const headers: GroupVirtualHeader[] = [];
    let stickyHeader: GroupVirtualHeader | null = null;

    for (const vi of state.items) {
      const entry = flat[vi.index];

      if (!entry) continue;

      if (entry.isHeader) {
        headers.push({ ...vi, label: entry.label ?? '', sectionIndex: entry.sectionIndex });
      } else {
        items.push({ ...vi, data: entry.item as T, itemIndex: entry.itemIndex, sectionIndex: entry.sectionIndex });
      }
    }

    if (state.stickyItems.length > 0) {
      const svi = state.stickyItems[0]!;
      const entry = flat[svi.index];

      if (entry?.isHeader) {
        stickyHeader = { ...svi, label: entry.label ?? '', sectionIndex: entry.sectionIndex };
      }
    }

    return { headers, items, stickyHeader, totalSize: state.totalSize };
  }

  const virtualizer = createVirtualizer(options.target, {
    count: flat.length,
    estimateSize: estimateFn,
    getItemKey,
    horizontal: options.horizontal,
    measurementCache: options.measurementCache,
    onChange: options.onChange ? (state) => options.onChange!(mapState(state)) : undefined,
    overscan: options.overscan ?? { end: DEFAULT_OVERSCAN, start: DEFAULT_OVERSCAN },
    sticky: (i) => flat[i]?.isHeader ?? false,
  });

  // Build a flat-index lookup: [sectionIndex, itemIndex] → flat index.
  // Returns -1 when sectionIndex is out of range so callers can no-op safely.
  function flatIndexOf(sectionIndex: number, itemIndex?: number): number {
    if (sectionIndex < 0 || sectionIndex >= sections.length) return -1;

    let pos = 0;

    for (let s = 0; s < sections.length; s++) {
      if (s === sectionIndex) {
        if (itemIndex === undefined) return pos; // header

        return pos + 1 + itemIndex;
      }

      pos += 1 + sections[s]!.items.length;
    }

    return -1; // unreachable
  }

  return {
    destroy() {
      virtualizer.destroy();
    },

    scrollToItem(sectionIndex, itemIndex, opts = {}) {
      const globalIndex = flatIndexOf(sectionIndex, itemIndex);

      if (globalIndex < 0) return;

      virtualizer.scrollToIndex(globalIndex, opts);
    },

    scrollToSection(sectionIndex, opts = {}) {
      const globalIndex = flatIndexOf(sectionIndex);

      if (globalIndex < 0) return;

      virtualizer.scrollToIndex(globalIndex, opts);
    },

    [Symbol.dispose]() {
      virtualizer.destroy();
    },

    update(nextSections) {
      sections = nextSections;
      flat = buildFlatEntries(sections);
      // estimateFn and getItemKey are closures that already read the live
      // `flat`/`sections` — passing them to update() would trigger
      // measuredByKey.clear(), discarding all DOM measurements on every data
      // refresh. Only pass count, then refresh to rebuild offsets.
      virtualizer.update({ count: flat.length });
      // refresh() rebuilds the offset table with the current estimates while
      // preserving any cached measurements.
      virtualizer.refresh();
    },
  };
}
