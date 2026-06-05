---
title: Codex — API Reference
description: Complete API reference for @vielzeug/codex — tools, resources, and programmatic API.
---

[[toc]]

## API At a Glance

| Symbol                  | Purpose                                       | Execution mode | Common gotcha                                                   |
| ----------------------- | --------------------------------------------- | -------------- | --------------------------------------------------------------- |
| `list-packages`         | All packages or one by slug                   | Sync           | Always returns an array — even with `packageSlug`               |
| `get-docs`              | Package documentation page                    | Sync           | `page` enum excludes `source` — use `get-source`                |
| `get-source`            | `src/index.ts` text                           | Sync           | `isError: true` when package has no bundled source              |
| `search-packages`       | Ranked search across metadata + docs          | Sync           | Returns `[]`, never an error, when nothing matches              |
| `list-components`       | Sigil component tag list                      | Sync           | `isError: true` if Sigil CEM not in snapshot                    |
| `get-component`         | Single Sigil CEM declaration                  | Sync           | `isError: true` lists available tags on miss                    |
| `createServer()`        | Programmatic server factory                   | Sync           | Requires pre-loaded `BundledData` — call `loadData()` first     |
| `loadData()`            | Load and validate bundled snapshot            | Sync           | Throws with an actionable message on missing or malformed data  |
| `packageMeta()`         | Strip heavy fields from a `BundledPackage`    | Sync           | Returns `PackageMeta` — no `docs`, `apiSource`, or `components` |
| `validateBundledData()` | Validate raw JSON against `BundledData` shape | Sync           | Use when loading data from a custom path                        |

## Package Entry Points

| Import                      | Purpose                                                                         |
| --------------------------- | ------------------------------------------------------------------------------- |
| `@vielzeug/codex`           | `createServer`, `loadData`, `packageMeta`, `validateBundledData`, and all types |
| `@vielzeug/codex/data`      | `loadData`, `packageMeta`, `validateBundledData` (subpath import)               |
| `@vielzeug/codex/generator` | `generateBundledData` (build-time use only)                                     |

The CLI binary (`vielzeug-mcp`) is the primary runtime interface; direct imports are for custom server wiring.

## Tools

### `list-packages`

Returns an array of `PackageMeta` objects. Pass `packageSlug` to filter to a single result.

**Input:**

| Field         | Type     | Required | Description                                               |
| ------------- | -------- | -------- | --------------------------------------------------------- |
| `packageSlug` | `string` | No       | Package folder name, e.g. `"ripple"`. Omit to return all. |

**Result shape:**

```json
[
  {
    "name": "@vielzeug/ripple",
    "slug": "ripple",
    "version": "3.0.1",
    "description": "Reactive signals, computed, effects, stores",
    "category": "state",
    "keywords": ["signals", "reactive"],
    "exports": ["signal", "computed", "effect"],
    "related": ["craft", "forge"],
    "availableDocPages": ["index", "api", "usage", "examples"],
    "hasSource": true
  }
]
```

**Error cases:** unknown `packageSlug` → `isError: true` with available slugs listed.

---

### `get-docs`

Returns the Markdown content of a documentation page.

**Input:**

| Field         | Type                                        | Required | Description                         |
| ------------- | ------------------------------------------- | -------- | ----------------------------------- |
| `packageSlug` | `string`                                    | Yes      | Package folder name, e.g. `"spell"` |
| `page`        | `'index' \| 'api' \| 'usage' \| 'examples'` | No       | Defaults to `'index'`               |

**Notes:**

- Returns raw Markdown text. Use `get-source` for `src/index.ts`.
- When a page is unavailable, the error message lists which pages the package has.

**Error cases:** unknown slug or unavailable page → `isError: true`.

---

### `get-source`

Returns the bundled `src/index.ts` source text.

**Input:**

| Field         | Type     | Required | Description                          |
| ------------- | -------- | -------- | ------------------------------------ |
| `packageSlug` | `string` | Yes      | Package folder name, e.g. `"ripple"` |

**Error cases:** unknown slug or no bundled source → `isError: true`.

---

### `search-packages`

Searches metadata, keywords, documentation, and source. Returns ranked `SearchHit` objects.

**Input:**

| Field   | Type     | Required | Description           |
| ------- | -------- | -------- | --------------------- |
| `query` | `string` | Yes      | Non-empty search term |

**Ranking:**

| Score | Category     | Field(s) searched                                             |
| ----- | ------------ | ------------------------------------------------------------- |
| 3     | `"metadata"` | `name`, `description`, `category`                             |
| 2     | `"keywords"` | `keywords` array                                              |
| 2     | `"exports"`  | `exports` array (exported symbol names)                       |
| 1     | `"docs"`     | All doc pages and `src/index.ts` (`matchedPages` lists which) |

Results are sorted by `score` descending, then `slug` ascending. Multiple categories can match simultaneously.

**Result shape:**

```json
[
  {
    "name": "@vielzeug/spell",
    "slug": "spell",
    "score": 3,
    "matchedIn": ["metadata", "keywords"]
  },
  {
    "name": "@vielzeug/forge",
    "slug": "forge",
    "score": 1,
    "matchedIn": ["docs"],
    "matchedPages": ["usage", "examples"]
  }
]
```

Returns `[]` when nothing matches — not an error.

---

### `list-components`

Returns Sigil component tag names from bundled CEM metadata.

**Input:** none

**Result shape:**

```json
[
  { "name": "Button", "tagName": "sg-button" },
  { "name": "Input", "tagName": "sg-input" }
]
```

