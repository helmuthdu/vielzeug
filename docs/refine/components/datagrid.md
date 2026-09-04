# Data Grid

An accessible, keyboard-navigable data grid with built-in column sorting, row-level pagination, single/multi row selection, inline search, filter, column resizing, and row expansion. The controls bar above the table provides named views (tabs), inline search, sort, filter, column visibility, and a row-add action — all reactive, no wrapper needed.

## Basic Usage

<ComponentPreview height="400px">

```html
<ore-datagrid id="dg-basic" label="Team Members"></ore-datagrid>
<script>
  const grid = document.getElementById('dg-basic');
  grid.columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'role', label: 'Role' },
    { key: 'email', label: 'Email' },
  ];
  grid.rows = [
    { id: '1', name: 'Alice', role: 'Admin', email: 'alice@example.com' },
    { id: '2', name: 'Bob', role: 'Editor', email: 'bob@example.com' },
    { id: '3', name: 'Carol', role: 'Viewer', email: 'carol@example.com' },
  ];
</script>
```

</ComponentPreview>

### Declarative Column API

Instead of the `columns` JS property, you can define columns declaratively as `<ore-column>` child elements. Attribute mutations (e.g. adding `sortable`, changing `label`) are observed and re-render the grid automatically.

::: tip Precedence
The `columns` JS property takes precedence over `<ore-column>` children when both are set. Pass `undefined` (or omit `columns`) to use the declarative API.
:::

<ComponentPreview>

```html
<ore-datagrid id="dg-declarative" label="Team Members">
  <ore-column key="name" label="Name" sortable></ore-column>
  <ore-column key="role" label="Role"></ore-column>
  <ore-column key="email" label="Email" width="18rem"></ore-column>
</ore-datagrid>
<script>
  document.getElementById('dg-declarative').rows = [
    { id: '1', name: 'Alice', role: 'Admin', email: 'alice@example.com' },
    { id: '2', name: 'Bob', role: 'Editor', email: 'bob@example.com' },
    { id: '3', name: 'Carol', role: 'Viewer', email: 'carol@example.com' },
  ];
</script>
```

</ComponentPreview>

## Sorting

Set `sortable: true` on any column. Clicking or pressing Enter/Space on the header cycles `none → ascending → descending → none`. Text columns show `A → Z / Z → A`; set `sortType: 'number'` for numeric columns to show `0 → 9 / 9 → 0`. When `sortType` is omitted, raw numeric row values are detected automatically.

<ComponentPreview>

```html
<ore-datagrid id="dg-sort" label="Users"></ore-datagrid>
<script>
  const grid = document.getElementById('dg-sort');
  grid.columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'age', label: 'Age', sortable: true, sortType: 'number' },
    { key: 'role', label: 'Role' },
  ];
  grid.rows = [
    { id: '1', name: 'Alice', age: 32, role: 'Admin' },
    { id: '2', name: 'Bob', age: 25, role: 'Editor' },
    { id: '3', name: 'Carol', age: 28, role: 'Viewer' },
  ];
</script>
```

</ComponentPreview>

## Row Selection

### Single Selection

Click a row or press Enter/Space to select it. Clicking the same row again deselects it.

<ComponentPreview>

```html
<ore-datagrid id="dg-single" label="Users" selection-mode="single"></ore-datagrid>
<script>
  const grid = document.getElementById('dg-single');
  grid.columns = [
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Role' },
  ];
  grid.rows = [
    { id: '1', name: 'Alice', role: 'Admin' },
    { id: '2', name: 'Bob', role: 'Editor' },
    { id: '3', name: 'Carol', role: 'Viewer' },
  ];
</script>
```

</ComponentPreview>

### Multi Selection

A checkbox column is prepended automatically. The header checkbox selects/deselects all visible rows.

<ComponentPreview>

```html
<ore-datagrid id="dg-multi" label="Users" selection-mode="multi"></ore-datagrid>
<script>
  const grid = document.getElementById('dg-multi');
  grid.columns = [
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Role' },
    { key: 'email', label: 'Email' },
  ];
  grid.rows = [
    { id: '1', name: 'Alice', role: 'Admin', email: 'alice@example.com' },
    { id: '2', name: 'Bob', role: 'Editor', email: 'bob@example.com' },
    { id: '3', name: 'Carol', role: 'Viewer', email: 'carol@example.com' },
  ];
</script>
```

