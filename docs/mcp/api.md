---
title: Mcp — API Reference
description: Current MCP tool contracts, result shapes, and runtime behavior for the Vielzeug MCP server.
---

[[toc]]

## API at a glance

| Name | Kind | Input | Returns |
| --- | --- | --- | --- |
| `list-packages` | Tool | none | JSON array of package metadata |
| `get-package` | Tool | `packageSlug` | JSON object for one package |
| `get-docs` | Tool | `packageSlug`, `page?` | Markdown docs text |
| `get-source` | Tool | `packageSlug` | Bundled `src/index.ts` source text |
| `search-packages` | Tool | `query` | JSON array of ranked matches |
| `list-components` | Tool | none | JSON array of `{ name, tagName }` |
| `get-component` | Tool | `tagName` | JSON Block component declaration |

## Tool details

### `list-packages`

Returns one metadata object per package.

**Input:** none

**Result shape:**

```json
[
  {
    "name": "@vielzeug/ripple",
    "slug": "ripple",
    "version": "3.0.0",
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

Returns one package metadata object by slug.

**Input:**

| Field | Type | Description |
| --- | --- | --- |
| `packageSlug` | `string` | Package folder name without the `@vielzeug/` prefix |

**Error cases:** unknown slug returns `isError: true` with available slugs.

---

### `get-docs`

Returns docs content for a package and page.

**Input:**

| Field | Type | Description |
| --- | --- | --- |
| `packageSlug` | `string` | Package folder name without the `@vielzeug/` prefix |
| `page` | `'index' \| 'api' \| 'usage' \| 'examples'` (optional) | Defaults to `index` |

Behavior:

- Returns markdown text only
- Use `get-source` for `src/index.ts`

---

### `get-source`

Returns bundled `src/index.ts` source text for a package.

**Input:**

| Field | Type | Description |
| --- | --- | --- |
| `packageSlug` | `string` | Package folder name without the `@vielzeug/` prefix |

**Error cases:** unknown slug or missing source returns `isError: true`.

---

### `search-packages`

Searches package metadata and docs content.

**Input:**

| Field | Type | Description |
| --- | --- | --- |
| `query` | `string` | Non-empty search term |

Ranking order:

1. Metadata (`name`, `description`, `category`)
2. `keywords`
3. Docs content (`index`, `api`, `usage`, `examples`) and then source text (`matchedPage: "source"`)

**Result example:**

```json
[
  { "name": "@vielzeug/sieve", "slug": "sieve", "matchedIn": "metadata" },
  { "name": "@vielzeug/forge", "slug": "forge", "matchedIn": "docs", "matchedPage": "usage" }
]
```

If nothing matches, the tool returns `[]` (not an error).

---

### `list-components`

Returns Block component tags from bundled component metadata.

**Input:** none

**Error cases:** missing bundled Block component metadata returns `isError: true`.

---

### `get-component`

Returns one full Block component declaration by `tagName`.

**Input:**

| Field | Type | Description |
| --- | --- | --- |
| `tagName` | `string` | HTML custom element tag, e.g. `bit-button` |

**Error cases:** unknown tag returns `isError: true` and lists available tags.

## Validation and errors

- Tool schemas are declared as JSON Schema and advertised through `ListTools`.
- Tool handlers perform argument checks and return user-facing tool errors as `isError: true`.
- Domain/runtime failures are returned as `isError: true` tool results.
- Unknown tool names are handled at the MCP protocol layer (`MethodNotFound`).

Example tool error payload:

```json
{
  "content": [{ "type": "text", "text": "Package \"does-not-exist\" not found. Available slugs: ..." }],
  "isError": true
}
```

## Runtime behavior

- Default transport: stdio
- HTTP mode: `--port <number>` using Streamable HTTP
- HTTP health endpoint: `GET /health` returns `{ "status": "ok" }`
- Bundled data is validated at startup (fail-fast)
- CLI helpers: `--help` and `--version`
