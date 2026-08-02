import { signal } from '@vielzeug/ripple';
import { describe, expect, it } from 'vitest';

import { createDataGridModel, type DataGridColumn, type FilterOption, type SelectionMode } from './datagrid-model';

type Row = { age: number; id: string; name: string; role: string };

const COLUMNS: DataGridColumn<Row>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'role', label: 'Role' },
  { key: 'age', label: 'Age', sortable: true },
];

const ROWS: Row[] = [
  { age: 32, id: '1', name: 'Alice', role: 'Admin' },
  { age: 25, id: '2', name: 'Bob', role: 'Editor' },
  { age: 28, id: '3', name: 'Carol', role: 'Admin' },
];

function makeModel(options: { clientSide?: boolean; pageSize?: number; selectionMode?: SelectionMode } = {}) {
  const clientSide = signal(options.clientSide ?? true);
  const columns = signal(COLUMNS);
  const filterOptions = signal<FilterOption[] | undefined>(undefined);
  const items = signal(ROWS);
  const pageSize = signal(options.pageSize ?? 10);
  const selectionMode = signal<SelectionMode>(options.selectionMode ?? 'none');
  const selections: Set<string>[] = [];
  const model = createDataGridModel({
    clientSide,
    columns,
    filterOptions,
    getRowKey: (row) => row.id,
    items,
    onSelectionChange: (keys) => selections.push(keys),
    pageSize,
    selectionMode,
    sortMode: signal<'client' | 'server'>('client'),
  });

  return { clientSide, columns, filterOptions, items, model, pageSize, selectionMode, selections };
}

describe('createDataGridModel', () => {
  it('owns the complete client-side transform pipeline', () => {
    const { model, pageSize } = makeModel({ pageSize: 1 });

    model.setSearchQuery('a');
    model.activateFilterKey('role');
    model.setFilter('role', ['Admin']);
    model.sortBy('name');

    expect(model.filteredRows.value.map((row) => row.name)).toEqual(['Alice', 'Carol']);
    expect(model.currentPageItems.value.map((row) => row.name)).toEqual(['Alice']);

    model.sortBy('name');
    expect(model.currentPageItems.value.map((row) => row.name)).toEqual(['Carol']);

    model.nextPage();
    expect(model.currentPageItems.value.map((row) => row.name)).toEqual(['Alice']);

    pageSize.value = 0;
    expect(model.currentPageItems.value.map((row) => row.name)).toEqual(['Carol', 'Alice']);
  });

  it('derives filter choices only for active columns and prunes removed columns', async () => {
    const { columns, model } = makeModel();

    model.activateFilterKey('role');
    expect(model.filterDefs.value[0]?.options.map((option) => option.value)).toEqual(['Admin', 'Editor']);

    model.setFilter('role', ['Admin']);
    columns.value = [{ key: 'name', label: 'Name' }];
    await Promise.resolve();

    expect(model.filterDefs.value).toEqual([]);
    expect(model.filterValues.value.size).toBe(0);
  });

  it('preserves provided filter definitions while storing selected values in the model', () => {
    const { filterOptions, model } = makeModel();

    filterOptions.value = [{ key: 'role', label: 'Role', options: [{ value: 'Admin' }] }];
    model.setFilter('role', ['Admin']);

    expect(model.filterDefs.value[0]?.operators?.map((operator) => operator.value)).toEqual([
      'contains',
      'equals',
      'gt',
      'lt',
    ]);
    expect(model.filteredRows.value.map((row) => row.name)).toEqual(['Alice', 'Carol']);
  });

  it('owns visible columns independently of the data pipeline', () => {
    const { model } = makeModel();

    model.toggleColumnVisibility('age');
    expect(model.visibleColumns.value.map((column) => column.key)).toEqual(['name', 'role']);

    model.toggleColumnVisibility('age');
    expect(model.visibleColumns.value.map((column) => column.key)).toEqual(['name', 'role', 'age']);
  });

  it('owns selection for the current page and exposes selected source rows', () => {
    const { model, selections } = makeModel({ pageSize: 1, selectionMode: 'multi' });

    model.selectAll();
    expect(model.selectedKeys.value).toEqual(new Set(['1']));
    expect(model.selectedRows.value.map((row) => row.name)).toEqual(['Alice']);

    model.nextPage();
    model.toggleRow('2');

    expect(model.selectedKeys.value).toEqual(new Set(['1', '2']));
    expect(selections).toHaveLength(2);
  });

  it('keeps server-owned source rows unsorted and unfiltered while retaining UI state', () => {
    const { model } = makeModel({ clientSide: false });

    model.setSearchQuery('alice');
    model.setFilter('role', ['Admin']);
    model.sortBy('name');

    expect(model.searchQuery.value).toBe('alice');
    expect(model.sortState.value).toEqual({ direction: 'asc', key: 'name' });
    expect(model.currentPageItems.value.map((row) => row.name)).toEqual(['Alice', 'Bob', 'Carol']);
  });

  it('resets pagination when a transformed result changes', () => {
    const { model } = makeModel({ pageSize: 1 });

    model.nextPage();
    expect(model.pageIndex.value).toBe(1);

    model.setSearchQuery('alice');
    expect(model.pageIndex.value).toBe(0);
  });
});
