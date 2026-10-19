---
title: Migration
description: Migrate surface variants, DataGrid sources, and framework type declarations to Refine 3.0.
---

# Migration

## Query bar filter layout and state echoes

The query bar retains its unified field and inline applied-filter pills. Its standard secondary row opens a vocabulary-driven drawer and can show curated quick filters. Use `::part(applied)` for inline filter styling and `::part(toolbar)` for secondary controls.

Breaking: state echoes now use semantic equality instead of token-array identity. To change free text externally, assign a new state object. To echo the current query, copy its actual text and tokens; that preserves an unfinished typed token.

```js
// Before: a text-only write with the same tokens array was ignored.
bar.state = { text: 'updated', tokens: bar.state.tokens };

// After: this updates text and dismisses pending drawer edits.
bar.state = { text: 'updated', tokens: bar.state.tokens };

// Equivalent echoes preserve composition even with a copied tokens array.
bar.state = { text: bar.state.text, tokens: [...bar.state.tokens] };
```

`open-change` now identifies the surface. Update handlers that assumed every event referred to suggestions:

```js
// Before
bar.addEventListener('open-change', (event) => updateSuggestions(event.detail.open));

// After
bar.addEventListener('open-change', (event) => {
  if (event.detail.surface === 'suggestions') updateSuggestions(event.detail.open);
});
```

Suggestion rows now flow naturally, wrap long labels, and have a 44px minimum height. `--query-bar-option-height` controls minimum height rather than a fixed row height. The unused `--query-bar-icon-size` declaration was removed. Applied-pill removal returns focus to Filters instead of the text field. See the [query bar reference](./components/query-bar.md).

`input` and `change` now fire only when the committed query actually changes. Composing an unfinished token or selecting an already-applied value does not announce an unchanged query.

### Multiple values and token helpers

Vocabulary entries default to single selection. Set `selection: 'multiple'` to allow additive values for the same key. The state remains `{ text, tokens: [{ key, value }] }`, with distinct pairs. Applications should match values with OR within a key and AND across keys; no values means unrestricted. The drawer uses checkboxes for multiple-selection keys and retains radios for single-selection keys.

Breaking: helper calls now identify a token by both key and value. `tokenValue` is removed in favor of `tokenValues`, which always returns an array. `removeToken` removes an exact pair; use `clearTokens` to clear a whole group.

```js
// Before
commitToken(state, 'fruit', 'apple');
removeToken(state, 'fruit');
const fruit = tokenValue(state, 'fruit');

// After
commitToken(state, { key: 'fruit', value: 'apple' }); // Single selection
commitToken(state, { key: 'fruit', value: 'apple' }, 'multiple'); // Additive
removeToken(state, { key: 'fruit', value: 'apple' }); // Exact value
clearTokens(state, 'fruit'); // Entire group
const fruits = tokenValues(state, 'fruit');
```

The Filters badge now counts active keys, not individual values. Removing a pill or deselecting a quick filter preserves other values of that key. Add `clearFilter` (`'Clear {filter}'`) and `selected` (`'{count} selected'`) to localized labels when using multiple-selection groups.

### Drawer draft feedback

Backdrop clicks and swipe gestures now keep the querybar drawer open when it has pending edits. Cancel, Close, and Escape still discard edits. An unchanged drawer can be dismissed through any of those paths. Reset is disabled for an empty draft.

Add `pending`, `hiddenSelected`, `selectedValues`, and `showAll` to localized labels for pending-edit feedback and search-hidden selection summaries. See the [localization reference](./components/query-bar.md#localization-and-styling) for placeholders. Single-selection vocabulary entries can set `anyLabel` to describe their unrestricted choice, for example `anyLabel: 'Default order'`.

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
