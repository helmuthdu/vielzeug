import { computed, type ReadonlySignal, signal } from '@vielzeug/ripple';

import type { SelectionMode } from './datagrid';

// ── Selection control ─────────────────────────────────────────────────────────

export type SelectionControlOptions<T> = {
  /** Returns a unique string key for each row item. */
  getRowKey: (item: T) => string;
  /** Called when selection changes. Receives the full set of selected keys. */
  onSelectionChange?: (keys: Set<string>) => void;
  /** Returns the current page items reactively. */
  pageItems: () => T[];
  /** Returns the current selection mode reactively. */
  selectionMode: () => SelectionMode;
};

export type SelectionControl = {
  /** Deselect all rows. */
  clearSelection(): void;
  /** Whether all current-page rows are selected. */
  isAllSelected(): boolean;
  /** Whether a given row key is selected. */
  isSelected(key: string): boolean;
  /** Select (or deselect if already all selected) all rows on the current page. */
  selectAll(): void;
  /** Current selected row keys. Reactive signal. Returns a snapshot copy. */
  readonly selectedKeys: ReadonlySignal<ReadonlySet<string>>;
  /** Set the selection to an explicit set of keys. */
  setSelection(keys: Set<string>): void;
  /** Toggle selection for a single row. */
  toggleRow(key: string): void;
};

export const createSelectionControl = <T>(options: SelectionControlOptions<T>): SelectionControl => {
  const _selectedKeys = signal<Set<string>>(new Set());

  const isSelected = (key: string): boolean => _selectedKeys.value.has(key);

  const isAllSelected = (): boolean => {
    const page = options.pageItems();

    if (!page.length) return false;

    return page.every((item) => _selectedKeys.value.has(options.getRowKey(item)));
  };

  const _commitSelection = (next: Set<string>): void => {
    _selectedKeys.value = next;
    options.onSelectionChange?.(next);
  };

  const toggleRow = (key: string): void => {
    const mode = options.selectionMode();

    if (mode === 'none') return;

    const next = new Set(_selectedKeys.value);

    if (next.has(key)) {
      next.delete(key);
    } else if (mode === 'single') {
      next.clear();
      next.add(key);
    } else {
      next.add(key);
    }

    _commitSelection(next);
  };

  const selectAll = (): void => {
    if (options.selectionMode() !== 'multi') return;

    const page = options.pageItems();

    if (isAllSelected()) {
      const next = new Set(_selectedKeys.value);

      for (const item of page) next.delete(options.getRowKey(item));

      _commitSelection(next);
    } else {
      const next = new Set(_selectedKeys.value);

      for (const item of page) next.add(options.getRowKey(item));

      _commitSelection(next);
    }
  };

  const clearSelection = (): void => {
    _commitSelection(new Set());
  };

  const setSelection = (keys: Set<string>): void => {
    _commitSelection(new Set(keys));
  };

  return {
    clearSelection,
    isAllSelected,
    isSelected,
    selectAll,
    selectedKeys: computed(() => new Set(_selectedKeys.value)),
    setSelection,
    toggleRow,
  };
};
