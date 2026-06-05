# Data Grid

An accessible, keyboard-navigable data grid with built-in column sorting, row-level pagination, single/multi row selection, search & filters, column resizing, and row expansion. All state is reactive — pass any array of objects and a column definition, no wrapper needed.

## Features

- 📊 **Declarative column API** — define `key`, `label`, `sortable`, `resizable`, `width`, and optional `cell` / `renderExpanded` renderers per column
- 📝 **Declarative HTML API** — use `<bit-column>` child elements instead of the `columns` JS property
- ↕️ **Column sorting** — click/Enter cycles `none → asc → desc`; emits `sort-change`; `sort-mode="server"` passes sorting responsibility to the consumer
- ↔️ **Column resizing** — set `resizable: true` on a column for a drag handle; widths persist across re-renders
- ✅ **Single & multi selection** — `selection-mode="single"` or `"multi"` with a dedicated checkbox column; emits `selection-change`; `selected-keys` prop for controlled/programmatic selection
- 📄 **Built-in pagination** — configurable `page-size` (reactive after mount); prev/next controls with `aria-live` info text; emits `page-change`
- 🔽 **Row expansion** — `expandable` + `renderExpanded` per column renders an inline detail panel; emits `row-expand`
- 🔍 **Search & filters** — `searchable` for full-text search; `filters` prop for multi-select column filters via `bit-combobox`; stale filters are pruned automatically when columns change
- 🦓 **Striped rows** — `striped` attribute for alternate-row backgrounds
- 🔄 **Loading state** — `loading` attribute reduces opacity and sets `aria-busy`
- 🚫 **Disabled state** — `disabled` blocks all interaction and sets `aria-disabled`
- 🏷️ **Empty state** — configurable `empty-text` when no rows are present
- ♿ **Fully accessible** — `role="grid"`, `role="columnheader"`, `role="gridcell"`, `aria-sort`, `aria-selected`, `aria-expanded`, `aria-live` pagination info; roving tabindex cell navigation
- ⌨️ **Keyboard navigation** — ARIA Grid pattern; Arrow keys move between cells; Enter/Space on sort buttons and selectable rows
- 🎨 **CSS custom properties** — full theming via `--datagrid-*` tokens

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/inputs/datagrid/datagrid.ts
:::

::: details View Column Source
<<< @/../packages/sigil/src/inputs/datagrid/datagrid-column.ts
:::

## Basic Usage

<ComponentPreview>

```html
<bit-datagrid id="dg-basic" label="Team Members"></bit-datagrid>
<script>
  const grid = document.getElementById('dg-basic');
  grid.columns = [
    { key: 'name',  label: 'Name',  sortable: true },
    { key: 'role',  label: 'Role' },
    { key: 'email', label: 'Email' },
  ];
  grid.rows = [
    { id: '1', name: 'Alice', role: 'Admin',  email: 'alice@example.com' },
    { id: '2', name: 'Bob',   role: 'Editor', email: 'bob@example.com'   },
    { id: '3', name: 'Carol', role: 'Viewer', email: 'carol@example.com' },
  ];
</script>
```

</ComponentPreview>

### Declarative Column API

Instead of the `columns` JS property, you can define columns declaratively as `<bit-column>` child elements. Attribute mutations (e.g. adding `sortable`, changing `label`) are observed and re-render the grid automatically.

::: tip Precedence
The `columns` JS property takes precedence over `<bit-column>` children when both are set. Pass `undefined` (or omit `columns`) to use the declarative API.
:::

<ComponentPreview>

```html
<bit-datagrid id="dg-declarative" label="Team Members">
  <bit-column key="name"  label="Name"  sortable></bit-column>
  <bit-column key="role"  label="Role"></bit-column>
  <bit-column key="email" label="Email" width="18rem"></bit-column>
</bit-datagrid>
<script>
  document.getElementById('dg-declarative').rows = [
    { id: '1', name: 'Alice', role: 'Admin',  email: 'alice@example.com' },
    { id: '2', name: 'Bob',   role: 'Editor', email: 'bob@example.com'   },
    { id: '3', name: 'Carol', role: 'Viewer', email: 'carol@example.com' },
  ];
</script>
```

