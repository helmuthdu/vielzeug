---
title: Refine 3.0 Migration
description: Migrate surface variants, DataGrid sources, and framework type declarations to Refine 3.0.
---

# Refine 3.0 Migration

Refine 3.0 simplifies translucent surfaces, aligns DataGrid sources with Sourcerer's page-source contract, and publishes complete DOM, React, and Vue element declarations.

## Replace glass with frost

The `glass` variant was removed because its browser-dependent SVG refraction was difficult to distinguish reliably from `frost`. Use the CSS-only `frost` variant for translucent cards, containers, navigation, tabs, accordions, and pagination.

```html
<!-- Before -->
<ore-card variant="glass">Content</ore-card>

<!-- After -->
<ore-card variant="frost">Content</ore-card>
```

Remove overrides for `--glass-blur`, `--glass-saturation`, `--glass-refraction-opacity`, and `--glass-highlight`.

## Update DataGrid source state

Replace source snapshots with state, flatten navigation, and use string params for inline search.

```ts
import type { DataGridSource } from '@vielzeug/refine/datagrid';

type Row = { id: string };
const data: readonly Row[] = [];

// Before
const source = {
  snapshot: {
    data,
    error: null,
    isFetching: false,
    pagination: { count: 5, index: 1, size: 20, total: 100 },
    query: { search: '' },
  },
  setQuery(changes: { search?: string }) {},
  subscribe(listener: () => void) {
    return () => {};
  },
};

// After
const source: DataGridSource<Row> = {
  next() {},
  previous() {},
  setParams(search) {},
  state: {
    error: null,
    items: data,
    loading: false,
    pagination: { page: 1, pageCount: 5, pageSize: 20, totalItems: 100 },
  },
  subscribe(listener) {
    return () => {};
  },
};
```

`DataGridSource` now requires only fields consumed by `ore-datagrid`. Sourcerer `createPageSource()` values satisfy the contract directly.

## Use rows for in-memory data

Use the `rows` property for local collections. DataGrid owns local sorting, filtering, and pagination.

```ts
// Before
const source = createLocalSource(rows);
grid.source = source;

// After
grid.rows = rows;
```

Keep `source` for API-backed page data.

## Load framework declarations

Replace hand-written JSX or template declarations with Refine's generated type entry points.

```ts
// React
import type {} from '@vielzeug/refine/frameworks/react';

// Vue
import type {} from '@vielzeug/refine/frameworks/vue';

// DOM-only TypeScript
import type {} from '@vielzeug/refine/frameworks/elements';
```

The declarations include every supported Refine tag and derive component properties from the authoritative DOM element map. They do not register components at runtime.