</ComponentPreview>

## Pagination

Set `page-size` to control how many rows appear per page. Set it to `0` to disable pagination and show all rows.

<ComponentPreview>

```html
<ore-datagrid id="dg-page" label="Users" page-size="3"></ore-datagrid>
<script>
  const grid = document.getElementById('dg-page');
  grid.columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
  ];
  grid.rows = Array.from({ length: 12 }, (_, i) => ({
    id: String(i + 1),
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
  }));
</script>
```

</ComponentPreview>

## Custom Cell Renderers

Use `cell` for text formatting. Use `renderCell` when a cell needs trusted structured content such as a link, button, badge, or another Refine component. `renderCell` accepts an Ore `HTMLResult`, so values remain escaped and no `unsafeHtml` sink is involved. Keep `cell` alongside `renderCell` when the grid needs a concise text value for the cell title.

<ComponentPreview>

```html
<ore-datagrid id="dg-cell" label="Orders"></ore-datagrid>
<script>
  const grid = document.getElementById('dg-cell');
  grid.columns = [
    {
      key: 'id',
      label: 'Order #',
      cell: (row) => row.id,
      renderCell: (row) => Ore.html`<ore-button variant="text" size="sm">${row.id}</ore-button>`,
    },
    { key: 'total', label: 'Total', cell: (row) => `$${row.total.toFixed(2)}` },
    { key: 'date', label: 'Date', cell: (row) => new Date(row.date).toLocaleDateString() },
  ];
  grid.rows = [
    { id: 'ORD-001', total: 149.99, date: '2025-06-01' },
    { id: 'ORD-002', total: 49.0, date: '2025-06-05' },
    { id: 'ORD-003', total: 299.5, date: '2025-06-08' },
  ];
</script>
```

</ComponentPreview>

## Striped Rows

<ComponentPreview>

```html
<ore-datagrid id="dg-striped" label="Users" striped></ore-datagrid>
<script>
  const grid = document.getElementById('dg-striped');
  grid.columns = [
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Role' },
  ];
  grid.rows = [
    { id: '1', name: 'Alice', role: 'Admin' },
    { id: '2', name: 'Bob', role: 'Editor' },
    { id: '3', name: 'Carol', role: 'Viewer' },
    { id: '4', name: 'Dan', role: 'Viewer' },
  ];
</script>
```

</ComponentPreview>

## Full Width

Add `fullwidth` to stretch the grid to fill its container.

<ComponentPreview>

```html
<ore-datagrid id="dg-fw" label="Users" fullwidth></ore-datagrid>
<script>
  const grid = document.getElementById('dg-fw');
  grid.columns = [
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Role' },
    { key: 'email', label: 'Email' },
  ];
  grid.rows = [
    { id: '1', name: 'Alice', role: 'Admin', email: 'alice@example.com' },
    { id: '2', name: 'Bob', role: 'Editor', email: 'bob@example.com' },
    { id: '3', name: 'Carol', role: 'Viewer', email: 'carol@example.com' },
  ];
</script>
```

</ComponentPreview>

## Density

Use the `density` attribute to control cell padding. Font size is unaffected.

<ComponentPreview>

```html
<div style="display:flex;flex-direction:column;gap:1rem;">
  <ore-datagrid id="dg-compact" label="Compact" density="compact"></ore-datagrid>
  <ore-datagrid id="dg-cozy" label="Cozy (default)" density="cozy"></ore-datagrid>
  <ore-datagrid id="dg-comfortable" label="Comfortable" density="comfortable"></ore-datagrid>
</div>
<script>
  const cols = [
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Role' },
  ];
  const rows = [
    { id: '1', name: 'Alice', role: 'Admin' },
    { id: '2', name: 'Bob', role: 'Editor' },
  ];
  for (const id of ['dg-compact', 'dg-cozy', 'dg-comfortable']) {
    const g = document.getElementById(id);
    g.columns = cols;
    g.rows = rows;
  }
</script>
```

</ComponentPreview>

## Loading State

<ComponentPreview>

```html
<ore-datagrid id="dg-loading" label="Users" loading></ore-datagrid>
<script>
  const grid = document.getElementById('dg-loading');
  grid.columns = [
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Role' },
  ];
  grid.rows = [
    { id: '1', name: 'Alice', role: 'Admin' },
    { id: '2', name: 'Bob', role: 'Editor' },
  ];
</script>
```

