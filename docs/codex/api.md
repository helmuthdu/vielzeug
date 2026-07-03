---
title: Codex — API Reference
description: Complete API reference for @vielzeug/codex — MCP tools, CLI, and programmatic API.
---

[[toc]]

## API Overview

| Symbol                      | Purpose                                        | Execution mode | Common gotcha                                                    |
| ---------------------------- | ----------------------------------------------- | -------------- | ----------------------------------------------------------------- |
| `list-packages`               | All packages (no filter)                        | Sync           | Use `get-package` to fetch a single package by slug                |
| `get-package`                 | Single package metadata by slug                 | Sync           | `isError: true` when slug is unknown                               |
| `get-docs`                    | Package documentation page                      | Sync           | `page` enum excludes `source` — use `get-source`                   |
| `get-source`                  | `src/index.ts` text                             | Sync           | `isError: true` when package has no bundled source                 |
| `list-examples`               | REPL example ids for a package                  | Sync           | Returns `[]`, never an error, for packages with no examples        |
| `get-example`                 | Full runnable code for one REPL example         | Sync           | `isError: true` when `exampleId` is unknown for that package       |
| `search-packages`             | Ranked search across metadata, docs, examples   | Sync           | Returns `[]`, never an error, when nothing matches                 |
| `get-type-signature`          | TypeScript export declaration from source       | Sync           | `isError: true` when symbol not found or no bundled source         |
| `refine-list-components`      | Refine component tag list                       | Sync           | `isError: true` if Refine CEM not in snapshot                      |
| `refine-get-component`        | Single Refine CEM declaration                   | Sync           | `isError: true` lists available tags on miss                       |
| `refine-generate-template`    | Scaffolded HTML snippet for a Refine component  | Sync           | Required attrs filled; optional attrs in comment block             |
| `refine-get-tokens`           | All Refine CSS custom properties                | Sync           | Optional `filter` prefix; returns `[]` when nothing matches        |
| `refine-validate-usage`       | Validate AI-generated HTML against CEM spec     | Sync           | Returns `[]` when valid; `isError: true` on bad input              |
| `createServer()`              | Programmatic server factory                     | Sync           | Requires pre-loaded `BundledData` — call `loadData()` first        |
| `createServerFromDisk()`      | One-call convenience factory                    | Sync           | Calls `loadData()` internally — throws the same errors             |
| `startHttpServer()`           | Start HTTP server (Streamable + SSE)            | Async          | Used by CLI; import for embedding in a larger process              |
| `createRequestHandler()`      | Build the HTTP handler without binding a port   | Sync           | Exposed for integration testing; prefer `startHttpServer()` in prod |
| `loadData()`                  | Load and validate bundled snapshot              | Sync           | Throws with an actionable message on missing or malformed data     |
| `packageMeta()`               | Strip heavy fields from a `BundledPackage`      | Sync           | Returns `PackageMeta` — no `docs`, `apiSource`, `examples`, or `typeSignatures` |
| `validateBundledData()`       | Validate raw JSON against `BundledData` shape   | Sync           | Use when loading data from a custom path                           |
| `SCHEMA_VERSION`              | Current snapshot schema version constant        | —              | Used by `validateBundledData` to reject stale snapshots            |

## Package Entry Point

