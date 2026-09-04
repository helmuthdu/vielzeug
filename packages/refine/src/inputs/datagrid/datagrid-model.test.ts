import { signal } from '@vielzeug/ripple';
import { describe, expect, it } from 'vitest';

import {
  createDataGridModel,
  type DataGridColumn,
  type DataGridView,
  type FilterOption,
  type SelectionMode,
} from './datagrid-model';

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
  const activeView = signal<DataGridView<Row> | undefined>(undefined);
  const clientSide = signal(options.clientSide ?? true);
  const columns = signal(COLUMNS);
  const filterOptions = signal<FilterOption[] | undefined>(undefined);
  const items = signal(ROWS);
  const pageSize = signal(options.pageSize ?? 10);
  const selectionMode = signal<SelectionMode>(options.selectionMode ?? 'none');
  const selections: Set<string>[] = [];
  const model = createDataGridModel({
    activeView,
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

  return { activeView, clientSide, columns, filterOptions, items, model, pageSize, selectionMode, selections };
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

  it('composes a predefined view before search and field filters', () => {
    const { activeView, model } = makeModel();
    activeView.value = { filter: (row) => row.role === 'Admin', id: 'admins', label: 'Admins' };

    expect(model.filteredRows.value.map((row) => row.name)).toEqual(['Alice', 'Carol']);
    model.activateFilterKey('name');
    expect(model.filterDefs.value[0]?.options.map((option) => option.value)).toEqual(['Alice', 'Carol']);

    model.setSearchQuery('ali');
    model.setActiveFilterKeys(['age']);
    model.setFilterOperator('age', 'gt');
    model.setFilter('age', ['30']);

    expect(model.filteredRows.value.map((row) => row.name)).toEqual(['Alice']);
  });

  it('searches the values exposed by column cell accessors', () => {
    const { columns, model } = makeModel();
    columns.value = [
      ...COLUMNS.filter((column) => column.key !== 'role'),
      { cell: (row) => (row.role === 'Admin' ? 'Administrator' : row.role), key: 'role', label: 'Role' },
    ];

    model.setSearchQuery('administrator');

    expect(model.filteredRows.value.map((row) => row.name)).toEqual(['Alice', 'Carol']);
  });

  it('filters computed columns through their filter value accessor', () => {
    const { columns, model } = makeModel();
    columns.value = [
      ...COLUMNS,
      {
        cell: (row) => `${row.age} years`,
        filterLabel: (row) => `${row.age * 2} points`,
        filterValue: (row) => row.age * 2,
        key: 'score',
        label: 'Score',
      },
    ];

    model.setActiveFilterKeys(['score']);
    model.setFilterOperator('score', 'lt');
    model.setFilter('score', ['60']);

    expect(model.filterDefs.value[0]?.options).toEqual([
      { label: '64 points', value: '64' },
      { label: '50 points', value: '50' },
      { label: '56 points', value: '56' },
    ]);
    expect(model.filteredRows.value.map((row) => row.name)).toEqual(['Bob', 'Carol']);
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

  it('filters by provided metadata that is not a visible column', () => {
    const { columns, filterOptions, model } = makeModel();
    columns.value = [{ key: 'name', label: 'Name' }];
    filterOptions.value = [{ key: 'role', label: 'Role', options: [{ value: 'Admin' }, { value: 'Editor' }] }];

    model.setActiveFilterKeys(['role']);
    model.setFilter('role', ['Admin']);

    expect(model.filteredRows.value.map((row) => row.name)).toEqual(['Alice', 'Carol']);
  });

  it('uses the first configured operator when a filter receives its first value', () => {
    const { filterOptions, model } = makeModel();
    filterOptions.value = [
      {
        key: 'role',
        label: 'Role',
        operators: [{ label: 'Equals', value: 'equals' }],
        options: [{ value: 'min' }],
      },
    ];

    model.setActiveFilterKeys(['role']);
    model.setFilter('role', ['min']);

    expect(model.filteredRows.value).toEqual([]);
  });

  it('persists an operator selected before the filter receives a value', () => {
    const { model } = makeModel();

    model.setActiveFilterKeys(['age']);
    model.setFilterOperator('age', 'gt');
    model.setFilter('age', ['28']);

    expect(model.filteredRows.value.map((row) => row.name)).toEqual(['Alice']);
  });

  it('preserves provided filter definitions while storing selected values in the model', () => {
    const { filterOptions, model } = makeModel();

    filterOptions.value = [{ key: 'role', label: 'Role', options: [{ value: 'Admin' }] }];
    model.setActiveFilterKeys(['role']);
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

    model.toggleColumnVisibility('age');
    model.toggleColumnVisibility('role');
    model.toggleColumnVisibility('name');
    expect(model.visibleColumns.value.map((column) => column.key)).toEqual(['name']);

    model.resetColumnVisibility();
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
    const { activeView, model } = makeModel({ clientSide: false });

    activeView.value = { filter: () => false, id: 'empty', label: 'Empty' };
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