</ComponentPreview>

## Empty State

<ComponentPreview>

```html
<ore-datagrid id="dg-empty" label="Users" empty-text="No users found. Try adjusting your filters."> </ore-datagrid>
<script>
  const grid = document.getElementById('dg-empty');
  grid.columns = [
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Role' },
  ];
  grid.rows = [];
</script>
```

</ComponentPreview>

## Scrollable / Fixed Height

Set `--datagrid-max-height` to constrain the scroll area; the column header stays sticky.

<ComponentPreview>

```html
<ore-datagrid id="dg-scroll" label="Users" style="--datagrid-max-height:200px"> </ore-datagrid>
<script>
  const grid = document.getElementById('dg-scroll');
  grid.columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'role', label: 'Role' },
  ];
  grid.rows = Array.from({ length: 20 }, (_, i) => ({
    id: String(i + 1),
    name: `User ${i + 1}`,
    role: i % 3 === 0 ? 'Admin' : i % 3 === 1 ? 'Editor' : 'Viewer',
  }));
</script>
```

</ComponentPreview>

## Column Resizing

Set `resizable: true` on any column to add a drag handle on its right edge. Dragged widths persist across re-renders and page changes.

<ComponentPreview>

```html
<ore-datagrid id="dg-resize" label="Users" fullwidth></ore-datagrid>
<script>
  const grid = document.getElementById('dg-resize');
  grid.columns = [
    { key: 'name', label: 'Name', sortable: true, resizable: true, width: '12rem' },
    { key: 'role', label: 'Role', resizable: true },
    { key: 'email', label: 'Email' },
  ];
  grid.rows = [
    { id: '1', name: 'Alice', role: 'Admin', email: 'alice@example.com' },
    { id: '2', name: 'Bob', role: 'Editor', email: 'bob@example.com' },
    { id: '3', name: 'Carol', role: 'Viewer', email: 'carol@example.com' },
  ];
</script>
```

</ComponentPreview>

## Row Expansion

Add `expandable` to the grid and supply a `renderExpanded` function on one or more columns. Each row gets a toggle button that shows an inline detail panel spanning all columns. Multiple rows can be expanded simultaneously. The `row-expand` event fires with `{ key, expanded }` on each toggle.

<ComponentPreview>

```html
<ore-datagrid id="dg-expand" label="Team Members" expandable></ore-datagrid>
<script>
  const grid = document.getElementById('dg-expand');
  grid.columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      renderExpanded: (row) => `
        <div style="padding:0.5rem 0">
          <strong>${row.name}</strong> · ${row.role}<br>
          <a href="mailto:${row.email}">${row.email}</a>
        </div>`,
    },
    { key: 'role', label: 'Role' },
    { key: 'email', label: 'Email' },
  ];
  grid.rows = [
    { id: '1', name: 'Alice', role: 'Admin', email: 'alice@example.com' },
    { id: '2', name: 'Bob', role: 'Editor', email: 'bob@example.com' },
    { id: '3', name: 'Carol', role: 'Viewer', email: 'carol@example.com' },
  ];
  grid.addEventListener('row-expand', (e) => {
    console.log('row-expand', e.detail); // { key: '1', expanded: true }
  });
</script>
```

</ComponentPreview>

## Controls Bar

Every datagrid renders a controls bar above the table with two regions:

- **Left — Named views (tabs):** When `views` is set, tabs appear here. A view may provide a client-side `filter(row)` predicate that composes with search and field filters. Clicking a tab fires `view-change`; your application keeps `active-view` controlled. When search is active, the expanded search input replaces this region.
- **Right — Action bar:** Sort, Filter, Column visibility, density, custom actions, and Search. Sort, Filter, and Columns share the same panel width, header spacing, conditional reset icon, and customized-state indicator.

### Inline Search

Click the search icon in the action bar to expand an inline input that replaces the left region. It filters rows client-side across the values exposed by each column, including formatted values returned by `cell`, and resets pagination on each keystroke. Click the icon again (now an ✕) or press Escape to close and clear the query. Customise the placeholder with `search-placeholder`.

### Sort Popover