| Import            | Purpose                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@vielzeug/codex` | `createServer`, `createServerFromDisk`, `createRequestHandler`, `startHttpServer`, `loadData`, `packageMeta`, `validateBundledData`, `CodexError`, `ToolError`, all CEM types |

The CLI binary (`codex`) is the primary runtime interface; direct imports are for custom server wiring or embedding.

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
    "related": ["ore", "forge"],
    "availableDocPages": ["index", "api", "usage", "examples"],
    "exampleIds": ["signal-basics", "computed-chain"],
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

### `list-examples`

Returns the REPL example ids and display names for a package — the same runnable examples users
can pick from interactively at [vielzeug.dev/repl](/repl). Does not include the runnable code; use
`get-example` for that.

**Input:**

| Field         | Type     | Required | Description                          |
| ------------- | -------- | -------- | ------------------------------------ |
| `packageSlug` | `string` | Yes      | Package folder name, e.g. `"ripple"` |

**Result shape:**

```json
[
  { "id": "signal-basics", "name": "Signal basics" },
  { "id": "computed-chain", "name": "Chaining computed values" }
]
```

Returns `[]` — not an error — for packages with no REPL examples (e.g. DOM-output packages like
`refine`, `prism`, `ore`, which have no browser-executable preview container).

**Error cases:** unknown `packageSlug` → `isError: true`.

---

### `get-example`

Returns the full runnable source code for one REPL example.

**Input:**

| Field         | Type     | Required | Description                                  |
| ------------- | -------- | -------- | --------------------------------------------- |
| `packageSlug` | `string` | Yes      | Package folder name, e.g. `"ripple"`          |
| `exampleId`   | `string` | Yes      | Example id from `list-examples`, e.g. `"signal-basics"` |

**Result:** the example's runnable code as plain text (JavaScript, copy-paste ready).

**Error cases:** unknown `packageSlug`, or `exampleId` not found for that package (lists available
ids) → `isError: true`.

---

### `search-packages`

Searches metadata, keywords, documentation, REPL examples, and source. Returns ranked `SearchHit`
objects.

**Input:**

| Field   | Type     | Required | Description           |
| ------- | -------- | -------- | ---------------------- |
| `query` | `string` | Yes      | Non-empty search term (max 500 chars) |

**Ranking:**

| Weight | Category      | Field(s) searched                                        |
| ------ | -------------- | --------------------------------------------------------- |
| 3.9    | `"metadata"`   | `name` (exact package name)                                |
| 3.5    | `"metadata"`   | `category`                                                 |
| 3.1    | `"metadata"`   | `description`                                              |
| 2.5    | `"keywords"`   | `keywords` array                                           |
| 2.2    | `"exports"`    | `exports` array (exported symbol names)                    |
| 2.0    | `"related"`    | `related` array (sibling package slugs)                    |
| 1.0    | `"docs"`       | All doc pages (`matchedPages` lists which pages matched)   |
| 0.95   | `"examples"`   | REPL example names and code (`matchedExamples` lists which ids matched) |
| 0.9    | `"source"`     | Bundled `src/index.ts` text                                |

`score` is a floating-point number — the highest weight across all matched fields. Results sorted by
`score` descending, then `slug` ascending as tiebreaker. Multiple categories can match
simultaneously.

**Multi-word queries:** all words must appear within the same field's normalised haystack for that
category to score. For `keywords`, `exports`, and `related`, the individual array entries are
joined into a single string before matching — so `"reactive signal"` matches a package with
`keywords: ["reactive", "signal"]`. For `name`, `category`, and `description`, all terms must
appear in the single field value. Search terms are normalised — lowercase, hyphens replaced with
spaces — before matching. `"my-pkg"` matches a package named `"@vielzeug/my-pkg"`.

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
    "name": "@vielzeug/arsenal",
    "slug": "arsenal",
    "score": 0.95,
    "matchedIn": ["examples"],
    "matchedExamples": ["function-debounce"]
  }
]
```

Returns `[]` when nothing matches — not an error.

---

### `get-type-signature`

Extracts the TypeScript export declaration(s) for a named symbol from a package's bundled
`src/index.ts` (and everything it re-exports via `export * from './x'`). Works for functions,
constants, type aliases, interfaces, and re-exports.

**Input:**

| Field    | Type     | Required | Description                                 |
| -------- | -------- | -------- | -------------------------------------------- |
| `slug`   | `string` | Yes      | Package slug, e.g. `"arsenal"`               |
| `symbol` | `string` | Yes      | Exported name to look up, e.g. `"debounce"`  |

**Output:** raw declaration text — the exact text as it appears in the source file. Multiple
declarations for the same name (e.g. function overloads) are joined with a blank line.

**Error cases:** unknown `slug`, package has no bundled source, or `symbol` not found (including
inherited `Object.prototype` member names like `"constructor"` or `"toString"`, which are never
real bundled symbols) → `isError: true`.

---

### `refine-list-components`

Lists all `@vielzeug/refine` web component tags from bundled Custom Elements Manifest (CEM)
metadata.

**Input:** none

**Result shape:**

```json
[
  {
    "tagName": "ore-button",
    "description": "A clickable button element.",
    "attrs": [
      { "name": "variant", "type": "string", "default": "primary" },
      { "name": "disabled", "type": "boolean" }
    ]
  }
]
```

Each entry includes:

| Field         | Type                              | Description                                         |
| ------------- | ---------------------------------- | ---------------------------------------------------- |
| `tagName`     | `string`                           | HTML custom element tag name, e.g. `"ore-button"`    |
| `description` | `string`                           | Component description from the CEM (may be empty)    |
| `attrs`       | `Array<{ name, type, default? }>`  | Attribute list; `default` omitted when not defined   |

**Error cases:** Refine CEM not present in this snapshot → `isError: true`.

---

### `refine-get-component`

Returns one full CEM declaration for a Refine component.

**Input:**

| Field     | Type     | Required | Description                                 |
| --------- | -------- | -------- | -------------------------------------------- |
| `tagName` | `string` | Yes      | HTML custom element tag, e.g. `"ore-button"`  |