**Error cases:** Sigil CEM not present in this snapshot → `isError: true`.

---

### `get-component`

Returns one full CEM declaration for a Sigil component.

**Input:**

| Field     | Type     | Required | Description                                 |
| --------- | -------- | -------- | ------------------------------------------- |
| `tagName` | `string` | Yes      | HTML custom element tag, e.g. `"sg-button"` |

**Result:** Full CEM declaration including attributes, members, events, slots, CSS parts, and CSS properties.

**Error cases:** unknown tag (lists available tags) or missing Sigil CEM → `isError: true`.

## Resources

Resources follow the MCP `resources/list` and `resources/read` protocol.

### URI format

| Pattern                         | MIME type           | Description                                                     |
| ------------------------------- | ------------------- | --------------------------------------------------------------- |
| `vielzeug://docs/<slug>/<page>` | `text/markdown`     | Documentation page — one of `index`, `api`, `usage`, `examples` |
| `vielzeug://source/<slug>`      | `text/x-typescript` | Bundled `src/index.ts`; present only for packages with source   |

**Error cases:** unknown URI → `McpError` with `InvalidParams` code.

## Programmatic API

### `createServer()`

```ts
createServer(data: BundledData): Server;
```

Creates and returns an MCP `Server` instance with all tools and resources registered.

**Parameters:**

| Parameter | Type          | Description                                                 |
| --------- | ------------- | ----------------------------------------------------------- |
| `data`    | `BundledData` | Validated bundled snapshot — call `loadData()` to obtain it |

**Returns:** `Server` from `@modelcontextprotocol/sdk`

**Example:**

```ts
import { createServer, loadData } from '@vielzeug/codex';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = createServer(loadData());
await server.connect(new StdioServerTransport());
```

---

### `loadData()`

```ts
loadData(): BundledData;
```

Reads and validates the bundled snapshot from disk. Throws synchronously with an actionable error message if the file is missing, malformed, or fails schema validation.

**Returns:** `BundledData`

**Throws:** `Error` — with a `pnpm run prepare:data` regen hint when the data file is absent or malformed.

---

### `packageMeta()`

```ts
packageMeta(pkg: BundledPackage): PackageMeta;
```

Strips `docs`, `apiSource`, and `components` from a `BundledPackage` and adds `hasSource`. Use this to produce lightweight metadata for tool responses.

**Parameters:**

| Parameter | Type             | Description                                     |
| --------- | ---------------- | ----------------------------------------------- |
| `pkg`     | `BundledPackage` | Full package record from `BundledData.packages` |

**Returns:** `PackageMeta`

---

### `validateBundledData()`

```ts
validateBundledData(raw: unknown): BundledData;
```

Validates that `raw` conforms to the top-level `BundledData` shape (checks `version: string`, `packages: array`, and `slug`/`name` per entry). Use when loading data from a custom path instead of `loadData()`.

**Parameters:**

| Parameter | Type      | Description             |
| --------- | --------- | ----------------------- |
| `raw`     | `unknown` | Parsed JSON to validate |

**Returns:** `BundledData` (cast after validation)

**Throws:** `Error` with a descriptive message on schema failure.

**Example:**

```ts
import { validateBundledData } from '@vielzeug/codex';
import { readFileSync } from 'node:fs';

const raw = JSON.parse(readFileSync('./my-snapshot.json', 'utf8'));
const data = validateBundledData(raw); // throws if invalid
```

## Types

### `BundledData`

The validated snapshot loaded at startup.

```ts
interface BundledData {
  packages: BundledPackage[];
  version: string;
}
```

### `BundledPackage`

Full package record in the snapshot. Includes all docs and source inline.

```ts
interface BundledPackage {
  apiSource: string | null;
  availableDocPages: DocPage[];
  category: string;
  components: CemDeclaration[];
  description: string;
  docs: Partial<Record<DocPage, string>>;
  exports: string[];
  keywords: string[];
  name: string;
  related: string[];
  slug: string;
  version: string | null;
}
```

### `PackageMeta`

Stripped version returned by tools — no `docs`, `apiSource`, or `components`.

```ts
interface PackageMeta extends Omit<BundledPackage, 'apiSource' | 'components' | 'docs'> {
  hasSource: boolean;
}
```

### `SearchHit`

Result shape for `search-packages`.

```ts
interface SearchHit {
  matchedIn: Array<'docs' | 'exports' | 'keywords' | 'metadata'>;
  matchedPages?: string[];
  name: string;
  score: number;
  slug: string;
}
```

### `DocPage`

```ts
type DocPage = 'api' | 'examples' | 'index' | 'usage';
```

## Errors

### Tool errors (`isError: true`)

All tool-level failures return a text content item with `isError: true`. The error message is human-readable and includes actionable context (available slugs, available pages, available tags).

### Protocol errors (`McpError`)

| Situation            | Error code       |
| -------------------- | ---------------- |
| Unknown tool name    | `MethodNotFound` |
| Unknown resource URI | `InvalidParams`  |

### Startup errors

`loadData()` throws synchronously with an actionable message when:

- The bundled data file is missing (`ENOENT`): includes the regen command
- The file is malformed JSON: includes the regen command
- The parsed data fails schema validation: includes the regen command

## Runtime Behavior

- Default transport: stdio
- HTTP mode: `--port <number>` using Streamable HTTP
- Health endpoint: `GET /health` → `{ "status": "ok" }`
- Bundled data validated at startup — missing or malformed data aborts with an actionable error
- CLI flags: `--help`, `--version`