Click **Sort** to open a panel where you can choose a column and direction (A→Z / Z→A). The selected column and direction are applied immediately and kept in sync with header-cell sort clicks. The clear icon appears only while a sort is active.

### Filter Popover

Click **Filter by** to open a field picker. Click any column name to add a multi-select filter rule for it. Option values are derived from the raw or `filterValue` data, while labels use `filterLabel` or the formatted text returned by `cell`. Return numbers from `filterValue` for chronological or other range comparisons. Each active rule shows a combobox below the field picker. The header clear icon appears only while filter rules are active; individual rules retain their own remove action.

Pre-define filter options via the `filterOptions` JS property. When provided, those options replace the auto-derived ones for matching column keys. The type is `FilterOption[]` — each entry has `key`, `label`, and `options`.

### Column Visibility

The columns icon opens an ordered checkbox list. Its header reports how many columns are visible and shows the reset icon only after customization; the toolbar icon shows a dot while visibility differs from the default. The final visible column is protected from being hidden. Column visibility changes presentation only—search and filters continue to operate on the configured column values.

<ComponentPreview>

```html
<ore-datagrid id="dg-controls" label="Users" search-placeholder="Search…" fullwidth></ore-datagrid>
<script>
  const ALL_ROWS = [
    { id: '1', name: 'Alice', role: 'Admin', department: 'Engineering', email: 'alice@example.com' },
    { id: '2', name: 'Bob', role: 'Editor', department: 'Marketing', email: 'bob@example.com' },
    { id: '3', name: 'Carol', role: 'Viewer', department: 'Engineering', email: 'carol@example.com' },
    { id: '4', name: 'Dan', role: 'Viewer', department: 'Design', email: 'dan@example.com' },
    { id: '5', name: 'Eve', role: 'Editor', department: 'Marketing', email: 'eve@example.com' },
    { id: '6', name: 'Frank', role: 'Admin', department: 'Design', email: 'frank@example.com' },
  ];
  const grid = document.getElementById('dg-controls');
  grid.columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'role', label: 'Role', sortable: true },
    { key: 'department', label: 'Department' },
    { key: 'email', label: 'Email' },
  ];
  grid.views = [
    { id: 'all', label: 'All' },
    { id: 'admin', label: 'Admins', filter: (row) => row.role === 'Admin' },
    { id: 'engineering', label: 'Engineering', filter: (row) => row.department === 'Engineering' },
  ];
  grid.activeView = 'all';
  grid.rows = ALL_ROWS;

  grid.addEventListener('view-change', (e) => {
    grid.activeView = e.detail.id;
  });

  /* Slot an "Add row" button into the actions slot */
  // <ore-button slot="actions" size="sm">Add row</ore-button>
</script>
```

</ComponentPreview>

### Predefined Filter Tabs

Use the left-side tablist for saved views without replacing the grid's `rows`. Assign a `filter(row)` predicate to each predefined view, then keep `active-view` in sync with `view-change`. Client-side predicates run before search, field filters, sorting, and pagination; source-backed grids continue to delegate filtering to their source.

::: tip Controlled pattern
`views` and `active-view` are intentionally controlled — the grid never mutates `active-view` on its own. This keeps your application as the single source of truth for view state.
:::

<ComponentPreview>

```html
<ore-datagrid id="dg-tabs" label="Issues" fullwidth></ore-datagrid>
<script>
  const VIEWS = [
    { id: 'all', label: 'All' },
    { id: 'open', label: 'Open', filter: (row) => row.status === 'Open' },
    { id: 'closed', label: 'Closed', filter: (row) => row.status === 'Closed' },
  ];
  const ALL_ROWS = [
    { id: '1', title: 'Fix login bug', status: 'Open', assignee: 'Alice' },
    { id: '2', title: 'Dark mode', status: 'In Progress', assignee: 'Bob' },
    { id: '3', title: 'API docs', status: 'Closed', assignee: 'Carol' },
    { id: '4', title: 'Performance', status: 'Open', assignee: 'Alice' },
  ];
  const grid = document.getElementById('dg-tabs');
  grid.columns = [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'status', label: 'Status' },
    { key: 'assignee', label: 'Assignee' },
  ];
  grid.views = VIEWS;
  grid.activeView = 'all';
  grid.rows = ALL_ROWS;

  grid.addEventListener('view-change', (e) => {
    grid.activeView = e.detail.id;
  });
</script>
```