**Result:** Full CEM declaration including attributes, members, events, slots, CSS parts, and CSS
properties.

**Error cases:** unknown tag (lists available tags) or missing Refine CEM → `isError: true`.

---

### `refine-generate-template`

Generates a ready-to-use HTML snippet for a Refine component, derived entirely from bundled CEM
metadata. Use this as the AI's starting point for declarative UI generation — it eliminates
hallucinated attribute names before they reach the DOM.

**Input:**

| Field      | Type     | Required | Description                                                                          |
| ---------- | -------- | -------- | -------------------------------------------------------------------------------------- |
| `tagName`  | `string` | Yes      | HTML custom element tag, e.g. `"ore-button"`                                            |
| `scenario` | `string` | No       | Usage context prepended as an HTML comment, e.g. `"primary call-to-action button"`     |

**Result:** An HTML string with:

- Required attributes filled with type-appropriate placeholders (first literal for union types,
  bare name for booleans, `""` for plain strings)
- Optional attributes (those with defaults) in a `<!-- Optional attributes: -->` comment block
- Named slots scaffolded as `<span slot="name">…</span>` children
- Event names listed in a `<!-- Events: -->` comment

**Example output:**

```html
<!-- primary action -->
<ore-button variant="primary">
  <!-- Optional attributes:
    disabled  (default: false)
  -->
  <!-- Events: ore-click -->
  Content goes here
</ore-button>
```

**Error cases:** unknown `tagName` (lists available tags) or missing Refine CEM → `isError: true`.

---

### `refine-get-tokens`

Returns all CSS custom properties (design tokens) exposed by Refine components. Use when
generating dynamic themes or inline styles in AI-driven UI — avoids guessing variable names.

**Input:**

| Field    | Type     | Required | Description                                                     |
| -------- | -------- | -------- | ----------------------------------------------------------------- |
| `filter` | `string` | No       | Case-insensitive prefix to narrow results, e.g. `"--ore-color"`   |

**Result shape:**

```json
[
  {
    "name": "--ore-card-bg",
    "description": "Card background colour",
    "default": "#1e1e2e",
    "component": "ore-card"
  },
  {
    "name": "--ore-card-radius",
    "component": "ore-card"
  }
]
```

Results are sorted by `name` ascending. `description` and `default` are omitted when absent.
Tokens that appear on multiple components are deduplicated by name — components are iterated in
stable bundled order, so the first occurrence is returned deterministically (shared design tokens
are typically documented identically everywhere they appear).

Returns `[]` (not an error) when `filter` matches nothing.

**Error cases:** missing Refine CEM → `isError: true`.

---

### `refine-validate-usage`

Validates AI-generated HTML against a Refine component's CEM spec. Use this to close the
**generate → validate → fix** loop before passing HTML to the renderer.

**Input:**

| Field     | Type     | Required | Description                                       |
| --------- | -------- | -------- | ---------------------------------------------------- |
| `tagName` | `string` | Yes      | HTML custom element tag to validate against          |
| `html`    | `string` | Yes      | HTML fragment to validate (max 5000 characters)      |

**Result shape:** A JSON array of issue objects. An empty array means the usage is valid.

```json
[
  {
    "type": "error",
    "message": "Unknown attribute \"colour\" on <ore-button>. Known: variant, disabled."
  },
  {
    "type": "error",
    "message": "Unknown slot \"icon\" on <ore-button>. Known slots: prefix."
  }
]
```

**Checks performed:**

- Unknown attributes (after excluding `class`, `id`, `style`, `aria-*`, `data-*`, `on*`, `tabindex`,
  `part`, `slot`, and other safe globals)
- Unknown slot names (only when the component defines at least one named slot)

**Error cases:** unknown `tagName`, missing `<tagName>` opening tag in HTML, `html` exceeding 5000
characters, or missing Refine CEM → `isError: true`.

## Programmatic API

### `createServerFromDisk()`

```ts
createServerFromDisk(): Server;
```

Convenience factory that calls `loadData()` internally and passes the result to `createServer()`.
Use this for the common single-expression wiring pattern.

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

Creates and returns an MCP `Server` instance with all tools registered.

**Parameters:**

