# Change Log - @vielzeug/codex

This log was last generated on Sun, 16 Aug 2026 10:35:40 GMT and should not be manually modified.

## 2.2.2
Sun, 16 Aug 2026 10:35:40 GMT

### Patches

- chore(codex): refresh bundled docs data

## 2.2.1
Sun, 16 Aug 2026 09:15:39 GMT

### Patches

- chore(codex): refresh bundled docs data

## 2.2.0
Sat, 15 Aug 2026 15:36:50 GMT

### Minor changes

- chore: rename SnapshotCatalog interface to CatalogFile (eliminates name collision with SnapshotCatalog class); remove CodexError.is() static type guard (use instanceof CodexError); remove redundant cast in get-docs tool (InferArgs already infers DocPage from enum); extract EMPTY_SCHEMA to schema.ts (shared between packages.ts and refine.ts)

## 2.1.5
Sat, 15 Aug 2026 10:39:54 GMT

### Patches

- chore(codex): refresh bundled docs data

## 2.1.4
Sat, 15 Aug 2026 06:26:02 GMT

### Patches

- docs: update ripple documentation for 3.0 (api, usage, migration, examples, REPL, sidebar)

## 2.1.3
Fri, 14 Aug 2026 09:10:58 GMT

### Patches

- chore(codex): refresh bundled docs data

## 2.1.2
Thu, 13 Aug 2026 06:06:28 GMT

### Patches

- chore(codex): refresh bundled docs data

## 2.1.1
Mon, 10 Aug 2026 21:21:35 GMT

### Patches

- chore: refresh bundled Ripple documentation

## 2.1.0
Mon, 10 Aug 2026 16:04:45 GMT

### Minor changes

- feat(codex): migrate to @modelcontextprotocol/server 2.0.0 (2026-07-28 spec) — replaces @modelcontextprotocol/sdk; stateless per-request HTTP host via createMcpHandler() over a Node/Fetch bridge, tools/list and tools/call registered via string-literal setRequestHandler(), MethodNotFound now thrown as ProtocolError(METHOD_NOT_FOUND, ...); wire behavior for tool list/call unchanged

## 2.0.2
Mon, 10 Aug 2026 15:11:23 GMT

### Patches

- chore: refresh bundled docs data
- refresh bundled Tempo 2 documentation
- refresh bundled Wayfinder documentation

## 2.0.1
Wed, 05 Aug 2026 19:50:19 GMT

### Patches

- refresh bundled Lingua documentation

## 2.0.0
Wed, 05 Aug 2026 16:48:52 GMT

### Breaking changes

- refactor!: Redesign Codex around validated chunked snapshots, catalog APIs, and local-only Streamable HTTP.

### Patches

- chore: refresh bundled docs data

## 1.0.4
Sun, 26 Jul 2026 06:43:54 GMT

### Patches

- chore(codex): refresh bundled docs data

## 1.0.3
Sat, 25 Jul 2026 03:18:07 GMT

### Patches

- chore: refresh bundled docs data

## 1.0.2
Fri, 03 Jul 2026 10:09:41 GMT

### Patches

- fix(codex): harden security, fix doc drift, add CLI --data flag

## 1.0.1
Thu, 02 Jul 2026 06:05:59 GMT

### Patches

- fix(codex): handle CLI data-load errors, add disposed to HttpServerHandle, close sandbox-document style breakout, expand test coverage

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

