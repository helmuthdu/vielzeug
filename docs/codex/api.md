---
title: Codex — API Reference
description: Complete API reference for @vielzeug/codex — tools, resources, and programmatic API.
---

[[toc]]

## API Overview

| Symbol                      | Purpose                                       | Execution mode | Common gotcha                                                       |
| --------------------------- | --------------------------------------------- | -------------- | ------------------------------------------------------------------- |
| `list-packages`             | All packages (no filter)                      | Sync           | Use `get-package` to fetch a single package by slug                 |
| `get-package`               | Single package metadata by slug               | Sync           | `isError: true` when slug is unknown                                |
| `get-docs`                  | Package documentation page                    | Sync           | `page` enum excludes `source` — use `get-source`                    |
| `get-source`                | `src/index.ts` text                           | Sync           | `isError: true` when package has no bundled source                  |
| `search-packages`           | Ranked search across metadata + docs          | Sync           | Returns `[]`, never an error, when nothing matches                  |
| `list-components`           | Sigil component tag list                      | Sync           | `isError: true` if Sigil CEM not in snapshot                        |
| `get-component`             | Single Sigil CEM declaration                  | Sync           | `isError: true` lists available tags on miss                        |
| `generate-template`         | Scaffolded HTML snippet for a Sigil component | Sync           | Required attrs filled; optional attrs in comment block              |
| `get-tokens`                | All Sigil CSS custom properties               | Sync           | Optional `filter` prefix; returns `[]` when nothing matches         |
| `validate-component-usage`  | Validate AI-generated HTML against CEM spec   | Sync           | Returns `[]` when valid; `isError: true` on bad input               |
| `get-sandbox-context`       | Execution constraints of the sandbox runtime  | Sync           | Static — no data dependency; always succeeds                        |
| `get-state-bridge-spec`     | Typed postMessage protocol for the sandbox    | Sync           | Static — no data dependency; always succeeds                        |
| `generate-sandbox-document` | Complete srcdoc-ready HTML document           | Sync           | `isError: true` when `html` is empty or exceeds 20 000 chars        |
| `list-directives`           | All craft directives with signatures          | Sync           | Static — always succeeds; sorted alphabetically                     |
| `list-validators`           | All spell validator functions with signatures | Sync           | `isError: true` when package slug is absent from bundled data       |
| `get-type-signature`        | TypeScript export declaration from source     | Sync           | `isError: true` when symbol not found or no bundled source          |
| `createServer()`            | Programmatic server factory                   | Sync           | Requires pre-loaded `BundledData` — call `loadData()` first         |
| `createServerFromDisk()`    | One-call convenience factory                  | Sync           | Calls `loadData()` internally — throws the same errors              |
| `startHttpServer()`         | Start HTTP server (Streamable + SSE)          | Async          | Used by CLI; import for embedding in a larger process               |
| `createRequestHandler()`    | Build the HTTP handler without binding a port | Sync           | Exposed for integration testing; prefer `startHttpServer()` in prod |
| `loadData()`                | Load and validate bundled snapshot            | Sync           | Throws with an actionable message on missing or malformed data      |
| `packageMeta()`             | Strip heavy fields from a `BundledPackage`    | Sync           | Returns `PackageMeta` — no `docs`, `apiSource`, or `components`     |
| `validateBundledData()`     | Validate raw JSON against `BundledData` shape | Sync           | Use when loading data from a custom path                            |
| `SCHEMA_VERSION`            | Current snapshot schema version constant      | —              | Used by `validateBundledData` to reject stale snapshots             |

## Package Entry Points

| Import            | Purpose                                                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
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

---

### `generate-template`

Generates a ready-to-use HTML snippet for a Sigil component, derived entirely from bundled CEM metadata. Use this as the AI's starting point for declarative UI generation — it eliminates hallucinated attribute names before they reach the DOM.

**Input:**

| Field      | Type     | Required | Description                                                                        |
| ---------- | -------- | -------- | ---------------------------------------------------------------------------------- |
| `tagName`  | `string` | Yes      | HTML custom element tag, e.g. `"sg-button"`                                        |
| `scenario` | `string` | No       | Usage context prepended as an HTML comment, e.g. `"primary call-to-action button"` |