| Parameter | Type          | Description                                                   |
| --------- | ------------- | --------------------------------------------------------------- |
| `data`    | `BundledData` | Validated bundled snapshot — call `loadData()` to obtain it     |

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
loadData(dataFile?: string): BundledData;
```

Reads and validates a bundled snapshot from disk. Throws synchronously with an actionable error
message if the file is missing, malformed, or fails schema validation.

**Parameters:**

| Parameter  | Type     | Description                                                                        |
| ---------- | -------- | ------------------------------------------------------------------------------------ |
| `dataFile` | `string` | Optional path to a custom snapshot file. Defaults to the bundled `data/vielzeug-data.json`. |

**Returns:** `BundledData`

**Throws:** `CodexError` — with a `pnpm run prepare:data` regen hint when the data file is absent
or malformed. Delegates to `validateBundledData()` for schema validation.

---

### `packageMeta()`

```ts
packageMeta(pkg: BundledPackage): PackageMeta;
```

Strips `apiSource`, `docs`, `examples`, and `typeSignatures` from a `BundledPackage`, adds
`hasSource`, and reduces `examples` to `exampleIds`. Use this to produce lightweight metadata for
tool responses.

**Parameters:**

| Parameter | Type             | Description                                     |
| --------- | ---------------- | -------------------------------------------------- |
| `pkg`     | `BundledPackage` | Full package record from `BundledData.packages`    |

**Returns:** `PackageMeta`

---

### `startHttpServer()`

```ts
startHttpServer(
  mcpServer: Server,
  port: number,
  createSseServer: () => Server,
  version?: string,
): Promise<HttpServerHandle>;
```

Starts an HTTP server that exposes both the Streamable HTTP transport (spec-compliant clients) and
the legacy SSE transport (older clients). The CLI calls this when `--port` is provided; import it
when embedding codex into a larger Node.js HTTP process.

**Parameters:**

| Parameter         | Type           | Description                                                                 |
| ----------------- | -------------- | ------------------------------------------------------------------------------ |
| `mcpServer`       | `Server`       | The MCP server instance to connect to the Streamable HTTP transport            |
| `port`            | `number`       | Port to bind the HTTP server on                                                |
| `createSseServer` | `() => Server` | Factory called per legacy SSE connection; returns a fresh server instance      |
| `version`         | `string`       | Optional — included in the `/health` response when provided. The CLI passes the bundled data's own version. |

**Returns:** `Promise<HttpServerHandle>`

**Throws:** rejects if the port is already in use (`EADDRINUSE`).

---

### `HttpServerHandle`

```ts
interface HttpServerHandle {
  dispose(): Promise<void>;
  readonly disposed: boolean;
  [Symbol.asyncDispose](): Promise<void>;
}
```

Returned by `startHttpServer()`. Call `dispose()` (or use an `await using` declaration) to close
the HTTP server and all open connections — `dispose()` is idempotent, and `disposed` reflects
whether it has already run. The CLI registers `SIGTERM` and `SIGINT` handlers that call `dispose()`
automatically.

---

### `createRequestHandler()`

```ts
createRequestHandler(
  streamableTransport: StreamableHTTPServerTransport,
  sseSessions: Map<string, SSEServerTransport>,
  createSseServer: () => Server,
  version?: string,
): (req: IncomingMessage, res: ServerResponse) => void;
```

Builds the raw Node.js HTTP request handler without binding a port. Exposed primarily for
integration testing — `startHttpServer()` calls this internally. Use `startHttpServer()` for
production wiring.

**Returns:** A `(req, res) => void` handler suitable for `node:http`'s `createServer()`.

---

### `validateBundledData()`

```ts
validateBundledData(raw: unknown): BundledData;
```

Validates that `raw` conforms to the `BundledData` shape: checks `schemaVersion` (must match
`SCHEMA_VERSION`), `version` (string), `packages` and `refineComponents` (arrays), and for each
package entry — a non-empty `slug` string, a `name` string, that `availableDocPages`/`examples`/
`exports`/`keywords`/`related` are arrays, and that `docs`/`typeSignatures` are objects. Use when
loading data from a custom path instead of `loadData()`.

**Parameters:**

| Parameter | Type      | Description               |
| --------- | --------- | --------------------------- |
| `raw`     | `unknown` | Parsed JSON to validate     |

**Returns:** `BundledData` (cast after validation)

**Throws:** `CodexError` with a descriptive message on schema failure — the message names the
specific package slug and field that failed validation, not just "malformed data".

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
  refineComponents: CemDeclaration[];
  schemaVersion: number;
  version: string;
}
```

`refineComponents` is `[]` when `@vielzeug/refine` was not built before data generation (published
releases always include it).

### `BundledPackage`

Full package record in the snapshot. Includes all docs, source, and REPL examples inline.

```ts
interface BundledPackage {
  apiSource: string | null;
  availableDocPages: DocPage[];
  category: string;
  description: string;
  docs: Partial<Record<DocPage, string>>;
  examples: BundledExample[];
  exports: string[];
  keywords: string[];
  name: string;
  related: string[];
  slug: string;
  typeSignatures: Record<string, string>;
  version: string; // always a string; defaults to '0.0.0' when not found in package.json
}
```

