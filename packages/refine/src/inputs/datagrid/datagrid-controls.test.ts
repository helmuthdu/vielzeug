import { signal } from '@vielzeug/ripple';
import { describe, expect, it } from 'vitest';

import { createDataGridControls } from './datagrid-controls';

const COLS = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'role', label: 'Role' },
];

const ROWS = [
  { id: '1', name: 'Alice', role: 'Admin' },
  { id: '2', name: 'Bob', role: 'Editor' },
  { id: '3', name: 'Carol', role: 'Admin' },
];

function makeControls(filterOptions?: unknown[]) {
  const columns = signal(COLS);
  const rows = signal(ROWS as Record<string, unknown>[]);
  const filterOptionsSignal = signal(
    filterOptions as Parameters<typeof createDataGridControls>[0]['filterOptions']['value'],
  );

  return {
    columns,
    ctrl: createDataGridControls({
      columns,
      filterOptions: filterOptionsSignal,
      rows,
    }),
    rows,
  };
}

describe('createDataGridControls', () => {
  describe('search', () => {
    it('searchQuery starts empty', () => {
      const { ctrl } = makeControls();

      expect(ctrl.searchQuery.value).toBe('');
    });

    it('searchActive starts false', () => {
      const { ctrl } = makeControls();

      expect(ctrl.searchActive.value).toBe(false);
    });

    it('setSearchQuery updates searchQuery', () => {
      const { ctrl } = makeControls();

      ctrl.setSearchQuery('hello');

      expect(ctrl.searchQuery.value).toBe('hello');
    });

    it('toggleSearch opens and sets searchActive to true', () => {
      const { ctrl } = makeControls();

      ctrl.toggleSearch();

      expect(ctrl.searchActive.value).toBe(true);
    });

    it('toggleSearch closed clears searchQuery and sets searchActive false', () => {
      const { ctrl } = makeControls();

      ctrl.setSearchQuery('test');
      ctrl.toggleSearch();
      ctrl.toggleSearch();

      expect(ctrl.searchActive.value).toBe(false);
      expect(ctrl.searchQuery.value).toBe('');
    });
  });

  describe('filter', () => {
    it('filterDefs starts empty with no filterOptions and no active keys', () => {
      const { ctrl } = makeControls();

      expect(ctrl.filterDefs.value).toHaveLength(0);
    });

    it('activateFilterKey adds a derived filter def', () => {
      const { ctrl } = makeControls();

      ctrl.activateFilterKey('role');

      expect(ctrl.filterDefs.value).toHaveLength(1);
      expect(ctrl.filterDefs.value[0]?.key).toBe('role');
      expect(ctrl.filterDefs.value[0]?.label).toBe('Role');
    });

    it('activateFilterKey is idempotent — calling twice does not duplicate the rule', () => {
      const { ctrl } = makeControls();

      ctrl.activateFilterKey('role');
      ctrl.activateFilterKey('role');

      expect(ctrl.filterDefs.value).toHaveLength(1);
    });

    it('derived filter options auto-derived from row values', () => {
      const { ctrl } = makeControls();

      ctrl.activateFilterKey('role');

      const opts = ctrl.filterDefs.value[0]?.options.map((o) => o.value);

      expect(opts).toContain('Admin');
      expect(opts).toContain('Editor');
    });

    it('provided filterOptions are included in filterDefs', () => {
      const { ctrl } = makeControls([{ key: 'role', label: 'Role', options: [{ value: 'Admin' }] }]);

      expect(ctrl.filterDefs.value).toHaveLength(1);
      expect(ctrl.filterDefs.value[0]?.key).toBe('role');
    });

    it('setFilter stores selected values', () => {
      const { ctrl } = makeControls();

      ctrl.activateFilterKey('role');
      ctrl.setFilter('role', ['Admin']);

      expect(ctrl.filterValues.value.get('role')).toEqual({ operator: 'contains', values: new Set(['Admin']) });
    });

    it('setFilter with [] removes the rule from filterState', () => {
      const { ctrl } = makeControls();

      ctrl.activateFilterKey('role');
      ctrl.setFilter('role', ['Admin']);
      ctrl.setFilter('role', []);

      expect(ctrl.filterValues.value.has('role')).toBe(false);
    });

    it('removeFilter deletes the rule and its values', () => {
      const { ctrl } = makeControls();

      ctrl.activateFilterKey('role');
      ctrl.setFilter('role', ['Admin']);
      ctrl.removeFilter('role');

      expect(ctrl.filterValues.value.has('role')).toBe(false);
      expect(ctrl.filterDefs.value).toHaveLength(0);
    });

    it('clearAllFilters removes all active rules and values', () => {
      const { ctrl } = makeControls();

      ctrl.activateFilterKey('name');
      ctrl.activateFilterKey('role');
      ctrl.setFilter('role', ['Admin']);
      ctrl.clearAllFilters();

      expect(ctrl.filterDefs.value).toHaveLength(0);
      expect(ctrl.filterValues.value.size).toBe(0);
    });
  });

  describe('filteredRows (end-to-end data pipeline)', () => {
    it('returns all rows when search is empty and no filters are active', () => {
      const { ctrl } = makeControls();

      expect(ctrl.filteredRows.value).toHaveLength(ROWS.length);
    });

    it('filters rows by search query (case-insensitive)', () => {
      const { ctrl } = makeControls();

      ctrl.setSearchQuery('alice');

      expect(ctrl.filteredRows.value).toHaveLength(1);
      expect(ctrl.filteredRows.value[0]?.name).toBe('Alice');
    });

    it('returns empty array when search query matches nothing', () => {
      const { ctrl } = makeControls();

      ctrl.setSearchQuery('zzznomatch');

      expect(ctrl.filteredRows.value).toHaveLength(0);
    });

    it('filters rows by active filter rule', () => {
      const { ctrl } = makeControls();

      ctrl.activateFilterKey('role');
      ctrl.setFilter('role', ['Admin']);

      const names = ctrl.filteredRows.value.map((r) => r['name']);

      expect(names).toContain('Alice');
      expect(names).toContain('Carol');
      expect(names).not.toContain('Bob');
    });

    it('composes search then filter (filter operates on search result)', () => {
      const { ctrl } = makeControls();

      ctrl.setSearchQuery('a');
      ctrl.activateFilterKey('role');
      ctrl.setFilter('role', ['Admin']);

      const names = ctrl.filteredRows.value.map((r) => r['name']);

      expect(names).toContain('Alice');
      expect(names).toContain('Carol');
      expect(names).not.toContain('Bob');
    });
  });

  describe('column visibility', () => {
    it('hiddenColumns starts empty', () => {
      const { ctrl } = makeControls();

      expect(ctrl.hiddenColumns.value.size).toBe(0);
    });

    it('toggleColumnVisibility hides a column', () => {
      const { ctrl } = makeControls();

      ctrl.toggleColumnVisibility('name');

      expect(ctrl.hiddenColumns.value.has('name')).toBe(true);
    });

    it('toggleColumnVisibility toggles a hidden column back to visible', () => {
      const { ctrl } = makeControls();

      ctrl.toggleColumnVisibility('name');
      ctrl.toggleColumnVisibility('name');

      expect(ctrl.hiddenColumns.value.has('name')).toBe(false);
    });
  });

  describe('resetSearch / resetFilters', () => {
    it('resetSearch clears the search query and closes search', () => {
      const { ctrl } = makeControls();

      ctrl.toggleSearch();
      ctrl.setSearchQuery('test');
      ctrl.resetSearch();

      expect(ctrl.searchQuery.value).toBe('');
      expect(ctrl.searchActive.value).toBe(false);
    });

    it('resetSearch does not affect filter state', () => {
      const { ctrl } = makeControls();

      ctrl.activateFilterKey('role');
      ctrl.setFilter('role', ['Admin']);
      ctrl.resetSearch();

      expect(ctrl.filterDefs.value).toHaveLength(1);
      expect(ctrl.filterValues.value.get('role')).toEqual({ operator: 'contains', values: new Set(['Admin']) });
    });

    it('resetFilters clears all filter rules and values', () => {
      const { ctrl } = makeControls();

      ctrl.activateFilterKey('role');
      ctrl.setFilter('role', ['Admin']);
      ctrl.resetFilters();

      expect(ctrl.filterDefs.value).toHaveLength(0);
      expect(ctrl.filterValues.value.size).toBe(0);
    });

    it('resetFilters does not affect search state', () => {
      const { ctrl } = makeControls();

      ctrl.setSearchQuery('test');
      ctrl.resetFilters();

      expect(ctrl.searchQuery.value).toBe('test');
    });

    it('column visibility is not affected by resetSearch or resetFilters', () => {
      const { ctrl } = makeControls();

      ctrl.toggleColumnVisibility('name');
      ctrl.resetSearch();
      ctrl.resetFilters();

      expect(ctrl.hiddenColumns.value.has('name')).toBe(true);
    });
  });

  describe('column pruning', () => {
    it('removes stale filter rules when a column is removed', async () => {
      const columns = signal(COLS);
      const rows = signal(ROWS as Record<string, unknown>[]);
      const filterOptions = signal(undefined);
      const ctrl = createDataGridControls({ columns, filterOptions, rows });

      ctrl.activateFilterKey('role');
      ctrl.setFilter('role', ['Admin']);

      columns.value = [{ key: 'name', label: 'Name', sortable: true }];
      await Promise.resolve();

      expect(ctrl.filterDefs.value.some((f) => f.key === 'role')).toBe(false);
      expect(ctrl.filterValues.value.has('role')).toBe(false);
    });
  });
});