</ComponentPreview>

## Sorting

Set `sortable: true` on any column. Clicking or pressing Enter/Space on the header cycles `none → ascending → descending → none`.

<ComponentPreview>

```html
<bit-datagrid id="dg-sort" label="Users"></bit-datagrid>
<script>
  const grid = document.getElementById('dg-sort');
  grid.columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'age',  label: 'Age',  sortable: true },
    { key: 'role', label: 'Role' },
  ];
  grid.rows = [
    { id: '1', name: 'Alice', age: 32, role: 'Admin'  },
    { id: '2', name: 'Bob',   age: 25, role: 'Editor' },
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
<bit-datagrid id="dg-single" label="Users" selection-mode="single"></bit-datagrid>
<script>
  const grid = document.getElementById('dg-single');
  grid.columns = [
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Role' },
  ];
  grid.rows = [
    { id: '1', name: 'Alice', role: 'Admin'  },
    { id: '2', name: 'Bob',   role: 'Editor' },
    { id: '3', name: 'Carol', role: 'Viewer' },
  ];
</script>
```

</ComponentPreview>

### Multi Selection

A checkbox column is prepended automatically. The header checkbox selects/deselects all visible rows.

<ComponentPreview>

```html
<bit-datagrid id="dg-multi" label="Users" selection-mode="multi"></bit-datagrid>
<script>
  const grid = document.getElementById('dg-multi');
  grid.columns = [
    { key: 'name',  label: 'Name' },
    { key: 'role',  label: 'Role' },
    { key: 'email', label: 'Email' },
  ];
  grid.rows = [
    { id: '1', name: 'Alice', role: 'Admin',  email: 'alice@example.com' },
    { id: '2', name: 'Bob',   role: 'Editor', email: 'bob@example.com'   },
    { id: '3', name: 'Carol', role: 'Viewer', email: 'carol@example.com' },
  ];
</script>
```

</ComponentPreview>

## Pagination

Set `page-size` to control how many rows appear per page. Set it to `0` to disable pagination and show all rows.

<ComponentPreview>

```html
<bit-datagrid id="dg-page" label="Users" page-size="3"></bit-datagrid>
<script>
  const grid = document.getElementById('dg-page');
  grid.columns = [
    { key: 'name',  label: 'Name' },
    { key: 'email', label: 'Email' },
  ];
  grid.rows = Array.from({ length: 12 }, (_, i) => ({
    id:    String(i + 1),
    name:  `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
  }));
</script>
```

</ComponentPreview>

## Custom Cell Renderer

Supply a `cell` function on a column to format the displayed value without modifying the underlying data.

<ComponentPreview>

```html
<bit-datagrid id="dg-cell" label="Orders"></bit-datagrid>
<script>
  const grid = document.getElementById('dg-cell');
  grid.columns = [
    { key: 'id',    label: 'Order #' },
    { key: 'total', label: 'Total', cell: (row) => `$${row.total.toFixed(2)}` },
    { key: 'date',  label: 'Date',  cell: (row) => new Date(row.date).toLocaleDateString() },
  ];
  grid.rows = [
    { id: 'ORD-001', total: 149.99, date: '2025-06-01' },
    { id: 'ORD-002', total:  49.00, date: '2025-06-05' },
    { id: 'ORD-003', total: 299.50, date: '2025-06-08' },
  ];
</script>
```

</ComponentPreview>

## Visual Options

### Striped Rows

<ComponentPreview>

```html
<bit-datagrid id="dg-striped" label="Users" striped></bit-datagrid>
<script>
  const grid = document.getElementById('dg-striped');
  grid.columns = [
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Role' },
  ];
  grid.rows = [
    { id: '1', name: 'Alice', role: 'Admin'  },
    { id: '2', name: 'Bob',   role: 'Editor' },
    { id: '3', name: 'Carol', role: 'Viewer' },
    { id: '4', name: 'Dan',   role: 'Viewer' },
  ];
