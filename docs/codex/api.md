---
title: Codex — API Reference
description: Complete API reference for @vielzeug/codex — tools, resources, and programmatic API.
---

[[toc]]

## API Overview

| Symbol                   | Purpose                                       | Execution mode | Common gotcha                                                   |
| ------------------------ | --------------------------------------------- | -------------- | --------------------------------------------------------------- |
| `list-packages`          | All packages (no filter)                      | Sync           | Use `get-package` to fetch a single package by slug             |
| `get-package`            | Single package metadata by slug               | Sync           | `isError: true` when slug is unknown                            |
| `get-docs`               | Package documentation page                    | Sync           | `page` enum excludes `source` — use `get-source`                |
| `get-source`             | `src/index.ts` text                           | Sync           | `isError: true` when package has no bundled source              |
| `search-packages`        | Ranked search across metadata + docs          | Sync           | Returns `[]`, never an error, when nothing matches              |
| `list-components`        | Sigil component tag list                      | Sync           | `isError: true` if Sigil CEM not in snapshot                    |
| `get-component`          | Single Sigil CEM declaration                  | Sync           | `isError: true` lists available tags on miss                    |
| `createServer()`         | Programmatic server factory                   | Sync           | Requires pre-loaded `BundledData` — call `loadData()` first     |
| `createServerFromDisk()` | One-call convenience factory                  | Sync           | Calls `loadData()` internally — throws the same errors          |
| `startHttpServer()`      | Start HTTP server (Streamable + SSE)          | Async          | Used by CLI; import for embedding in a larger process           |
| `createRequestHandler()` | Build the HTTP handler without binding a port | Sync           | Exposed for integration testing; prefer `startHttpServer()` in prod |
| `loadData()`             | Load and validate bundled snapshot            | Sync           | Throws with an actionable message on missing or malformed data  |
| `packageMeta()`          | Strip heavy fields from a `BundledPackage`    | Sync           | Returns `PackageMeta` — no `docs`, `apiSource`, or `components` |
| `validateBundledData()`  | Validate raw JSON against `BundledData` shape | Sync           | Use when loading data from a custom path                        |
| `SCHEMA_VERSION`         | Current snapshot schema version constant      | —              | Used by `validateBundledData` to reject stale snapshots         |

## Package Entry Points

| Import            | Purpose                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `@vielzeug/codex` | `createServer`, `createServerFromDisk`, `createRequestHandler`, `loadData`, `packageMeta`, `validateBundledData`, `startHttpServer`, all CEM types |

The CLI binary (`codex`) is the primary runtime interface; direct imports are for custom server wiring.

## Tools

### `list-packages`

Returns an array of `PackageMeta` objects for all packages. Takes no input.

**Input:** none

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

---

### `get-package`

Returns a single `PackageMeta` object by slug.

**Input:**

| Field         | Type     | Required | Description                           |
| ------------- | -------- | -------- | ------------------------------------- |
| `packageSlug` | `string` | Yes      | Package folder name, e.g. `"ripple"`. |

**Result shape:** same as a single entry from `list-packages` — a `PackageMeta` object (not an array).

**Error cases:** unknown slug or missing/empty `packageSlug` → `isError: true` with available slugs listed.

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

| Weight | Category     | Field(s) searched                                        |
| ------ | ------------ | -------------------------------------------------------- |
| 3.9    | `"metadata"` | `name` (exact package name)                              |
| 3.5    | `"metadata"` | `category`                                               |
| 3.1    | `"metadata"` | `description`                                            |
| 2.5    | `"keywords"` | `keywords` array                                         |
| 2.2    | `"exports"`  | `exports` array (exported symbol names)                  |
| 2.0    | `"related"`  | `related` array (sibling package slugs)                  |
| 1.0    | `"docs"`     | All doc pages (`matchedPages` lists which pages matched) |
| 0.9    | `"source"`   | Bundled `src/index.ts` text                              |

`score` is a floating-point number — the highest weight across all matched fields. Results sorted by `score` descending, then `slug` ascending as tiebreaker. Multiple categories can match simultaneously.

