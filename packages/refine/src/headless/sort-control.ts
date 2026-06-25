import { computed, type Readable, signal } from '@vielzeug/ripple';

import type { DataGridColumn, SortDirection, SortState } from './datagrid';

// ── Sort control ──────────────────────────────────────────────────────────────

export type SortControlOptions<T> = {
  /** Returns the current column definitions reactively. */
  columns: () => DataGridColumn<T>[];
  /** The reactive list of items to sort. */
  items: Readable<T[]>;
  /** Called when sort state changes. */
  onSortChange?: (sort: SortState) => void;
};

export type SortControl<T> = {
  /** Sort by the given column key — cycles asc → desc → none. */
  sortBy(key: string): void;
  /** Sorted version of the provided items. Reactive signal. */
  readonly sortedItems: Readable<T[]>;
  /** Current sort state. Reactive signal. */
  readonly sortState: Readable<SortState>;
  /** Set sort to an explicit key and direction. Passing `'none'` clears the sort. */
  sortTo(key: string, direction: SortDirection): void;
};

export const createSortControl = <T>(options: SortControlOptions<T>): SortControl<T> => {
  const items = options.items;
  const _sortKey = signal<string>('');
  const _sortDir = signal<SortDirection>('none');

  const sortState = computed<SortState>(() => ({ direction: _sortDir.value, key: _sortKey.value }));

  const sortedItems = computed<T[]>(() => {
    const all = items.value;
    const key = _sortKey.value;
    const dir = _sortDir.value;

    if (!key || dir === 'none') return all;

    const col = options.columns().find((c) => c.key === key);

    return all.slice().sort((a, b) => {
      const av = col?.sortValue ? col.sortValue(a) : ((a as Record<string, unknown>)[key] as number | string);
      const bv = col?.sortValue ? col.sortValue(b) : ((b as Record<string, unknown>)[key] as number | string);
      const cmp =
        typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av ?? '').localeCompare(String(bv ?? ''));

      return dir === 'asc' ? cmp : -cmp;
    });
  });

  const sortBy = (key: string): void => {
    if (_sortKey.value !== key) {
      _sortKey.value = key;
      _sortDir.value = 'asc';
    } else if (_sortDir.value === 'asc') {
      _sortDir.value = 'desc';
    } else if (_sortDir.value === 'desc') {
      _sortKey.value = '';
      _sortDir.value = 'none';
    }

    options.onSortChange?.({ direction: _sortDir.value, key: _sortKey.value });
  };

  const sortTo = (key: string, direction: SortDirection): void => {
    if (direction === 'none') {
      _sortKey.value = '';
      _sortDir.value = 'none';
    } else {
      _sortKey.value = key;
      _sortDir.value = direction;
    }

    options.onSortChange?.({ direction: _sortDir.value, key: _sortKey.value });
  };

  return { sortBy, sortedItems, sortState, sortTo };
};