</script>
```

</ComponentPreview>

### Full Width

Add `fullwidth` to stretch the grid to fill its container.

<ComponentPreview>

```html
<bit-datagrid id="dg-fw" label="Users" fullwidth></bit-datagrid>
<script>
  const grid = document.getElementById('dg-fw');
  grid.columns = [
    { key: 'name',  label: 'Name' },
    { key: 'role',  label: 'Role' },
    { key: 'email', label: 'Email' },
  ];
  grid.rows = [
    { id: '1', name: 'Alice', role: 'Admin',  email: 'alice@example.com' },
    { id: '2', name: 'Bob',   role: 'Editor', email: 'bob@example.com'   },
    { id: '3', name: 'Carol', role: 'Viewer', email: 'carol@example.com' },
  ];
</script>
```

</ComponentPreview>

### Sizes

<ComponentPreview>

```html
<div style="display:flex;flex-direction:column;gap:1rem;">
  <bit-datagrid id="dg-sm" label="Compact (sm)" size="sm"></bit-datagrid>
  <bit-datagrid id="dg-md" label="Default (md)" size="md"></bit-datagrid>
  <bit-datagrid id="dg-lg" label="Spacious (lg)" size="lg"></bit-datagrid>
</div>
<script>
  const cols = [{ key: 'name', label: 'Name' }, { key: 'role', label: 'Role' }];
  const rows = [
    { id: '1', name: 'Alice', role: 'Admin'  },
    { id: '2', name: 'Bob',   role: 'Editor' },
  ];
  for (const id of ['dg-sm', 'dg-md', 'dg-lg']) {
    const g = document.getElementById(id);
    g.columns = cols;
    g.rows = rows;
  }
</script>
```

</ComponentPreview>

### Loading State

<ComponentPreview>

```html
<bit-datagrid id="dg-loading" label="Users" loading></bit-datagrid>
<script>
  const grid = document.getElementById('dg-loading');
  grid.columns = [
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Role' },
  ];
  grid.rows = [
    { id: '1', name: 'Alice', role: 'Admin'  },
    { id: '2', name: 'Bob',   role: 'Editor' },
  ];
</script>
```

</ComponentPreview>

### Empty State

<ComponentPreview>

```html
<bit-datagrid
  id="dg-empty"
  label="Users"
  empty-text="No users found. Try adjusting your filters.">
</bit-datagrid>
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
<bit-datagrid
  id="dg-scroll"
  label="Users"
  style="--datagrid-max-height:200px">
