---
title: Refine 3.0 Migration
description: Migrate surface variants, DataGrid sources, and framework type declarations to Refine 3.0.
---

# Refine 3.0 Migration

Refine 3.0 simplifies translucent surfaces, aligns DataGrid sources with Sourcerer's page-source contract, and publishes complete DOM, React, and Vue element declarations.

## Register library-neutral icon definitions

Breaking: `IconNode` arrays are removed. `registerIcons` accepts only `IconDefinition` objects with a viewBox, presentation attributes, and recursive SVG children.

```ts
// Before
registerIcons({ Brand: [['path', { d: 'M0 0h24v24H0z' }]] });

// After
import { registerIcons, type IconDefinition } from '@vielzeug/refine/icons';

const brand: IconDefinition = {
  viewBox: [0, 0, 24, 24],
  presentation: { fill: 'currentColor' },
  children: [{ tag: 'path', attrs: { d: 'M0 0h24v24H0z' } }],
};
registerIcons({ Brand: brand });
```

For selected Lucide data, replace `registerIcons({ Search })` with `registerIcons(lucideIcons({ Search }))`, importing `lucideIcons` from `@vielzeug/refine/icons/lucide`. Full-library registration is an explicit side-effect import of `@vielzeug/refine/icons/lucide/all`. Only grouped icon entry points are published; no aliases for the previous adapter paths are retained.

Lucide is now an optional peer instead of a mandatory dependency. Applications using Lucide data or the full-set registrar must declare it explicitly (`pnpm add lucide@^1.48.0`). No icon-library dependency is needed for core components, neutral definitions, or supplied structural data.

For Heroicons, Tabler, or Material Design Icons, convert local Iconify data through `@vielzeug/refine/icons/iconify`. Shared registration and types live at `@vielzeug/refine/icons`; the component remains `@vielzeug/refine/icon`. See the [icon reference](./components/icon.md) for imports, licenses, aliases, transforms, and validation.

For caller-named individual data, the grouped entries `icons/heroicons`, `icons/tabler`, and `icons/mdi` expose `heroiconsIcons`, `tablerIcons`, and `mdiIcons`. This is an additive convenience; existing generic Iconify conversion remains supported:

```ts
import { registerIcons } from '@vielzeug/refine/icons';
import { heroiconsIcons } from '@vielzeug/refine/icons/heroicons';
import Search from '@iconify-icons/heroicons/magnifying-glass';
import Home from '@iconify-icons/heroicons/home';

registerIcons(heroiconsIcons({ Search, Home }));
```

Keys stay application-owned (`search`, `home`) rather than gaining a provider namespace. Install the chosen Iconify data package; native framework components are not accepted. Collection JSON still uses `iconifyIcons(collection, names?)`. No compatibility aliases or automatic registration are added.

Presentation now comes from each definition rather than forced Lucide styling. `stroke-width` is an explicit override (otherwise native widths are retained); `solid` overrides nested fill/stroke attributes too. `absolute-stroke-width` uses SVG non-scaling strokes, including CSS sizes. Application registrations override component defaults in either import order. Names normalize case, hyphens, and underscores consistently; namespace colons are preserved. Invalid data throws `RefineError` rather than being partially rendered.

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
