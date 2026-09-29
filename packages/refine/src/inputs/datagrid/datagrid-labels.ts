/**
 * Accessible UI strings for `ore-datagrid`, extracted from the component so the toolbar,
 * filter, and pagination templates stay focused on wiring. Every entry is overridable through
 * the grid's `labels` prop (a `Partial<DataGridLabels>` merged over `DEFAULT_LABELS`), which is
 * also the seam for supplying translated strings.
 */

export type DataGridLabels = {
  activeFilters: (count: number) => string;
  addFilter: string;
  ascending: string;
  clearAllFilters: string;
  clearFiltersAndSearch: string;
  clearSort: string;
  closeSearch: string;
  collapseRow: string;
  columnOptions: string;
  columnVisibility: string;
  comfortableDensity: string;
  compactDensity: string;
  contains: string;
  cozyDensity: string;
  data: string;
  descending: string;
  emptyValue: string;
  equals: string;
  expandRow: string;
  filter: string;
  filterBy: string;
  filterOperator: (field: string) => string;
  greaterThan: string;
  hiddenColumns: (count: number) => string;
  lessThan: string;
  nextPage: string;
  numericAscending: string;
  numericDescending: string;
  pageNavigation: string;
  pagination: string;
  previousPage: string;
  property: string;
  range: (start: number, end: number, total: number) => string;
  removeFilter: string;
  resetColumns: string;
  rowDetails: string;
  rows: (count: number) => string;
  rowsPerPage: string;
  search: string;
  selectAllRows: string;
  selectRow: string;
  sort: string;
  sortBy: string;
  views: string;
  visibleColumns: (count: number, total: number) => string;
};

export const DEFAULT_LABELS: DataGridLabels = {
  activeFilters: (count) => `${count} active filter${count === 1 ? '' : 's'}`,
  addFilter: 'Add filter…',
  ascending: 'A → Z',
  clearAllFilters: 'Clear all filters',
  clearFiltersAndSearch: 'Clear all filters & search',
  clearSort: 'Clear sort',
  closeSearch: 'Close search',
  collapseRow: 'Collapse row',
  columnOptions: 'Column options',
  columnVisibility: 'Column visibility',
  comfortableDensity: 'Density: Comfortable',
  compactDensity: 'Density: Compact',
  contains: 'Contains',
  cozyDensity: 'Density: Cozy',
  data: 'Data',
  descending: 'Z → A',
  emptyValue: '(empty)',
  equals: 'Equals',
  expandRow: 'Expand row',
  filter: 'Filter',
  filterBy: 'Filter by',
  filterOperator: (field) => `${field} operator`,
  greaterThan: 'Greater than',
  hiddenColumns: (count) => `${count} hidden column${count === 1 ? '' : 's'}`,
  lessThan: 'Less than',
  nextPage: 'Next page',
  numericAscending: '0 → 9',
  numericDescending: '9 → 0',
  pageNavigation: 'Page navigation',
  pagination: 'Pagination',
  previousPage: 'Previous page',
  property: 'Property',
  range: (start, end, total) => `${start} to ${end} of ${total}`,
  removeFilter: 'Remove filter',
  resetColumns: 'Reset',
  rowDetails: 'Row details',
  rows: (count) => `${count} row${count === 1 ? '' : 's'}`,
  rowsPerPage: 'Rows per page',
  search: 'Search',
  selectAllRows: 'Select all rows on this page',
  selectRow: 'Select row',
  sort: 'Sort',
  sortBy: 'Sort by',
  views: 'Views',
  visibleColumns: (count, total) => `${count} of ${total} visible`,
};