</ComponentPreview>

## Page Size Selector

Set `pageSizeOptions` to show a compact `ore-select` in the footer that lets the user choose how many rows to display per page.

<ComponentPreview>

```html
<ore-datagrid id="dg-page-opts" label="Users" page-size="5"></ore-datagrid>
<script>
  const grid = document.getElementById('dg-page-opts');
  grid.pageSizeOptions = [5, 10, 25, 50, 100];
  grid.columns = [
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Role' },
  ];
  grid.rows = Array.from({ length: 20 }, (_, i) => ({
    id: String(i + 1),
    name: `User ${i + 1}`,
    role: i % 3 === 0 ? 'Admin' : i % 3 === 1 ? 'Editor' : 'Viewer',
  }));
</script>
```

</ComponentPreview>

## Server-Side Sorting

Set `sort-mode="server"` to disable client-side sorting. The grid emits `sort-change` so your data fetching layer can respond, then update `rows` with the pre-sorted page.

<ComponentPreview>

```html
<ore-datagrid id="dg-server" label="Server-sorted users" sort-mode="server"></ore-datagrid>
<script>
  const ROWS = [
    { id: '1', name: 'Alice', role: 'Admin' },
    { id: '2', name: 'Bob', role: 'Editor' },
    { id: '3', name: 'Carol', role: 'Viewer' },
  ];
  const grid = document.getElementById('dg-server');
  grid.columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'role', label: 'Role' },
  ];
  grid.rows = ROWS.slice();
  grid.addEventListener('sort-change', (e) => {
    const { key, direction } = e.detail;
    if (direction === 'none') {
      grid.rows = ROWS.slice();
      return;
    }
    grid.rows = ROWS.slice().sort((a, b) =>
      direction === 'asc' ? String(a[key]).localeCompare(String(b[key])) : String(b[key]).localeCompare(String(a[key])),
    );
  });
</script>
```

</ComponentPreview>

## Controlled Selection

Set `selectedKeys` to programmatically control which rows are selected. Any change to this property updates the internal selection immediately.

<ComponentPreview>

```html
<div style="display:flex;gap:0.5rem;margin-bottom:0.75rem;">
  <ore-button id="sel-btn-1" size="sm">Select row 1</ore-button>
  <ore-button id="sel-btn-all" size="sm">Select all</ore-button>
  <ore-button id="sel-btn-clear" size="sm" color="error">Clear</ore-button>
</div>
<ore-datagrid id="dg-controlled" label="Controlled selection" selection-mode="multi"></ore-datagrid>
<script>
  const grid = document.getElementById('dg-controlled');
  grid.columns = [
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Role' },
  ];
  grid.rows = [
    { id: '1', name: 'Alice', role: 'Admin' },
    { id: '2', name: 'Bob', role: 'Editor' },
    { id: '3', name: 'Carol', role: 'Viewer' },
  ];
  document.getElementById('sel-btn-1').addEventListener('click', () => {
    grid.selectedKeys = ['1'];
  });
  document.getElementById('sel-btn-all').addEventListener('click', () => {
    grid.selectedKeys = ['1', '2', '3'];
  });
  document.getElementById('sel-btn-clear').addEventListener('click', () => {
    grid.selectedKeys = [];
  });
</script>
```

</ComponentPreview>

## Reactive Source Integration

`ore-datagrid` integrates directly with [`@vielzeug/sourcerer`](/sourcerer/) via the `source` JS property. When a source is provided:

- `rows` is ignored — `source.snapshot.data` drives displayed items.
- The pagination footer reads `source.snapshot.pagination`.
- Prev/next buttons call `source.page.previous()` / `source.page.next()`.
- The inline search input calls `source.setQuery({ search })`.
- `source.snapshot.isFetching` is reflected in the grid's `aria-busy` state.
- Client-side sort and filter are bypassed — wire `sort-change` to `source.setQuery()` for server-side sorting.

### Local Source (in-memory)

Use `createLocalSource` when data is already in memory. The source exposes synchronous snapshots and explicit matching.