**Result:** An HTML string with:

- Required attributes filled with type-appropriate placeholders (first literal for union types, bare name for booleans, `""` for plain strings)
- Optional attributes (those with defaults) in a `<!-- Optional attributes: -->` comment block
- Named slots scaffolded as `<span slot="name">…</span>` children
- Event names listed in a `<!-- Events: -->` comment

**Example output:**

```html
<!-- primary action -->
<sg-button variant="primary">
  <!-- Optional attributes:
    disabled  (default: false)
  -->
  <!-- Events: sg-click -->
  Content goes here
</sg-button>
```

**Error cases:** unknown `tagName` (lists available tags) or missing Sigil CEM → `isError: true`.

---

### `get-tokens`

Returns all CSS custom properties (design tokens) exposed by Sigil components. Use when generating dynamic themes or inline styles in AI-driven UI — avoids guessing variable names.

**Input:**

| Field    | Type     | Required | Description                                                    |
| -------- | -------- | -------- | -------------------------------------------------------------- |
| `filter` | `string` | No       | Case-insensitive prefix to narrow results, e.g. `"--sg-color"` |

**Result shape:**

```json
[
  {
    "name": "--sg-card-bg",
    "description": "Card background colour",
    "default": "#1e1e2e",
    "component": "sg-card"
  },
  {
    "name": "--sg-card-radius",
    "component": "sg-card"
  }
]
```

Results are sorted by `name` ascending. `description` and `default` are omitted when absent. Tokens that appear on multiple components are deduplicated — only the first occurrence is included.

Returns `[]` (not an error) when `filter` matches nothing.

**Error cases:** missing Sigil CEM → `isError: true`.

---

### `validate-component-usage`

Validates AI-generated HTML against a Sigil component's CEM spec. Use this to close the **generate → validate → fix** loop before passing HTML to the renderer.

**Input:**

| Field     | Type     | Required | Description                                     |
| --------- | -------- | -------- | ----------------------------------------------- |
| `tagName` | `string` | Yes      | HTML custom element tag to validate against     |
| `html`    | `string` | Yes      | HTML fragment to validate (max 5000 characters) |

**Result shape:** A JSON array of issue objects. An empty array means the usage is valid.

```json
[
  {
    "type": "error",
    "message": "Unknown attribute \"colour\" on <sg-button>. Known: variant, disabled."
  },
  {
    "type": "error",
    "message": "Unknown slot \"icon\" on <sg-button>. Known slots: prefix."
  }
]
```

**Checks performed:**

- Unknown attributes (after excluding `class`, `id`, `style`, `aria-*`, `data-*`, `on*`, `tabindex`, `part`, `slot`, and other safe globals)
- Unknown slot names (only when the component defines at least one named slot)

**Error cases:** unknown `tagName`, missing `<tagName>` opening tag in HTML, `html` exceeding 5000 characters, or missing Sigil CEM → `isError: true`.

### `get-sandbox-context`

```ts
get - sandbox - context();
```

Returns a JSON object describing the execution environment inside the `@vielzeug/sandbox` iframe. Use this once per session to understand what is and is not available before generating code.

**Returns (JSON):**

```json
{
  "iframeAttributes": { "sandbox": "allow-scripts", "referrerpolicy": "no-referrer" },
  "cspPolicy": {
    "default-src": "'none'",
    "script-src": "'unsafe-inline'",
    "style-src": "'unsafe-inline'",
    "img-src": "data:",
    "connect-src": "'none'",
    "form-action": "'none'"
  },
  "windowGlobals": ["window", "document", "customElements", "setTimeout", "…"],
  "notAvailable": ["fetch (blocked by connect-src)", "localStorage (blocked by sandbox)", "…"],
  "restrictions": ["No network requests", "No form submissions", "…"]
}
```

**Error cases:** none — this is a static tool.

---

### `get-state-bridge-spec`

```ts
get - state - bridge - spec();
```

Returns the full typed postMessage state bridge protocol for `@vielzeug/sandbox` as a TypeScript source string with inline usage comments.

**Output includes:**

