import type { DataGridLabels, FilterOption } from '@vielzeug/refine/datagrid';
import { t } from '../core/i18n';

export function categoricalOperators(): NonNullable<FilterOption['operators']> {
  return [{ label: t('dataGrid.equals'), value: 'equals' }];
}

export function crmDataGridLabels(): DataGridLabels {
  return {
    activeFilters: (count) => t(count === 1 ? 'dataGrid.activeFilter' : 'dataGrid.activeFilters', { count }),
    addFilter: t('dataGrid.addFilter'),
    ascending: t('dataGrid.ascending'),
    clearAllFilters: t('dataGrid.clearAllFilters'),
    clearFiltersAndSearch: t('dataGrid.clearFiltersAndSearch'),
    clearSort: t('dataGrid.clearSort'),
    closeSearch: t('dataGrid.closeSearch'),
    collapseRow: t('dataGrid.collapseRow'),
    columnOptions: t('dataGrid.columnOptions'),
    columnVisibility: t('dataGrid.columnVisibility'),
    comfortableDensity: t('dataGrid.comfortableDensity'),
    compactDensity: t('dataGrid.compactDensity'),
    contains: t('dataGrid.contains'),
    cozyDensity: t('dataGrid.cozyDensity'),
    data: t('dataGrid.data'),
    descending: t('dataGrid.descending'),
    emptyValue: t('dataGrid.emptyValue'),
    equals: t('dataGrid.equals'),
    expandRow: t('dataGrid.expandRow'),
    filter: t('dataGrid.filter'),
    filterBy: t('dataGrid.filterBy'),
    filterOperator: (field) => t('dataGrid.filterOperator', { field }),
    greaterThan: t('dataGrid.greaterThan'),
    hiddenColumns: (count) => t(count === 1 ? 'dataGrid.hiddenColumn' : 'dataGrid.hiddenColumns', { count }),
    lessThan: t('dataGrid.lessThan'),
    nextPage: t('dataGrid.nextPage'),
    numericAscending: t('dataGrid.numericAscending'),
    numericDescending: t('dataGrid.numericDescending'),
    pageNavigation: t('dataGrid.pageNavigation'),
    pagination: t('dataGrid.pagination'),
    previousPage: t('dataGrid.previousPage'),
    property: t('dataGrid.property'),
    range: (start, end, total) => t('dataGrid.range', { end, start, total }),
    removeFilter: t('dataGrid.removeFilter'),
    resetColumns: t('dataGrid.resetColumns'),
    rowDetails: t('dataGrid.rowDetails'),
    rows: (count) => t(count === 1 ? 'dataGrid.row' : 'dataGrid.rows', { count }),
    rowsPerPage: t('dataGrid.rowsPerPage'),
    search: t('dataGrid.search'),
    selectAllRows: t('dataGrid.selectAllRows'),
    selectRow: t('dataGrid.selectRow'),
    sort: t('dataGrid.sort'),
    sortBy: t('dataGrid.sortBy'),
    views: t('dataGrid.views'),
    visibleColumns: (count, total) => t('dataGrid.visibleColumns', { count, total }),
  };
}