```js
import { createLocalSource } from '@vielzeug/sourcerer';

const source = createLocalSource(myRows, {
  initialQuery: { pageSize: 10 },
  match: (row, search) => row.name.toLowerCase().includes(search.toLowerCase()),
});
const grid = document.querySelector('ore-datagrid');
grid.columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'role', label: 'Role' },
];
grid.source = source;

// Local sort wiring:
grid.addEventListener('sort-change', ({ detail: { key, direction } }) => {
  // Keep local sorting in application-owned data preparation.
  grid.rows = direction === 'none'
    ? rows
    : rows.toSorted((left, right) =>
        direction === 'asc' ? String(left[key]).localeCompare(String(right[key])) : String(right[key]).localeCompare(String(left[key])),
      );
});

// Clean up when done:
// source.dispose();
```

### Page Source (API-backed)

Use `createPageSource` for server-driven pagination and search. The grid consumes atomic snapshots and calls `source.page.next()` / `source.page.previous()`.

```js
import { createPageSource } from '@vielzeug/sourcerer';

const source = createPageSource({
  initialQuery: { pageSize: 20 },
  load: async ({ query, signal }) => {
    const url = new URL('/api/users', location.origin);
    url.searchParams.set('page', String(query.page));
    url.searchParams.set('pageSize', String(query.pageSize));
    url.searchParams.set('search', query.search);
    const { data, total } = await fetch(url, { signal }).then(r => r.json());
    return { data, total };
  },
});

const grid = document.querySelector('ore-datagrid');
grid.columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
];
grid.source = source;
```

::: tip DataGridSource interface
Any object that satisfies the `DataGridSource` structural interface works as a source — not just sourcerer instances. The required shape is:

```ts
type DataGridSource<T> = {
  readonly current: readonly T[];
  readonly meta: { isLoading: boolean; pageCount: number; pageNumber: number; pageSize: number; totalItems: number; error: ... | null };
  subscribe(listener: () => void): () => void;
  search?(query: string): Promise<void>;
  next?(): Promise<void>;
  prev?(): Promise<void>;
  goTo?(page: number): Promise<void>;
};
```
:::

## Localization

Set the `labels` JavaScript property to localize built-in controls, filter operators, density choices, selection labels, and pagination. It accepts a partial `DataGridLabels` object; omitted entries retain their English defaults. Range and row labels are formatter functions so applications can apply locale-specific grammar.

```js
const grid = document.querySelector('ore-datagrid');
grid.labels = {
  addFilter: 'Filter hinzufügen…',
  closeSearch: 'Suche schließen',
  columnOptions: 'Spaltenoptionen',
  filter: 'Filter',
  range: (start, end, total) => `${start} bis ${end} von ${total}`,
  rows: (count) => `${count} Zeilen`,
  search: 'Suche',
  sort: 'Sortieren',
};
```

Provided `filterOptions` define available choices without activating those filters. They may describe metadata that is not a visible column, which supports filtering a company grid by industry without adding an Industry column.

## API Reference

**`ore-datagrid`**

### Attributes / Properties

