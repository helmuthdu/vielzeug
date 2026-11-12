---
title: Codex API
description: Snapshot, catalog, MCP server, and local HTTP host APIs.
---

[[toc]]

## API Overview

| Symbol             | Purpose                                    | Execution mode | Common gotcha                         |
| ------------------ | ------------------------------------------ | -------------- | ------------------------------------- |
| `loadSnapshot`     | Read validated snapshot metadata           | Sync           | Content chunks load lazily            |
| `validateSnapshot` | Full artifact verification (all chunks)    | Sync           | Generation/CI use, not normal startup |
| `SnapshotCatalog`  | Query package corpus and Refine components | Sync           | Construct from loaded snapshot        |
| `createMcpServer`  | MCP adapter factory                        | Sync           | Requires catalog and version          |
| `startHttpHost`    | Loopback Streamable HTTP host              | Async          | HTTP remains local-only               |

## Package Entry Point

`@vielzeug/codex` is the single entry point: catalog (package docs plus bundled Refine component
metadata), snapshot loader, errors, the MCP server factory, the loopback HTTP host, and a
re-export of `StdioServerTransport`. There is one `Catalog` surface and one server factory.

## Snapshot

### `loadSnapshot`

```ts
loadSnapshot(directory?: string, options?: { validateContents?: boolean }): LoadedSnapshot;
```

Loads one snapshot directory: `manifest.json` plus `catalog.json` (eager metadata), an optional
`refine.json`, and lazily read `packages/<slug>.json` content chunks. `directory` defaults to the
bundled `data/`. The snapshot layout is fixed by code; the manifest carries `{ schemaVersion, version }`
only. `validateContents: true` turns the lazy chunks into an eager cross-checked read.

### `validateSnapshot`

```ts
validateSnapshot(snapshotRoot?: string): void;
```

Runs `loadSnapshot` with `validateContents: true`. Used by snapshot generation, integration tests,
and artifact verification; normal startup keeps package chunks lazy.

### `SnapshotCatalog`

```ts
new SnapshotCatalog(snapshot: LoadedSnapshot)
```

Provides package lookup, docs/source/example/signature access, deterministic search, and the
Refine component lookup (`listComponents()`, `getComponent(tagName)`). Component methods return an
empty list (and `NOT_FOUND` per tag) when the snapshot carries no Refine metadata. `search()`
reads content chunks through the same lazy cache as the content getters; there is no separate
search index.

---

## MCP

### `createMcpServer`

```ts
createMcpServer(catalog: Catalog, options: { version: string; debug?: boolean }): Server;
```

Registers the generic package tools over `Catalog`, plus the `refine-*` component tools when the
catalog actually carries Refine metadata; tools that could only answer "unavailable" are never
offered. The root also re-exports `StdioServerTransport` for connecting the server without a
second package import.

## HTTP

### `startHttpHost`

```ts
startHttpHost(options: HttpHostOptions): Promise<HttpHost>;
```

Starts Streamable HTTP on `127.0.0.1` by default. Runtime validation accepts only `127.0.0.1` or
`::1`; every request must also pass localhost Host and Origin checks. `createServer` must return a
fresh, unconnected server with its request handlers registered.

## Types

```ts
interface SnapshotManifest {
  readonly schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION;
  readonly version: string;
}

interface LoadedSnapshot {
  readonly catalog: CatalogFile;
  readonly contentDirectory: string;
  readonly manifest: SnapshotManifest;
  readonly refineComponents: readonly CemDeclaration[];
}
```

```ts
interface CatalogFile {
  readonly packages: readonly PackageMeta[];
  readonly version: string;
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
  getComponent(tagName: string): CemDeclaration;
  getDocs(slug: string, page: DocPage): string;
  getExample(slug: string, exampleId: string): Example;
  getPackage(slug: string): PackageMeta;
  getSource(slug: string): string;
  getTypeSignature(slug: string, symbol: string): string;
  listComponents(): readonly CemDeclaration[];
  listExamples(slug: string): readonly Pick<Example, 'id' | 'name'>[];
  listPackages(): readonly PackageMeta[];
  search(query: string): readonly SearchHit[];
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

const SNAPSHOT_SCHEMA_VERSION = 2 as const;
```

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

Component declarations and their nested data use readonly TypeScript types. The loader pins only
the contract its consumers depend on: declarations form an array with valid, unique custom-element
`tagName`s.

## Errors

`CodexError` signals malformed snapshots or host failures. `CatalogError` adds `INVALID_ARG`,
`NOT_FOUND`, or `UNAVAILABLE` for expected tool failures.
