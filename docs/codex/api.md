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
| `startHttpHost` | Loopback Streamable HTTP host | Async | HTTP remains local-only |
| `registerRefineTools` | Opt-in Refine tool registration | Sync | Import from `@vielzeug/codex/refine` |
| `parsePointer` / `parseManifest` / `parseCatalog` / `parseContent` / `parseSearch` | Pure snapshot parsers | Sync | Import from `@vielzeug/codex/advanced`; throw `CodexError` on malformed input |

## Package Entry Points

| Import | Purpose |
| --- | --- |
| `@vielzeug/codex` | `Catalog`, `SnapshotCatalog`, `loadSnapshot`, MCP server, and HTTP host |
| `@vielzeug/codex/advanced` | Snapshot parser internals and raw snapshot types |
| `@vielzeug/codex/refine` | Opt-in Refine component tools (`registerRefineTools`) |

## Snapshot

### `loadSnapshot`

```ts
loadSnapshot(snapshotRoot?: string, options?: { validateContents?: boolean }): LoadedSnapshot;
```

Loads catalog/search metadata and Refine metadata. `snapshotRoot` defaults to bundled `data/`. Package content chunks stay lazy unless `validateContents: true`; `validateSnapshot()` from `/advanced` is the full-validation shortcut.

### `SnapshotCatalog`

```ts
new SnapshotCatalog(snapshot: LoadedSnapshot)
```

Provides generic package lookup, docs/source/example/signature access, and deterministic search. Use `SnapshotRefineCatalog` from `/refine` when component methods are needed.

---

### Snapshot parsers (`@vielzeug/codex/advanced`)

```ts
validateSnapshot(snapshotRoot?: string): void;
loadSnapshotDirectory(directory: string, options?: { validateContents?: boolean }): LoadedSnapshot;
parsePointer(value: unknown): SnapshotPointer;
parseManifest(value: unknown): SnapshotManifest;
parseCatalog(value: unknown): CatalogFile;
parseContent(value: unknown, slug: string): PackageContent;
parseSearch(value: unknown, catalog: CatalogFile): SearchRecord[];
parseRefine(value: unknown): CemDeclaration[];
```

Pure validation parsers used by `loadSnapshot`. Each throws `CodexError` on malformed input. `validateSnapshot` loads and validates every package content chunk — use during generation, integration tests, or explicit artifact verification.

## MCP

### `createMcpServer`

```ts
createMcpServer(catalog: Catalog, options: { version: string; debug?: boolean }): Server;
```

Registers generic package tools over `Catalog`. Refine tools are opt-in through `/refine`. The root also re-exports `StdioServerTransport` for connecting the server without a second package import.

## Refine tools (`@vielzeug/codex/refine`)

### `SnapshotRefineCatalog`

```ts
new SnapshotRefineCatalog(snapshot: LoadedSnapshot)
```

Extends `SnapshotCatalog` with `getComponent()` and `listComponents()`.

### `registerRefineTools`

```ts
registerRefineTools(server: Server, catalog: RefineCatalog, debug?: boolean): void;
```

Upgrades a server created by `createMcpServer()` with the combined generic and `refine-*` tool set. `refineTools` is exported as a readonly registry.

## HTTP

### `startHttpHost`

```ts
startHttpHost(options: HttpHostOptions): Promise<HttpHost>;
```

Starts Streamable HTTP on `127.0.0.1` by default. Runtime validation accepts only `127.0.0.1` or `::1`; every request must also pass localhost Host and Origin checks. `configureServer` runs once for each lazily created MCP request server and is not called during host startup.

## Types

```ts
interface SnapshotPointer {
  directory: string;
}

interface SnapshotManifest {
  catalog: 'catalog.json';
  contentDirectory: 'packages';
  refine: 'refine.json' | null;
  schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION;
  search: 'search.json';
  version: string;
}
```

Dev snapshots use `SnapshotPointer` (via `current.json`); published snapshots are static directories.

```ts
interface LoadedSnapshot {
  catalog: CatalogFile;
  contentDirectory: string;
  manifest: SnapshotManifest;
  refineComponents: CemDeclaration[];
  search: SearchRecord[];
}
```

```ts
interface CatalogFile {
  packages: PackageMeta[];
  version: string;
}

interface SearchRecord {
  category: string;
  description: string;
  docs: Partial<Record<DocPage, string>>;
  examples: Array<{ id: string; text: string }>;
  exports: string;
  keywords: string;
  name: string;
  related: string;
  slug: string;
  source: string | null;
}

interface PackageMeta {
  availableDocPages: DocPage[];
  category: string;
  description: string;
  exampleIds: string[];
  exports: string[];
  hasSource: boolean;
  keywords: string[];
  name: string;
  related: string[];
  slug: string;
  version: string;
}

interface PackageContent {
  apiSource: string | null;
  docs: Partial<Record<DocPage, string>>;
  examples: Example[];
  typeSignatures: Record<string, string>;
}

interface Example {
  code: string;
  id: string;
  name: string;
}
```

```ts
interface Catalog {
  getContent(slug: string): PackageContent;
  getDocs(slug: string, page: DocPage): string;
  getExample(slug: string, exampleId: string): Example;
  getPackage(slug: string): PackageMeta;
  getSource(slug: string): string;
  getTypeSignature(slug: string, symbol: string): string;
  listExamples(slug: string): Array<Pick<Example, 'id' | 'name'>>;
  listPackages(): PackageMeta[];
  search(query: string): SearchHit[];
}

interface RefineCatalog extends Catalog {
  getComponent(tagName: string): CemDeclaration;
  listComponents(): CemDeclaration[];
}

interface SearchHit {
  matchedExamples?: string[];
  matchedIn: Array<'docs' | 'examples' | 'exports' | 'keywords' | 'metadata' | 'related' | 'source'>;
  matchedPages?: DocPage[];
  name: string;
  slug: string;
}
```

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
  catalog: Catalog;
  configureServer?: (server: Server) => void;
  debug?: boolean;
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

`DOC_PAGES`, `SNAPSHOT_SCHEMA_VERSION`, and raw snapshot types are exported from `/advanced`. CEM types and `RefineCatalog` are exported from `/refine`.

```ts
interface CemDeclaration {
  attributes?: CemAttribute[];
  cssParts?: CemCssPart[];
  cssProperties?: CemCssProperty[];
  description?: string;
  events?: CemEvent[];
  members?: CemMember[];
  name?: string;
  slots?: CemSlot[];
  superclass?: { name: string; package?: string };
  tagName?: string;
  [key: string]: unknown;
}

interface CemAttribute {
  default?: string;
  description?: string;
  fieldName?: string;
  name: string;
  type?: { text: string };
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
  type?: { text: string };
}

interface CemMember {
  description?: string;
  kind?: 'field' | 'method';
  name: string;
  type?: { text: string };
}

interface CemSlot {
  description?: string;
  name: string;
}
```

## Errors

`CodexError` signals malformed snapshots or host failures. `CatalogError` adds `INVALID_ARG`, `NOT_FOUND`, or `UNAVAILABLE` for expected tool failures.