**Multi-word queries:** all words must appear within the same field's normalised haystack for that category to score. For `keywords`, `exports`, and `related`, the individual array entries are joined into a single string before matching — so `"reactive signal"` matches a package with `keywords: ["reactive", "signal"]`. For `name`, `category`, and `description`, all terms must appear in the single field value. Search terms are normalised — lowercase, hyphens replaced with spaces — before matching. `"my-pkg"` matches a package named `"@vielzeug/my-pkg"`.

**Result shape:**

```json
[
  {
    "name": "@vielzeug/spell",
    "slug": "spell",
    "score": 3.9,
    "matchedIn": ["metadata", "keywords"]
  },
  {
    "name": "@vielzeug/forge",
    "slug": "forge",
    "score": 1.0,
    "matchedIn": ["docs"],
    "matchedPages": ["usage", "examples"]
  },
  {
    "name": "@vielzeug/craft",
    "slug": "craft",
    "score": 2.0,
    "matchedIn": ["related"]
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
  {
    "tagName": "sg-button",
    "description": "A clickable button element.",
    "attrs": [
      { "name": "variant", "type": "string", "default": "primary" },
      { "name": "disabled", "type": "boolean" }
    ]
  }
]
```

Each entry includes:

| Field         | Type                              | Description                                        |
| ------------- | --------------------------------- | -------------------------------------------------- |
| `tagName`     | `string`                          | HTML custom element tag name, e.g. `"sg-button"`   |
| `description` | `string`                          | Component description from the CEM (may be empty)  |
| `attrs`       | `Array<{ name, type, default? }>` | Attribute list; `default` omitted when not defined |

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

## Programmatic API

### `createServerFromDisk()`

```ts
createServerFromDisk(): Server;
```

Convenience factory that calls `loadData()` internally and passes the result to `createServer()`. Use this for the common single-expression wiring pattern.

**Returns:** `Server` from `@modelcontextprotocol/sdk`

**Throws:** same errors as `loadData()`.

**Example:**

```ts
import { createServerFromDisk } from '@vielzeug/codex';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

await createServerFromDisk().connect(new StdioServerTransport());
```

---

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

**Throws:** `Error` — with a `pnpm run prepare:data` regen hint when the data file is absent or malformed. Per-entry validation checks that every package entry has a non-empty `slug` string and a `name` string; a missing or empty value throws immediately with an actionable message.

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

### `startHttpServer()`

```ts
startHttpServer(
  mcpServer: Server,
  port: number,
  createSseServer: () => Server,
): Promise<HttpServerHandle>;
```

Starts an HTTP server that exposes both the Streamable HTTP transport (spec-compliant clients) and the legacy SSE transport (older clients). The CLI calls this when `--port` is provided; import it when embedding codex into a larger Node.js HTTP process.

**Parameters:**

| Parameter       | Type            | Description                                                            |
| --------------- | --------------- | ---------------------------------------------------------------------- |
| `mcpServer`     | `Server`        | The MCP server instance to connect to the Streamable HTTP transport    |
| `port`          | `number`        | Port to bind the HTTP server on                                        |
| `createSseServer` | `() => Server` | Factory called per legacy SSE connection; returns a fresh server instance |

**Returns:** `Promise<HttpServerHandle>`

**Throws:** rejects if the port is already in use (`EADDRINUSE`).

---

### `HttpServerHandle`

```ts
interface HttpServerHandle {
  dispose(): Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
}
```

Returned by `startHttpServer()`. Call `dispose()` (or use an `await using` declaration) to close the HTTP server and all open connections. The CLI registers `SIGTERM` and `SIGINT` handlers that call `dispose()` automatically.

---

### `createRequestHandler()`

```ts
createRequestHandler(
  streamableTransport: StreamableHTTPServerTransport,
  sseSessions: Map<string, SSEServerTransport>,
  createSseServer: () => Server,
): (req: IncomingMessage, res: ServerResponse) => void;
```

Builds the raw Node.js HTTP request handler without binding a port. Exposed primarily for integration testing — `startHttpServer()` calls this internally. Use `startHttpServer()` for production wiring.

**Returns:** A `(req, res) => void` handler suitable for `node:http`'s `createServer()`.

---

### `validateBundledData()`

```ts
validateBundledData(raw: unknown): BundledData;
```

Validates that `raw` conforms to the `BundledData` shape: checks `schemaVersion` (must match `SCHEMA_VERSION`), `version` (string), `packages` (array), and that each entry has a non-empty `slug` and a `name`. Use when loading data from a custom path instead of `loadData()`.