</bit-datagrid>
<script>
  const grid = document.getElementById('dg-scroll');
  grid.columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'role', label: 'Role' },
  ];
  grid.rows = Array.from({ length: 20 }, (_, i) => ({
    id:   String(i + 1),
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
<bit-datagrid id="dg-resize" label="Users" fullwidth></bit-datagrid>
<script>
  const grid = document.getElementById('dg-resize');
  grid.columns = [
    { key: 'name',  label: 'Name',  sortable: true, resizable: true, width: '12rem' },
    { key: 'role',  label: 'Role',  resizable: true },
    { key: 'email', label: 'Email' },
  ];
  grid.rows = [
    { id: '1', name: 'Alice', role: 'Admin',  email: 'alice@example.com' },
    { id: '2', name: 'Bob',   role: 'Editor', email: 'bob@example.com'   },
    { id: '3', name: 'Carol', role: 'Viewer', email: 'carol@example.com' },
  ];
</script>
```

</ComponentPreview>

## Row Expansion

Add `expandable` to the grid and supply a `renderExpanded` function on one or more columns. Each row gets a toggle button (▶) that shows an inline detail panel spanning all columns.

- Multiple rows can be expanded simultaneously.
- The `row-expand` event fires with `{ key, expanded }` on each toggle.
- `aria-expanded` is set on the row element.

<ComponentPreview>

```html
<bit-datagrid id="dg-expand" label="Team Members" expandable></bit-datagrid>
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
    { key: 'role',  label: 'Role' },
    { key: 'email', label: 'Email' },
  ];
  grid.rows = [
    { id: '1', name: 'Alice', role: 'Admin',  email: 'alice@example.com' },
    { id: '2', name: 'Bob',   role: 'Editor', email: 'bob@example.com'   },
    { id: '3', name: 'Carol', role: 'Viewer', email: 'carol@example.com' },
  ];
  grid.addEventListener('row-expand', (e) => {
    console.log('row-expand', e.detail); // { key: '1', expanded: true }
  });
</script>
```

</ComponentPreview>

## Search & Filters

Add `searchable` to render a search input above the table. It filters rows across all column values client-side and resets pagination to page 1 on each keystroke. Customise the placeholder with `search-placeholder`.

Set `filters` (JS property) to an array of column filter definitions. Each entry renders a multi-select `bit-combobox` in the toolbar. The toolbar renders whenever `searchable` is set **or** `filters` is non-empty — the two are independent. Filter state is automatically pruned when a column is removed.

<ComponentPreview>

```html
<bit-datagrid id="dg-search" label="Users" searchable search-placeholder="Search users…" fullwidth></bit-datagrid>
<script>
  const grid = document.getElementById('dg-search');
  grid.columns = [
    { key: 'name',       label: 'Name' },
    { key: 'role',       label: 'Role' },
    { key: 'department', label: 'Department' },
    { key: 'email',      label: 'Email' },
  ];
  grid.rows = [
    { id: '1', name: 'Alice', role: 'Admin',  department: 'Engineering', email: 'alice@example.com' },
    { id: '2', name: 'Bob',   role: 'Editor', department: 'Marketing',   email: 'bob@example.com'   },
    { id: '3', name: 'Carol', role: 'Viewer', department: 'Engineering', email: 'carol@example.com' },
    { id: '4', name: 'Dan',   role: 'Viewer', department: 'Design',      email: 'dan@example.com'   },
    { id: '5', name: 'Eve',   role: 'Editor', department: 'Marketing',   email: 'eve@example.com'   },
    { id: '6', name: 'Frank', role: 'Admin',  department: 'Design',      email: 'frank@example.com' },
  ];
  grid.filters = [
    {
      key: 'role',
      label: 'Role',
      options: [
        { value: 'Admin' },
        { value: 'Editor' },
        { value: 'Viewer' },
      ],
    },
    {
      key: 'department',
      label: 'Department',
      options: [
        { value: 'Engineering' },
        { value: 'Marketing' },
        { value: 'Design' },
      ],
    },
  ];
</script>
```

</ComponentPreview>

## Page Size Selector

Set `page-size-options` to show a compact `bit-select` in the footer that lets the user choose how many rows to display per page.

<ComponentPreview>

```html
<bit-datagrid id="dg-page-opts" label="Users" page-size="5"></bit-datagrid>
<script>
  const grid = document.getElementById('dg-page-opts');
  grid['page-size-options'] = [5, 10, 25, 50, 100];
  grid.columns = [
    { key: 'name',  label: 'Name' },
    { key: 'role',  label: 'Role' },
  ];
  grid.rows = Array.from({ length: 20 }, (_, i) => ({
    id:   String(i + 1),
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
<bit-datagrid id="dg-server" label="Server-sorted users" sort-mode="server"></bit-datagrid>
<script>
  const ROWS = [
    { id: '1', name: 'Alice', role: 'Admin'  },
    { id: '2', name: 'Bob',   role: 'Editor' },
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
    if (direction === 'none') { grid.rows = ROWS.slice(); return; }
    grid.rows = ROWS.slice().sort((a, b) =>
      direction === 'asc'
        ? String(a[key]).localeCompare(String(b[key]))
        : String(b[key]).localeCompare(String(a[key]))
    );
  });
</script>
```

</ComponentPreview>

## Controlled Selection

Set `selected-keys` to programmatically control which rows are selected. Any change to this property updates the internal selection immediately.

<ComponentPreview>

```html
<div style="display:flex;gap:0.5rem;margin-bottom:0.75rem;">
  <bit-button id="sel-btn-1" size="sm">Select row 1</bit-button>
  <bit-button id="sel-btn-all" size="sm">Select all</bit-button>
  <bit-button id="sel-btn-clear" size="sm" color="error">Clear</bit-button>
</div>
<bit-datagrid id="dg-controlled" label="Controlled selection" selection-mode="multi"></bit-datagrid>
<script>
  const grid = document.getElementById('dg-controlled');
  grid.columns = [
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Role' },
  ];
  grid.rows = [
    { id: '1', name: 'Alice', role: 'Admin'  },
    { id: '2', name: 'Bob',   role: 'Editor' },
    { id: '3', name: 'Carol', role: 'Viewer' },
  ];
  document.getElementById('sel-btn-1').addEventListener('click', () => {
    grid['selected-keys'] = ['1'];
  });
  document.getElementById('sel-btn-all').addEventListener('click', () => {
    grid['selected-keys'] = ['1', '2', '3'];
  });
  document.getElementById('sel-btn-clear').addEventListener('click', () => {
    grid['selected-keys'] = [];
  });
</script>
```

</ComponentPreview>

## Accessibility

The datagrid implements the [ARIA Grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/):

- **`role="grid"`** on the `<table>` element
- **`role="columnheader"`** + **`scope="col"`** on every `<th>`
- **`aria-sort="ascending|descending|none"`** on sortable `<th>` elements — updated on each sort cycle
- Sortable columns render a native **`<button>`** inside the `<th>` — natively focusable, announced correctly by all screen readers, and keyboard-operable via Enter/Space
- **`role="gridcell"`** on every `<td>`
- **`aria-selected="true|false"`** on body rows when `selection-mode` is `"single"` or `"multi"`
- **`aria-expanded="true|false"`** on body rows when `expandable` is set; the expand toggle button is placed at the trailing edge of each row
- **`aria-disabled="true"`** on the table when `disabled`
- **`aria-busy="true"`** on the table when `loading`
- **`aria-live="polite"` `aria-atomic="true"`** on the pagination info text
- **`aria-label="Previous page|Next page"`** on pagination buttons
- **`aria-label="Select all rows on this page"`** on the select-all checkbox
- **Roving tabindex** — Arrow keys move focus between header and body cells; Home/End jump to row edges

Always provide a meaningful `label` attribute so screen readers can announce the grid's purpose.

## API Reference

### Attributes / Properties

| Name | Type | Default | Description |
|---|---|---|---|
| `columns` | `DataGridColumn[]` | — | Column definitions (JS property). Takes precedence over `<bit-column>` children; omit to use the declarative API |
| `rows` | `object[]` | `[]` | Row data (JS property only) |
| `getRowKey` | `(row) => string` | `(row) => String(row.id)` | Returns a unique key per row. Required when rows lack an `id` field (JS property only) |
| `label` | `string` | — | Accessible label for the grid (`aria-label`) |
| `selected-keys` | `string[]` | `[]` | Controlled selection — set externally to override the internal selection state (JS property) |
| `selection-mode` | `'none' \| 'single' \| 'multi'` | `'none'` | Row selection behaviour |
| `sort-mode` | `'client' \| 'server'` | `'client'` | `'server'` disables client-side sorting; consumer handles it via `sort-change` |
| `page-size` | `number` | `10` | Rows per page; `0` disables pagination. Reactive — can be changed after mount |
| `expandable` | `boolean` | `false` | Enable row expansion. Requires at least one column to have `renderExpanded` |
| `empty-text` | `string` | `'No data'` | Text shown when `rows` is empty |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Component size |
| `striped` | `boolean` | `false` | Alternating row backgrounds |
| `fullwidth` | `boolean` | `false` | Stretch the grid to fill its container's width |
| `searchable` | `boolean` | `false` | Show a search input above the table (client-side filter across all columns) |
| `search-placeholder` | `string` | `'Search…'` | Placeholder text for the search input |
| `filters` | `{ key, label, options }[]` | — | Column filter definitions; renders a `bit-combobox` per entry in the toolbar (JS property). Toolbar renders independently of `searchable` |
| `page-size-options` | `number[]` | — | When set, renders a page-size `bit-select` in the footer (JS property) |
| `loading` | `boolean` | `false` | Show busy/loading state |
| `disabled` | `boolean` | `false` | Disable all interaction |

### DataGridColumn

| Property | Type | Description |
|---|---|---|
| `key` | `string` | Row object property key to display |
| `label` | `string` | Column header display text |
| `headerLabel` | `string?` | Alternative `aria-label` for the header cell |
| `sortable` | `boolean?` | Enable sorting on this column |
| `resizable` | `boolean?` | Add a drag handle to resize this column |
| `cell` | `(item) => string` | Custom cell renderer — return a formatted string |
| `renderExpanded` | `(item) => string` | Renders the expanded detail panel for a row as an HTML string. Requires `expandable` on the grid |
| `width` | `string?` | Column width (any CSS value, e.g. `'12rem'`) |

### bit-column Attributes

When using the declarative `<bit-column>` API, the following attributes map directly to `DataGridColumn` fields:

| Attribute | Type | Description |
|---|---|---|
| `key` | `string` | **Required.** Row property key |
| `label` | `string` | **Required.** Header display text |
| `sortable` | `boolean` | Enable sorting |
| `resizable` | `boolean` | Enable resize handle |
| `width` | `string` | CSS column width |
| `header-label` | `string` | Accessible header label override |

### Events

| Event | Detail | Description |
|---|---|---|
| `sort-change` | `{ key: string, direction: 'asc' \| 'desc' \| 'none' }` | Fired when sort state changes |
| `selection-change` | `{ keys: string[], rows: object[] }` | Fired when row selection changes |
| `page-change` | `{ pageIndex: number, pageSize: number }` | Fired when the active page changes |
| `row-expand` | `{ key: string, expanded: boolean }` | Fired when a row is expanded or collapsed |

### CSS Custom Properties

| Property | Default | Description |
|---|---|---|
| `--datagrid-bg` | `var(--color-canvas)` | Grid background |
| `--datagrid-border-color` | `var(--color-contrast-200)` | Border color for grid and cells |
| `--datagrid-radius` | `var(--rounded-xl)` | Grid border radius |
| `--datagrid-shadow` | `var(--shadow-sm)` | Grid box shadow |
| `--datagrid-header-bg` | `var(--color-contrast-50)` | Column header background |
| `--datagrid-row-hover-bg` | neutral `6%` | Row hover background |
| `--datagrid-row-selected-bg` | neutral `10%` | Selected row background |
| `--datagrid-stripe-bg` | contrast `3%` | Even-row stripe background |
| `--datagrid-cell-padding-x` | `var(--size-3)` | Cell horizontal padding |
| `--datagrid-cell-padding-y` | `var(--size-2-5)` | Cell vertical padding |
| `--datagrid-cell-max-width` | `32ch` | Max cell width before text truncates |
| `--datagrid-max-height` | `none` | Max height of scroll area (enables sticky header) |
| `--datagrid-font-size` | `var(--text-sm)` | Base font size |

### CSS Parts

| Part | Element | Description |
|---|---|---|
| `table` | `<table>` | The table element |
| `thead` | `<thead>` | The header row group |
| `tbody` | `<tbody>` | The body row group |
| `row` | `<tr>` | A body row |
| `cell` | `<td>` | A body cell |
| `footer` | `<div>` | The pagination footer bar |