### `BundledExample`

A single runnable REPL code example, sourced from
`docs/.vitepress/theme/components/repl/examples/<slug>/`.

```ts
interface BundledExample {
  code: string;
  id: string;
  name: string;
}
```

### `PackageMeta`

Lightweight metadata returned by tools. Derived from `BundledPackage` — heavy content fields
(`apiSource`, `docs`, `examples`, `typeSignatures`) are omitted, `hasSource` is computed, and
`examples` is reduced to `exampleIds`.

```ts
type PackageMeta = Omit<BundledPackage, 'apiSource' | 'docs' | 'examples' | 'typeSignatures'> & {
  exampleIds: string[];
  hasSource: boolean;
};
```

### `SearchHit`

Result shape for `search-packages`.

```ts
interface SearchHit {
  matchedExamples?: string[];
  matchedIn: Array<'docs' | 'examples' | 'exports' | 'keywords' | 'metadata' | 'related' | 'source'>;
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

These types describe the Custom Elements Manifest (CEM) shape used by `refine-get-component` and
`refine-list-components`. Import them from `@vielzeug/codex` when processing component
declarations in TypeScript.

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

The snapshot schema version. `validateBundledData` rejects data whose `schemaVersion` does not
match this value. Useful as a guard when loading data from a custom snapshot file.

## Errors

### Tool errors (`isError: true`)

Every failed tool call returns `isError: true` with a single text content block containing
`{"code": "...", "message": "..."}` — `code` is one of `INVALID_ARG` (bad or missing argument),
`NOT_FOUND` (unknown slug/tag/symbol/example), or `UNAVAILABLE` (data not bundled, e.g. Refine CEM
metadata when `@vielzeug/refine` wasn't built). Branch on `code` instead of matching `message` text.

### Protocol errors (`McpError`)

| Situation         | Error code       |
| ------------------ | ----------------- |
| Unknown tool name  | `MethodNotFound`  |

### `CodexError`

```ts
class CodexError extends Error {
  static is(err: unknown): err is CodexError;
}
```

Base class for every error codex throws itself (startup/data-loading failures, invalid tool
arguments). Use `CodexError.is(err)` to distinguish codex-originated failures from errors thrown by
dependencies (e.g. the MCP SDK) in a catch block.

### `ToolError`

```ts
type ToolErrorCode = 'INVALID_ARG' | 'NOT_FOUND' | 'UNAVAILABLE';

class ToolError extends CodexError {
  readonly code: ToolErrorCode;
}
```

Thrown internally by every tool's `run()` implementation for any expected failure (bad argument,
unknown slug/tag, missing bundled data). Callers never see this directly — the MCP server's central
handler catches it and converts it into a tool result with `isError: true` and the `{code,
message}` JSON body described above. Exported so embedders using `createServer()`/`registerTools()`
directly can recognise it with `instanceof ToolError` or `CodexError.is()`, and branch on `code`.

### Startup errors

`loadData()` throws a `CodexError` synchronously with an actionable message when:

- The bundled data file is missing (`ENOENT`): includes the regen command
- The file cannot be read for any other reason (`EACCES`, etc.): includes the file path and system
  error message
- The file is malformed JSON: includes the regen command
- The parsed data fails schema validation (including per-package field shape checks): includes the
  regen command and, for a field-shape failure, the specific package slug and field name
- A package entry is missing a non-empty `slug` or `name`: includes the regen command

## Runtime Behavior

- Default transport: stdio
- HTTP mode: `--port <number>` using Streamable HTTP (spec-compliant) + legacy SSE at `GET /sse`
- Health endpoint: `GET /health` → `{ "status": "ok", "version": "<bundled snapshot version>" }`
- `--data <path>` loads bundled data from a custom snapshot file instead of the built-in one
- Bundled data validated at startup — missing or malformed data aborts with an actionable error
- CLI flags: `--help` (stderr), `--version` (stdout — prints the npm package version from
  `package.json`; does not require bundled data)
- Unknown flags print a usage hint and exit with code 1
- `EADDRINUSE` prints `error: port N is already in use.` and exits with code 1
- HTTP mode registers `SIGTERM` and `SIGINT` handlers; both call `handle.dispose()` and
  `process.exit(0)`
- Argument validation failures (`parseArgs` against a tool's declared `ToolSchema`) throw
  `ToolError('INVALID_ARG', ...)`, which the server converts to `isError: true` — they never
  surface as an MCP protocol error