**Parameters:**

| Parameter | Type      | Description             |
| --------- | --------- | ----------------------- |
| `raw`     | `unknown` | Parsed JSON to validate |

**Returns:** `BundledData` (cast after validation)

**Throws:** `Error` with a descriptive message on schema failure. Per-entry `slug`/`name` validation is also applied — see `loadData()` for the same contract.

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
  schemaVersion: number;
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
  version: string; // always a string; defaults to '0.0.0' when not found in package.json
}
```

### `PackageMeta`

Lightweight metadata returned by tools. Derived from `BundledPackage` — heavy content fields (`docs`, `apiSource`, `components`) are omitted, and `hasSource` is computed.

```ts
type PackageMeta = Omit<BundledPackage, 'apiSource' | 'components' | 'docs'> & {
  hasSource: boolean;
};
```

### `SearchHit`

Result shape for `search-packages`.

```ts
interface SearchHit {
  matchedIn: Array<'docs' | 'exports' | 'keywords' | 'metadata' | 'related' | 'source'>;
  matchedPages?: DocPage[];
  name: string;
  score: number;
  slug: string;
}
```

### `DocPage`

```ts
type DocPage = 'api' | 'examples' | 'index' | 'usage';
```

### CEM Types

These types describe the Custom Elements Manifest (CEM) shape used by `get-component` and `list-components`. Import them from `@vielzeug/codex` when processing component declarations in TypeScript.

```ts
interface CemTypeRef {
  text: string;
}

interface CemAttribute {
  default?: string;
  description?: string;
  fieldName?: string;
  name: string;
  type?: CemTypeRef;
}

interface CemCssPart {
  description?: string;
  name: string;
}

interface CemCssProperty {
  default?: string;
  description?: string;
  name: string;
}

interface CemEvent {
  description?: string;
  name: string;
  type?: CemTypeRef;
}

interface CemMember {
  description?: string;
  kind?: 'field' | 'method';
  name: string;
  type?: CemTypeRef;
}

interface CemSlot {
  description?: string;
  name: string;
}

interface CemDeclaration {
  attributes?: CemAttribute[];
  cssProperties?: CemCssProperty[];
  cssParts?: CemCssPart[];
  description?: string;
  events?: CemEvent[];
  members?: CemMember[];
  name?: string;
  slots?: CemSlot[];
  superclass?: { name: string; package?: string };
  tagName?: string;
  [key: string]: unknown;
}
```

### `SCHEMA_VERSION`

```ts
const SCHEMA_VERSION: number;
```

The snapshot schema version. `validateBundledData` rejects data whose `schemaVersion` does not match this value. Useful as a guard when loading data from a custom snapshot file.

## Errors

### Tool errors (`isError: true`)

All tool-level failures return a text content item with `isError: true`. The error message is human-readable and includes actionable context (available slugs, available pages, available tags).

### Protocol errors (`McpError`)

| Situation         | Error code       |
| ----------------- | ---------------- |
| Unknown tool name | `MethodNotFound` |

### Startup errors

`loadData()` throws synchronously with an actionable message when:

- The bundled data file is missing (`ENOENT`): includes the regen command
- The file cannot be read for any other reason (`EACCES`, etc.): includes the file path and system error message
- The file is malformed JSON: includes the regen command
- The parsed data fails schema validation: includes the regen command
- A package entry is missing a non-empty `slug` or `name`: includes the regen command

## Runtime Behavior

- Default transport: stdio
- HTTP mode: `--port <number>` using Streamable HTTP (spec-compliant) + legacy SSE at `GET /sse`
- Health endpoint: `GET /health` → `{ "status": "ok" }`
- Bundled data validated at startup — missing or malformed data aborts with an actionable error
- CLI flags: `--help` (stderr), `--version` (stdout — prints the npm package version from `package.json`; does not require bundled data)
- Unknown flags print a usage hint and exit with code 1
- `EADDRINUSE` prints `error: port N is already in use.` and exits with code 1
- HTTP mode registers `SIGTERM` and `SIGINT` handlers; both call `handle.dispose()` and `process.exit(0)`
- Argument validation failures (`requireStr`) return `isError: true` with a descriptive message — they do not throw an MCP protocol error
