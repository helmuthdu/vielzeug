---
title: Codex
description: Local MCP access to Vielzeug documentation and package metadata.
package: codex
category: AI
keywords: [mcp, docs, ai]
related: [refine]
exports: [loadSnapshot, SnapshotCatalog, createMcpServer, startHttpHost, StdioServerTransport, CatalogError, CodexError]
environments: [node]
---

<PackageHero package="codex" />

## Why Codex?

Codex exposes current Vielzeug catalog data through MCP without scanning source at request time.

## Installation

```sh
pnpm add @vielzeug/codex
```

## Quick Start

```sh
npx -y @vielzeug/codex
```

## Features

- `loadSnapshot` validates chunked snapshot metadata.
- `SnapshotCatalog` loads package content only when requested.
- `createMcpServer` registers generic package tools; `/refine` adds component tools explicitly.
- Root, `/advanced`, and `/refine` entry points publish TypeScript declarations.
- `startHttpHost` enforces loopback binding plus localhost Host and Origin validation.

## Documentation

- [Usage](./usage.md)
- [API](./api.md)
- [Examples](./examples.md)
- [Migration Guide](./migration.md)

## See Also

- [Refine](../refine/) provides component metadata bundled by Codex.
