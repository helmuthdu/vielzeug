# Data Grid

An accessible, keyboard-navigable data grid with built-in column sorting, row-level pagination, and single/multi row selection. All state is reactive — pass any array of objects and a column definition, no wrapper needed.

## Features

- 📊 **Declarative column API** — define `key`, `label`, `sortable`, `width`, and optional `cell` renderer per column
- ↕️ **Column sorting** — click/Enter cycles `none → asc → desc`; emits `sort-change`
- ✅ **Single & multi selection** — `selection-mode="single"` or `"multi"` with a dedicated checkbox column; emits `selection-change`
- 📄 **Built-in pagination** — configurable `page-size`; prev/next controls with `aria-live` info text; emits `page-change`
- 🦓 **Striped rows** — `striped` attribute for alternate-row backgrounds
- 🔄 **Loading state** — `loading` attribute reduces opacity and sets `aria-busy`
- 🚫 **Disabled state** — `disabled` blocks all interaction and sets `aria-disabled`
- 🏷️ **Empty state** — configurable `empty-text` when no rows are present
- ♿ **Fully accessible** — `role="grid"`, `role="columnheader"`, `role="gridcell"`, `aria-sort`, `aria-selected`, `aria-live` pagination info
- ⌨️ **Keyboard navigation** — Enter/Space on sortable headers and selectable rows; Tab traversal
- 🎨 **CSS custom properties** — full theming via `--datagrid-*` tokens

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/inputs/datagrid/datagrid.ts
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

### Color Themes

<ComponentPreview>

```html
<div style="display:flex;flex-direction:column;gap:1rem;">
  <bit-datagrid id="dg-primary" label="Primary" color="primary"></bit-datagrid>
  <bit-datagrid id="dg-success" label="Success" color="success"></bit-datagrid>
</div>
<script>
  const cols = [{ key: 'name', label: 'Name' }, { key: 'role', label: 'Role' }];
  const rows = [
    { id: '1', name: 'Alice', role: 'Admin'  },
    { id: '2', name: 'Bob',   role: 'Editor' },
  ];
  for (const id of ['dg-primary', 'dg-success']) {
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

## Accessibility

The datagrid implements the [ARIA Grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/):

- **`role="grid"`** on the `<table>` element
- **`role="columnheader"`** + **`scope="col"`** on every `<th>`
- **`aria-sort="ascending|descending|none"`** on sortable headers — updated on each sort cycle
- **`role="gridcell"`** on every `<td>`
- **`aria-selected="true|false"`** on body rows when `selection-mode` is `"single"` or `"multi"`
- **`aria-disabled="true"`** on the table when `disabled`
- **`aria-busy="true"`** on the table when `loading`
- **`aria-live="polite"` `aria-atomic="true"`** on the pagination info text
- **`aria-label="Previous page|Next page"`** on pagination buttons
- **`aria-label="Select all rows on this page"`** on the select-all checkbox
- Sortable headers and selectable rows are keyboard-operable via Enter / Space

Always provide a meaningful `label` attribute so screen readers can announce the grid's purpose.

## API Reference

### Attributes / Properties

| Name | Type | Default | Description |
|---|---|---|---|
| `columns` | `DataGridColumn[]` | `[]` | Column definitions (JS property only) |
| `rows` | `object[]` | `[]` | Row data (JS property only) |
| `getRowKey` | `(row) => string` | `(row) => row.id` | Returns a unique key per row (JS property only) |
| `label` | `string` | — | Accessible label for the grid (`aria-label`) |
| `selection-mode` | `'none' \| 'single' \| 'multi'` | `'none'` | Row selection behaviour |
| `page-size` | `number` | `10` | Rows per page; `0` disables pagination |
| `empty-text` | `string` | `'No data'` | Text shown when `rows` is empty |
| `color` | `ThemeColor` | — | Theme color for selection accents and sort icons |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Component size |
| `striped` | `boolean` | `false` | Alternating row backgrounds |
| `loading` | `boolean` | `false` | Show busy/loading state |
| `disabled` | `boolean` | `false` | Disable all interaction |

### DataGridColumn

| Property | Type | Description |
|---|---|---|
| `key` | `string` | Row object property key to display |
| `label` | `string` | Column header display text |
| `headerLabel` | `string?` | Alternative `aria-label` for the header cell |
| `sortable` | `boolean?` | Enable sorting on this column |
| `cell` | `(item) => string` | Custom cell renderer |
| `width` | `string?` | Column width (any CSS value, e.g. `'12rem'`) |

### Events

| Event | Detail | Description |
|---|---|---|
| `sort-change` | `{ key: string, direction: 'asc' \| 'desc' \| 'none' }` | Fired when sort state changes |
| `selection-change` | `{ keys: string[], rows: object[] }` | Fired when row selection changes |
| `page-change` | `{ pageIndex: number, pageSize: number }` | Fired when the active page changes |

### CSS Custom Properties

| Property | Default | Description |
|---|---|---|
| `--datagrid-bg` | `var(--color-canvas)` | Grid background |
| `--datagrid-border-color` | `var(--color-contrast-200)` | Border color for grid and cells |
| `--datagrid-radius` | `var(--rounded-xl)` | Grid border radius |
| `--datagrid-shadow` | `var(--shadow-sm)` | Grid box shadow |
| `--datagrid-header-bg` | `var(--color-contrast-50)` | Column header background |
| `--datagrid-row-hover-bg` | theme-tinted `6%` | Row hover background |
| `--datagrid-row-selected-bg` | theme-tinted `10%` | Selected row background |
| `--datagrid-row-selected-border` | theme focus color | Inline-start accent on selected rows |
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
