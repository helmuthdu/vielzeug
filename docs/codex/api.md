---
title: Codex API
description: Snapshot, catalog, MCP server, and local HTTP host APIs.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `loadSnapshot` | Read validated snapshot metadata | Sync | Content chunks load lazily |
| `SnapshotCatalog` | Query package corpus | Sync | Construct from loaded snapshot |
| `createMcpServer` | MCP adapter factory (generic tools) | Sync | Requires catalog and version |
| `createMcpServerWithRefine` | MCP adapter factory (all package and Refine tools) | Sync | Import from `@vielzeug/codex/refine` |
| `startHttpHost` | Loopback Streamable HTTP host | Async | HTTP remains local-only |

## Package Entry Points

| Import | Purpose |
| --- | --- |
| `@vielzeug/codex` | `Catalog`, `SnapshotCatalog`, `loadSnapshot`, MCP server, and HTTP host |
| `@vielzeug/codex/refine` | Refine catalog and MCP server with component tools |

## Snapshot

### `loadSnapshot`

```ts
loadSnapshot(snapshotRoot?: string, options?: { validateContents?: boolean }): LoadedSnapshot;
```

Loads catalog/search metadata and Refine metadata. `snapshotRoot` defaults to bundled `data/`. Package content chunks stay lazy unless `validateContents: true`, which validates every package content chunk during loading.

### `SnapshotCatalog`

```ts
new SnapshotCatalog(snapshot: LoadedSnapshot)
```

Provides generic package lookup, docs/source/example/signature access, and deterministic search. Use `SnapshotRefineCatalog` from `/refine` when component methods are needed.

---

## MCP

### `createMcpServer`

```ts
createMcpServer(catalog: Catalog, options: { version: string; debug?: boolean }): Server;
```

Registers generic package tools over `Catalog`. Refine tools are opt-in through `/refine`. The root also re-exports `StdioServerTransport` for connecting the server without a second package import.

## Refine tools (`@vielzeug/codex/refine`)

### `createMcpServerWithRefine`

```ts
createMcpServerWithRefine(catalog: RefineCatalog, options: { version: string; debug?: boolean }): Server;
```

Creates a server with the general Vielzeug package catalog tools and the additional `refine-*` component tools.

### `SnapshotRefineCatalog`

```ts
new SnapshotRefineCatalog(snapshot: LoadedSnapshot)
```

Extends `SnapshotCatalog` with `getComponent()` and `listComponents()`.

Component declarations and their nested data use readonly TypeScript types.

## HTTP

### `startHttpHost`

```ts
startHttpHost(options: HttpHostOptions): Promise<HttpHost>;
```

Starts Streamable HTTP on `127.0.0.1` by default. Runtime validation accepts only `127.0.0.1` or `::1`; every request must also pass localhost Host and Origin checks. `createServer` must return a fresh, unconnected server with its request handlers registered.

## Types

```ts
interface SnapshotPointer {
  readonly directory: string;
}

interface SnapshotManifest {
  readonly catalog: 'catalog.json';
  readonly contentDirectory: 'packages';
  readonly refine: 'refine.json' | null;
  readonly schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION;
  readonly search: 'search.json';
  readonly version: string;
}
```

Dev snapshots use `SnapshotPointer` (via `current.json`); published snapshots are static directories.

```ts
interface LoadedSnapshot {
  readonly catalog: CatalogFile;
  readonly contentDirectory: string;
  readonly manifest: SnapshotManifest;
  readonly refineComponents: readonly CemDeclaration[];
  readonly search: readonly SearchRecord[];
}
```

```ts
interface CatalogFile {
  readonly packages: readonly PackageMeta[];
  readonly version: string;
}

interface SearchRecord {
  readonly category: string;
  readonly description: string;
  readonly docs: Readonly<Partial<Record<DocPage, string>>>;
  readonly examples: readonly { readonly id: string; readonly text: string }[];
  readonly exports: string;
  readonly keywords: string;
  readonly name: string;
  readonly related: string;
  readonly slug: string;
  readonly source: string | null;
}

interface PackageMeta {
  readonly availableDocPages: readonly DocPage[];
  readonly category: string;
  readonly description: string;
  readonly exampleIds: readonly string[];
  readonly exports: readonly string[];
  readonly hasSource: boolean;
  readonly keywords: readonly string[];
  readonly name: string;
  readonly related: readonly string[];
  readonly slug: string;
  readonly version: string;
}

interface Example {
  readonly code: string;
  readonly id: string;
  readonly name: string;
}
```

```ts
interface Catalog {
  getDocs(slug: string, page: DocPage): string;
  getExample(slug: string, exampleId: string): Example;
  getPackage(slug: string): PackageMeta;
  getSource(slug: string): string;
  getTypeSignature(slug: string, symbol: string): string;
  listExamples(slug: string): readonly Pick<Example, 'id' | 'name'>[];
  listPackages(): readonly PackageMeta[];
  search(query: string): readonly SearchHit[];
}

interface RefineCatalog extends Catalog {
  getComponent(tagName: string): CemDeclaration;
  listComponents(): readonly CemDeclaration[];
}

interface SearchHit {
  readonly matchedExamples?: readonly string[];
  readonly matchedIn: readonly ('docs' | 'examples' | 'exports' | 'keywords' | 'metadata' | 'related' | 'source')[];
  readonly matchedPages?: readonly DocPage[];
  readonly name: string;
  readonly slug: string;
}
```

Catalog exposes semantic reads. It does not expose its cached content chunks.

```ts
interface HttpHost {
  readonly disposalSignal: AbortSignal;
  dispose(): Promise<void>;
  readonly disposed: boolean;
  readonly host: string;
  readonly port: number;
  [Symbol.asyncDispose](): Promise<void>;
}

interface HttpHostOptions {
  createServer: () => Server;
  host?: '127.0.0.1' | '::1';
  port: number;
  version: string;
}
```

```ts
const DOC_PAGES = ['index', 'api', 'usage', 'examples'] as const;
type DocPage = (typeof DOC_PAGES)[number];

const SNAPSHOT_SCHEMA_VERSION = 1 as const;
```

CEM types and `RefineCatalog` are exported from `/refine`.

```ts
interface CemDeclaration {
  readonly attributes?: readonly CemAttribute[];
  readonly cssParts?: readonly CemCssPart[];
  readonly cssProperties?: readonly CemCssProperty[];
  readonly description?: string;
  readonly events?: readonly CemEvent[];
  readonly members?: readonly CemMember[];
  readonly name?: string;
  readonly slots?: readonly CemSlot[];
  readonly superclass?: { readonly name: string; readonly package?: string };
  readonly tagName?: string;
  readonly [key: string]: unknown;
}

interface CemAttribute {
  readonly default?: string;
  readonly description?: string;
  readonly fieldName?: string;
  readonly name: string;
  readonly type?: { readonly text: string };
}

interface CemCssPart {
  readonly description?: string;
  readonly name: string;
}

interface CemCssProperty {
  readonly default?: string;
  readonly description?: string;
  readonly name: string;
}

interface CemEvent {
  readonly description?: string;
  readonly name: string;
  readonly type?: { readonly text: string };
}

interface CemMember {
  readonly description?: string;
  readonly kind?: 'field' | 'method';
  readonly name: string;
  readonly type?: { readonly text: string };
}

interface CemSlot {
  readonly description?: string;
  readonly name: string;
}
```

## Errors

`CodexError` signals malformed snapshots or host failures. `CatalogError` adds `INVALID_ARG`, `NOT_FOUND`, or `UNAVAILABLE` for expected tool failures.