- `HostMessage` union type — messages the host sends into the iframe (`render`, `state-update`, `dispose`)
- `SandboxMessage` union type — messages the sandbox sends back (`ready`, `event`, `error`, `resize`)
- Code examples for listening to `state-update` and dispatching `event` back to the host

**Error cases:** none — this is a static tool.

---

### `generate-sandbox-document`

```ts
generate-sandbox-document(html: string, styles?: string)
```

Wraps an HTML fragment in a complete `srcdoc`-ready document for direct use with `@vielzeug/sandbox`. The output can be passed to `sandboxHandle.render()` or set as `iframe.srcdoc`.

**Inputs:**

| Parameter | Type     | Required | Description                                        |
| --------- | -------- | -------- | -------------------------------------------------- |
| `html`    | `string` | Yes      | HTML body content to embed (max 20 000 chars)      |
| `styles`  | `string` | No       | CSS to inject as a `<style>` block in the `<head>` |

**Output:** a complete `<!doctype html>` document with:

- `Content-Security-Policy` meta tag (same policy as the sandbox runtime)
- Optional `<style>` block
- User HTML in `<body>`
- Injected bridge bootstrap `<script>` (handles `state-update`, reports errors, fires `ready`)

**Error cases:** empty `html` or `html` exceeding 20 000 characters → `isError: true`.

---

### `list-directives`

```ts
list - directives();
```

Returns a JSON array of all reactive directives exported by `@vielzeug/craft/directives`, sorted alphabetically by name. Each entry includes the directive name, its TypeScript call signature, a description, and the import path.

**Output shape (per entry):**

| Field         | Type     | Description                                |
| ------------- | -------- | ------------------------------------------ |
| `name`        | `string` | Directive name, e.g. `"each"`              |
| `signature`   | `string` | Full TypeScript call signature             |
| `description` | `string` | What the directive does and when to use it |
| `import`      | `string` | Always `"@vielzeug/craft/directives"`      |

**Directives included:** `classMap`, `each`, `live`, `model`, `raw`, `styleMap`, `when`

**Error cases:** none — this is a static tool.

---

### `list-validators`

```ts
list-validators(slug?: string)
```

Returns a JSON array of all standalone validator functions exported by a `@vielzeug` package. Currently only `slug: "spell"` is supported.

**Inputs:**

| Parameter | Type     | Required | Default   | Description                            |
| --------- | -------- | -------- | --------- | -------------------------------------- |
| `slug`    | `string` | No       | `"spell"` | Package slug; only `"spell"` supported |

**Output shape (per entry):**

| Field         | Type     | Description                                         |
| ------------- | -------- | --------------------------------------------------- |
| `name`        | `string` | Validator function name, e.g. `"isEmail"`           |
| `signature`   | `string` | Full TypeScript signature including return type     |
| `description` | `string` | What the validator checks                           |
| `category`    | `string` | One of `"type"`, `"number"`, `"length"`, `"format"` |

**Error cases:** `"spell"` package not present in bundled data → `isError: true`.

---

### `get-type-signature`

```ts
get-type-signature(slug: string, symbol: string)
```

Extracts the TypeScript export declaration(s) for a named symbol from a package's bundled `src/index.ts`. Works for functions, constants, type aliases, interfaces, and re-exports.

**Inputs:**

| Parameter | Type     | Required | Description                                 |
| --------- | -------- | -------- | ------------------------------------------- |
| `slug`    | `string` | Yes      | Package slug, e.g. `"arsenal"`              |
| `symbol`  | `string` | Yes      | Exported name to look up, e.g. `"debounce"` |

**Output:** raw declaration lines — the exact text as it appears in `src/index.ts`. Multi-line blocks (interfaces, function bodies) are returned in full.

**Error cases:** unknown `slug`, package has no bundled source, or `symbol` not found in `src/index.ts` → `isError: true`.

---

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

| Parameter         | Type           | Description                                                               |
| ----------------- | -------------- | ------------------------------------------------------------------------- |
| `mcpServer`       | `Server`       | The MCP server instance to connect to the Streamable HTTP transport       |
| `port`            | `number`       | Port to bind the HTTP server on                                           |
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
