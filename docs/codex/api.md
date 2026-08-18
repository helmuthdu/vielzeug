---
title: Codex API
description: Snapshot, catalog, MCP server, and local HTTP host APIs.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `loadSnapshot` | Read validated snapshot metadata | Sync | Content chunks load lazily |
| `validateSnapshot` | Validate every content chunk | Sync | Throws on mismatch; use in tests, not startup |
| `SnapshotCatalog` | Query package corpus | Sync | Construct from loaded snapshot |
| `createMcpServer` | MCP adapter factory | Sync | Requires catalog and version |
| `startHttpHost` | Loopback Streamable HTTP host | Async | HTTP remains local-only |
| `parsePointer` / `parseManifest` / `parseCatalog` / `parseContent` / `parseSearch` | Pure snapshot parsers | Sync | Throw `CodexError` on malformed input |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/codex` | Snapshot, catalog, MCP, and HTTP APIs |

## Snapshot

### `loadSnapshot`

```ts
loadSnapshot(snapshotRoot?: string, options?: { validateContents?: boolean }): LoadedSnapshot;
```

Loads catalog/search metadata only. `snapshotRoot` defaults to the bundled `data/` directory. Pass `validateContents: true` to verify every package content chunk; use `validateSnapshot()` as a shortcut for that. Package chunks stay lazy at runtime.

### `SnapshotCatalog`

```ts
new SnapshotCatalog(snapshot: LoadedSnapshot)
```

Provides package lookup, docs/source/example/signature access, deterministic search, and Refine component lookup.

---

### `validateSnapshot`

```ts
validateSnapshot(snapshotRoot?: string): void;
```

Loads and validates every package content chunk in the snapshot. Use during generation, integration tests, or explicit artifact verification; throws `CodexError` on any mismatch.

---

### Snapshot parsers

```ts
parsePointer(value: unknown): SnapshotPointer;
parseManifest(value: unknown): SnapshotManifest;
parseCatalog(value: unknown): CatalogFile;
parseContent(value: unknown, slug: string): PackageContent;
parseSearch(value: unknown, catalog: CatalogFile): SearchRecord[];
```

Pure validation parsers used by `loadSnapshot`. Each throws `CodexError` on malformed input.

## MCP

### `createMcpServer`

```ts
createMcpServer(catalog: Catalog, options: { version: string; debug?: boolean }): Server;
```

Registers MCP tools as an adapter over `Catalog`.

## HTTP

### `startHttpHost`

```ts
startHttpHost(options: HttpHostOptions): Promise<HttpHost>;
```

Starts Streamable HTTP on `127.0.0.1` by default. Host accepts only loopback addresses.

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
  getComponent(tagName: string): CemDeclaration;
  getContent(slug: string): PackageContent;
  getDocs(slug: string, page: DocPage): string;
  getExample(slug: string, exampleId: string): Example;
  getPackage(slug: string): PackageMeta;
  getSource(slug: string): string;
  getTypeSignature(slug: string, symbol: string): string;
  listComponents(): CemDeclaration[];
  listExamples(slug: string): Array<Pick<Example, 'id' | 'name'>>;
  listPackages(): PackageMeta[];
  search(query: string): SearchHit[];
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
  dispose(): Promise<void>;
  readonly host: string;
  readonly port: number;
  [Symbol.asyncDispose](): Promise<void>;
}

interface HttpHostOptions {
  catalog: Catalog;
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