| Name                 | Type                                   | Default                   | Description                                                                                                                              |
| -------------------- | -------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `columns`            | `DataGridColumn[]`                     | —                         | Column definitions with optional `cell` text formatting and safe `renderCell` `HTMLResult` output. Takes precedence over `<ore-column>` children |
| `rows`               | `object[]`                             | `[]`                      | Row data (JS property only)                                                                                                              |
| `getRowKey`          | `(row) => string`                      | `(row) => String(row.id)` | Returns a unique key per row. Required when rows lack an `id` field (JS property only)                                                   |
| `views`              | `DataGridView[]`                       | —                         | Controlled tabs with optional client-side `filter(row)` predicates, rendered in the left controls region (JS property)                    |
| `active-view`        | `string`                               | —                         | ID of the currently active view. Must match an `id` in `views`. Consumer keeps this in sync via `view-change`                             |
| `label`              | `string`                               | —                         | Accessible label for the grid (`aria-label`)                                                                                             |
| `labels`             | `Partial<DataGridLabels>`              | English defaults          | Localized built-in control labels, filter operators, and range/row formatters (JS property)                                              |
| `selectedKeys`       | `string[]`                             | `[]`                      | Controlled selection — set externally to override the internal selection state (JS property)                                             |
| `selection-mode`     | `'none' \| 'single' \| 'multi'`        | `'none'`                  | Row selection behaviour                                                                                                                  |
| `sort-mode`          | `'client' \| 'server'`                 | `'client'`                | `'server'` disables client-side sorting; consumer handles it via `sort-change`                                                           |
| `page-size`          | `number`                               | `10`                      | Rows per page; `0` disables pagination. Reactive — can be changed after mount                                                            |
| `expandable`         | `boolean`                              | `false`                   | Enable row expansion. Requires at least one column to have `renderExpanded`                                                              |
| `empty-text`         | `string`                               | `'No data'`               | Text shown when `rows` is empty                                                                                                          |
| `density`            | `'compact' \| 'cozy' \| 'comfortable'` | `'cozy'`                  | Cell padding; `compact` = tight, `cozy` = default, `comfortable` = spacious                                                              |
| `striped`            | `boolean`                              | `false`                   | Alternating row backgrounds                                                                                                              |
| `fullwidth`          | `boolean`                              | `false`                   | Stretch the grid to fill its container's width                                                                                           |
| `search-placeholder` | `string`                               | `'Search…'`               | Placeholder text for the inline search input in the controls bar                                                                         |
| `filterOptions`      | `FilterOption[]`                       | —                         | Available choices for column or non-visible metadata filters. Definitions remain inactive until selected in the Filter popover (JS property) |
| `pageSizeOptions`    | `number[]`                             | —                         | When set, renders a page-size `ore-select` in the footer (JS property)                                                                    |
| `source`             | `DataGridSource`                       | —                         | A reactive sourcerer source. When set, drives rows, pagination, and search — the `rows` prop is ignored (JS property)                    |
| `loading`            | `boolean`                              | `false`                   | Show busy/loading state. Also set automatically from `source.snapshot.isFetching` when `source` is provided                                   |
| `disabled`           | `boolean`                              | `false`                   | Disable all interaction                                                                                                                  |

### DataGridView

| Property | Type | Description |
| --- | --- | --- |
| `id` | `string` | Stable view identifier matched by `active-view` |
| `label` | `string` | Tab label |
| `filter` | `(row) => boolean` | Optional client-side predicate composed before search, field filters, sorting, and pagination |

### DataGridColumn

| Property         | Type               | Description                                                                                      |
| ---------------- | ------------------ | ------------------------------------------------------------------------------------------------ |
| `key`            | `string`           | Row object property key to display                                                               |
| `label`          | `string`           | Column header display text                                                                       |
| `headerLabel`    | `string?`          | Alternative `aria-label` for the header cell                                                     |
| `sortable`       | `boolean?`         | Enable sorting on this column                                                                    |
| `sortType`       | `'text' \| 'number'` | Select semantic direction labels; raw numeric values are inferred when omitted                 |
| `resizable`      | `boolean?`         | Add a drag handle to resize this column                                                          |
| `cell`           | `(item) => string` | Formatted text used for display, search, cell titles, and fallback filter labels                   |
| `filterLabel`    | `(item) => string` | Optional formatted label for derived filter choices                                                |
| `filterValue`    | `(item) => string \| number` | Raw comparison value; return a number for range operators such as dates                |
| `renderCell`     | `(item) => HTMLResult` | Trusted structured cell content rendered through Ore templates                               |
| `renderExpanded` | `(item) => string` | Renders the expanded detail panel for a row as an HTML string. Requires `expandable` on the grid |
| `width`          | `string?`          | Column width (any CSS value, e.g. `'12rem'`)                                                     |

### FilterOption

Used with the `filterOptions` JS property to pre-define the choices available in the Filter by popover for a given column.

| Property  | Type                                 | Description                                              |
| --------- | ------------------------------------ | -------------------------------------------------------- |
| `key`     | `string`                             | Column key this filter option definition applies to      |
| `label`     | `string`                             | Display label shown as the rule header                   |
| `operators` | `{ label: string; value: FilterOperator }[]` | Operators available for this filter; the first is used by default |
| `options`   | `{ label?: string; value: string }[]`| Selectable values; `label` is optional (falls back to `value`) |

**`ore-column`**

When using the declarative `<ore-column>` API, the following attributes map directly to `DataGridColumn` fields:

| Attribute      | Type      | Description                       |
| -------------- | --------- | --------------------------------- |
| `key`          | `string`  | **Required.** Row property key    |
| `label`        | `string`  | **Required.** Header display text |
| `sortable`     | `boolean` | Enable sorting                    |
| `resizable`    | `boolean` | Enable resize handle              |
| `width`        | `string`  | CSS column width                  |
| `header-label` | `string`  | Accessible header label override  |

### Events

| Event              | Detail                                                   | Description                                                                 |
| ------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------- |
| `sort-change`      | `{ key: string, direction: 'asc' \| 'desc' \| 'none' }` | Fired when sort state changes                                               |
| `selection-change` | `{ keys: string[], rows: object[] }`                     | Fired when row selection changes                                            |
| `page-change`      | `{ pageIndex: number, pageSize: number }`                | Fired when the active page changes                                          |
| `row-expand`       | `{ key: string, expanded: boolean }`                     | Fired when a row is expanded or collapsed                                   |
| `view-change`      | `{ id: string, label: string }`                          | Fired when the user clicks a view tab; consumer must update `active-view`   |

### Slots

| Slot      | Description                                                                                                    |
| --------- | -------------------------------------------------------------------------------------------------------------- |
| `actions` | Content rendered at the right end of the controls bar, after the built-in icon buttons. A divider is automatically shown when this slot has content and hidden when it is empty. Typical use: an "Add row" button, an export trigger, or any toolbar action. |

### CSS Custom Properties

| Property                     | Default                     | Description                                       |
| ---------------------------- | --------------------------- | ------------------------------------------------- |
| `--datagrid-bg`              | `var(--color-canvas)`       | Grid background                                   |
| `--datagrid-border-color`    | `var(--color-contrast-200)` | Border color for grid and cells                   |
| `--datagrid-radius`          | `var(--rounded-xl)`         | Grid border radius                                |
| `--datagrid-shadow`          | `var(--shadow-sm)`          | Grid box shadow                                   |
| `--datagrid-header-bg`       | `var(--color-contrast-50)`  | Column header background                          |
| `--datagrid-row-hover-bg`    | neutral `6%`                | Row hover background                              |
| `--datagrid-row-selected-bg` | neutral `10%`               | Selected row background                           |
| `--datagrid-stripe-bg`       | contrast `3%`               | Even-row stripe background                        |
| `--datagrid-cell-padding-x`  | `var(--size-3)`             | Cell horizontal padding                           |
| `--datagrid-cell-padding-y`  | `var(--size-2-5)`           | Cell vertical padding                             |
| `--datagrid-cell-max-width`  | `32ch`                      | Max cell width before text truncates              |
| `--datagrid-max-height`      | `none`                      | Max height of scroll area (enables sticky header) |
| `--datagrid-font-size`       | `var(--text-sm)`            | Base font size                                    |

### CSS Parts

| Part       | Element   | Description                                    |
| ---------- | --------- | ---------------------------------------------- |
| `controls` | `<div>`   | The controls bar (search, tabs, action buttons) |
| `table`    | `<table>` | The table element                              |
| `thead`    | `<thead>` | The header row group                           |
| `tbody`    | `<tbody>` | The body row group                             |
| `row`      | `<tr>`    | A body row                                     |
| `cell`     | `<td>`    | A body cell                                    |
| `footer`   | `<div>`   | The pagination footer bar                      |

## Accessibility

The datagrid implements the [ARIA Grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/). The `<table>` element carries `role="grid"`, every `<th>` has `role="columnheader"` and `scope="col"`, and every `<td>` has `role="gridcell"`. Always provide a meaningful `label` attribute so screen readers can announce the grid's purpose.

Sortable columns render a native `<button>` inside the `<th>` — natively focusable, announced correctly by all screen readers, and keyboard-operable via Enter/Space. The `aria-sort="ascending|descending|none"` attribute is updated on each sort cycle.

When `selection-mode` is `"single"` or `"multi"`, body rows carry `aria-selected="true|false"`. When `expandable` is set, body rows carry `aria-expanded="true|false"` and the expand toggle button is placed at the trailing edge of each row. `aria-disabled="true"` is set on the table when `disabled` and `aria-busy="true"` when `loading`. Pagination controls use `aria-live="polite"` with `aria-atomic="true"` on the info text, and the prev/next buttons carry `aria-label="Previous page"` / `aria-label="Next page"`. The select-all checkbox is labelled `aria-label="Select all rows on this page"`.

Focus management follows the roving tabindex pattern — Arrow keys move focus between header and body cells; Home/End jump to row edges.
